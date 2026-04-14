import {
  createConsoleEmailTransport,
  createRetryingEmailTransport,
  createResendEmailTransport,
  NotificationService,
  type NotificationInput,
} from "@halaal-vest/notifications"

function discardNotification(_input: NotificationInput) {
  return `notification-${Date.now()}-${Math.random()}`
}

export function createServerNotificationService() {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.HALAAL_VEST_EMAIL_FROM?.trim()
  const replyTo = process.env.HALAAL_VEST_EMAIL_REPLY_TO?.trim()

  const baseEmailTransport =
    apiKey && from
      ? createResendEmailTransport({
          apiKey,
          from,
          replyTo,
        })
      : createConsoleEmailTransport()

  const emailTransport = createRetryingEmailTransport(baseEmailTransport, {
    maxAttempts: apiKey && from ? 2 : 1,
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

  return new NotificationService(discardNotification, emailTransport)
}
