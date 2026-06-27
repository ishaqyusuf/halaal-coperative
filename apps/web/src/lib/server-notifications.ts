import {
  createRetryingEmailTransport,
  createResendEmailTransport,
  NotificationService,
  type NotificationInput,
} from "@halaalvest/notifications"

function discardNotification(_input: NotificationInput) {
  return `notification-${Date.now()}-${Math.random()}`
}

export function getServerEmailDeliveryConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from =
    process.env.HALAAL_VEST_EMAIL_FROM?.trim() ||
    process.env.EMAIL_FROM_ADDRESS?.trim()
  const replyTo =
    process.env.HALAAL_VEST_EMAIL_REPLY_TO?.trim() ||
    process.env.EMAIL_REPLY_TO?.trim()
  const testRecipient = process.env.HALAAL_VEST_EMAIL_TEST_RECIPIENT?.trim()

  return {
    apiKey,
    configured: Boolean(apiKey && from),
    from,
    replyTo,
    testRecipient,
  }
}

export function isServerEmailDeliveryConfigured() {
  return getServerEmailDeliveryConfig().configured
}

export function createServerNotificationService() {
  const { apiKey, configured, from, replyTo, testRecipient } =
    getServerEmailDeliveryConfig()

  const baseEmailTransport =
    configured && apiKey && from
      ? createResendEmailTransport({
          apiKey,
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
              2
            )
          )
        },
      })
    : undefined

  return new NotificationService(discardNotification, emailTransport)
}
