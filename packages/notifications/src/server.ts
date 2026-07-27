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

function getRecipientDomain(recipient: string) {
  return recipient.trim().toLowerCase().split("@").pop() ?? ""
}

function createHybridConsoleEmailTransport(input: {
  providerTransport?: NotificationEmailTransport
  qaDomainRoutes: ReadonlyMap<string, string>
}): NotificationEmailTransport {
  const consoleTransport = createConsoleEmailTransport()

  return {
    send(draft) {
      const domain = getRecipientDomain(draft.recipient.value)
      const isQaRecipient =
        input.qaDomainRoutes.has(domain) ||
        (input.qaDomainRoutes.size > 0 && domain.endsWith(".test"))

      if (!isQaRecipient) {
        return consoleTransport.send(draft)
      }

      if (!input.providerTransport) {
        throw new Error(
          "QA email delivery requires RESEND_API_KEY and EMAIL_FROM_ADDRESS."
        )
      }

      return input.providerTransport.send(draft)
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

export function getServerQaEmailDomains() {
  return [...getEmailRoutingConfiguration().qaDomainRoutes.keys()]
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

  const providerTransport =
    configured && apiKey && from
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
  const baseEmailTransport =
    deliveryMode === "console"
      ? createHybridConsoleEmailTransport({
          providerTransport,
          qaDomainRoutes,
        })
      : providerTransport

  const emailTransport = baseEmailTransport
    ? createRetryingEmailTransport(baseEmailTransport, {
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
