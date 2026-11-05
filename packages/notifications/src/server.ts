import { shouldUseFixedDevelopmentCode } from "@halaalvest/domain/development-code-policy"
import {
  createRetryingEmailTransport,
  createResendEmailTransport,
  NotificationService,
  type EmailRoutingMetadata,
  type NotificationEmailDelivery,
  type NotificationEmailTransport,
  type NotificationInput,
} from "./index"
import {
  getEmailRoutingConfiguration,
  resolveEmailRouting,
} from "./email-routing"

const DEFAULT_EMAIL_FROM_NAME = "Halaalvest"

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

function redactEmailAddress(value: string) {
  const [localPart = "", domain = ""] = value.trim().toLowerCase().split("@")

  return `${localPart.slice(0, 1)}***@${domain}`
}

function redactActionUrl(value: string) {
  try {
    const url = new URL(value)

    // protocol + host rather than origin, which is "null" for app deep links.
    return `${url.protocol}//${url.host}${url.pathname}`
  } catch {
    return "[redacted]"
  }
}

/**
 * Outside production no email reaches a provider. The draft is logged as a
 * "would send" line and returned as sent, so flows continue; testers read
 * codes from the fixed development code and links from QA previews.
 */
export function createNonProductionEmailTransport(input: {
  environment?: Record<string, string | undefined>
  qaDomainRoutes: ReadonlyMap<string, string>
}): NotificationEmailTransport {
  return {
    send(draft) {
      const developmentProfile = shouldUseFixedDevelopmentCode(
        input.environment ?? process.env
      )
      const routing: EmailRoutingMetadata = {
        ...resolveEmailRouting(draft.recipient.value, {
          deliveryMode: "console",
          qaDomainRoutes: input.qaDomainRoutes,
        }),
        deliveredRecipients: [],
        suppressed: developmentProfile ? "development" : "non_production",
      }
      const messageId = `email-suppressed-${Date.now()}-${Math.random()}`

      // Only a development profile logs the full link; hosted non-production
      // logs keep the path so tokens never reach a log drain.
      console.log(
        JSON.stringify({
          actionUrl: developmentProfile
            ? draft.actionUrl
            : redactActionUrl(draft.actionUrl),
          channel: "email",
          event: "email.suppressed",
          messageId,
          notificationType: draft.notificationType,
          recipient: redactEmailAddress(routing.originalRecipient),
          routingMode: routing.mode,
          subject: draft.subject,
        })
      )

      return {
        attempts: 1,
        draft,
        messageId,
        routing,
        status: "sent",
      } satisfies NotificationEmailDelivery
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

  // deliveryMode is "console" exactly when the runtime is not production
  // (getEmailRoutingConfiguration refuses either mismatch), so a provider
  // transport only ever exists in production.
  const baseEmailTransport =
    deliveryMode === "console"
      ? createNonProductionEmailTransport({ qaDomainRoutes })
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

  const emailTransport = baseEmailTransport
    ? createRetryingEmailTransport(baseEmailTransport, {
        maxAttempts: 2,
        onAttemptFailure({ attempt, maxAttempts }) {
          console.error(
            JSON.stringify(
              {
                attempt,
                channel: "email",
                error: "Email delivery attempt failed.",
                maxAttempts,
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
