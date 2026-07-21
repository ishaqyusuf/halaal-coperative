import {
  createConsoleEmailTransport,
  createRetryingEmailTransport,
  createResendEmailTransport,
  NotificationService,
  type NotificationEmailTransport,
  type NotificationInput,
} from "./index"
import { getEmailRoutingConfiguration } from "./email-routing"

const DEFAULT_EMAIL_FROM_NAME = "Welcome to Halaalvest"

function discardNotification(_input: NotificationInput) {
  return `notification-${Date.now()}-${Math.random()}`
}

function formatServerEmailFrom(from: string | undefined) {
  const trimmedFrom = from?.trim()

  if (!trimmedFrom) return undefined
  if (trimmedFrom.includes("<") && trimmedFrom.includes(">")) {
    return trimmedFrom
  }

  return `${DEFAULT_EMAIL_FROM_NAME} <${trimmedFrom}>`
}

function isEmailTestModeEnabled() {
  const value = process.env.EMAIL_TEST_MODE?.trim().toLowerCase()

  return (
    process.env.NODE_ENV === "production" &&
    ["1", "true", "yes", "on"].includes(value ?? "")
  )
}

function getEmailTestCopyRecipient() {
  if (!isEmailTestModeEnabled()) return undefined

  const testEmail = process.env.TEST_EMAIL?.trim()

  if (!testEmail) {
    throw new Error("EMAIL_TEST_MODE requires TEST_EMAIL to be configured.")
  }

  return testEmail
}

function isReservedLocalRecipient(recipient: string) {
  const value = recipient.trim().toLowerCase()
  const domain = value.split("@").pop() ?? ""

  return (
    domain === "localhost" ||
    domain.endsWith(".localhost") ||
    domain === "test" ||
    domain.endsWith(".test")
  )
}

function createDevelopmentSafeEmailTransport(
  transport: NotificationEmailTransport | undefined
): NotificationEmailTransport | undefined {
  if (process.env.NODE_ENV === "production") {
    return transport
  }

  const consoleTransport = createConsoleEmailTransport()

  if (!transport) {
    return consoleTransport
  }

  return {
    send(draft) {
      if (isReservedLocalRecipient(draft.recipient.value)) {
        return consoleTransport.send(draft)
      }

      return transport.send(draft)
    },
  }
}

export function getServerEmailDeliveryConfig() {
  const routingConfiguration = getEmailRoutingConfiguration()
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = formatServerEmailFrom(process.env.EMAIL_FROM_ADDRESS?.trim())
  const replyTo = process.env.EMAIL_REPLY_TO?.trim()
  const copyRecipient = getEmailTestCopyRecipient()
  const testRecipient = process.env.EMAIL_TEST_RECIPIENT?.trim()

  return {
    apiKey,
    configured: Boolean(apiKey && from),
    copyRecipient,
    deliveryMode: routingConfiguration.deliveryMode,
    from,
    qaDomainRoutes: routingConfiguration.qaDomainRoutes,
    replyTo,
    testRecipient: routingConfiguration.testRecipient ?? testRecipient,
  }
}

export function isServerEmailDeliveryConfigured() {
  return getServerEmailDeliveryConfig().configured
}

export function createServerNotificationService() {
  const {
    apiKey,
    configured,
    copyRecipient,
    deliveryMode,
    from,
    qaDomainRoutes,
    replyTo,
    testRecipient,
  } = getServerEmailDeliveryConfig()

  const baseEmailTransport =
    deliveryMode === "console"
      ? createConsoleEmailTransport()
      : configured && apiKey && from
        ? createResendEmailTransport({
            apiKey,
            copyRecipient,
            deliveryMode,
            from,
            qaDomainRoutes,
            replyTo,
            testRecipient,
          })
        : undefined

  const safeEmailTransport =
    deliveryMode === "qa_routed"
      ? baseEmailTransport
      : createDevelopmentSafeEmailTransport(baseEmailTransport)

  const emailTransport = safeEmailTransport
    ? createRetryingEmailTransport(safeEmailTransport, {
        maxAttempts: 2,
        onAttemptFailure({ attempt, draft, error, maxAttempts }) {
          console.error(
            JSON.stringify(
              {
                attempt,
                channel: "email",
                error: error instanceof Error ? error.message : String(error),
                maxAttempts,
                notificationType: draft.notificationType,
                recipient: draft.recipient.value,
              },
              null,
              2
            )
          )
        },
      })
    : undefined

  return new NotificationService(discardNotification, emailTransport)
}
