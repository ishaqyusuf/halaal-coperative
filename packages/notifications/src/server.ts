import {
  createRetryingEmailTransport,
  createResendEmailTransport,
  NotificationService,
  type NotificationInput,
} from "./index"

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

  return process.env.NODE_ENV === "production" && ["1", "true", "yes", "on"].includes(value ?? "")
}

function getEmailTestCopyRecipient() {
  if (!isEmailTestModeEnabled()) return undefined

  const testEmail = process.env.TEST_EMAIL?.trim()

  if (!testEmail) {
    throw new Error("EMAIL_TEST_MODE requires TEST_EMAIL to be configured.")
  }

  return testEmail
}

export function getServerEmailDeliveryConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = formatServerEmailFrom(
    process.env.HALAAL_VEST_EMAIL_FROM?.trim() ||
      process.env.EMAIL_FROM_ADDRESS?.trim(),
  )
  const replyTo =
    process.env.HALAAL_VEST_EMAIL_REPLY_TO?.trim() ||
    process.env.EMAIL_REPLY_TO?.trim()
  const copyRecipient = getEmailTestCopyRecipient()
  const testRecipient = process.env.HALAAL_VEST_EMAIL_TEST_RECIPIENT?.trim()

  return {
    apiKey,
    configured: Boolean(apiKey && from),
    copyRecipient,
    from,
    replyTo,
    testRecipient,
  }
}

export function isServerEmailDeliveryConfigured() {
  return getServerEmailDeliveryConfig().configured
}

export function createServerNotificationService() {
  const { apiKey, configured, copyRecipient, from, replyTo, testRecipient } =
    getServerEmailDeliveryConfig()

  const baseEmailTransport =
    configured && apiKey && from
      ? createResendEmailTransport({
          apiKey,
          copyRecipient,
          from,
          replyTo,
          testRecipient,
        })
      : undefined

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
              2,
            ),
          )
        },
      })
    : undefined

  return new NotificationService(discardNotification, emailTransport)
}
