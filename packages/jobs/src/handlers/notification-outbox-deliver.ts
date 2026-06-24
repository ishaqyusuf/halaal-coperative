import {
  claimNotificationOutboxEntries,
  recordNotificationDeliveryAudit,
  updateNotificationOutboxDelivery,
} from "@halaalvest/db"
import {
  createConsoleEmailTransport,
  createRetryingEmailTransport,
  createResendEmailTransport,
  NotificationService,
  type NotificationEmailDraft,
} from "@halaalvest/notifications"
import type { NotificationOutboxDeliverPayload } from "../tasks/notification-outbox-deliver.task"

function discardNotification() {
  return `notification-${Date.now()}-${Math.random()}`
}

function createJobNotificationService() {
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

  return new NotificationService(
    discardNotification,
    createRetryingEmailTransport(baseEmailTransport, {
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
    }),
  )
}

function getMetadataValue(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return undefined
  }

  return (metadata as Record<string, unknown>)[key]
}

function draftFromOutboxEntry(entry: {
  actionLabel: string
  actionUrl: string
  bodyText: string
  metadata: unknown
  notificationType: string
  recipient: string
  subject: string
}): NotificationEmailDraft {
  const bodyHtml = getMetadataValue(entry.metadata, "bodyHtml")
  const previewText = getMetadataValue(entry.metadata, "previewText")
  const recipientDisplayName = getMetadataValue(
    entry.metadata,
    "recipientDisplayName",
  )

  return {
    actionLabel: entry.actionLabel,
    actionUrl: entry.actionUrl,
    bodyHtml: typeof bodyHtml === "string" ? bodyHtml : undefined,
    bodyText: entry.bodyText,
    notificationType: entry.notificationType,
    previewText: typeof previewText === "string" ? previewText : entry.subject,
    recipient: {
      displayName:
        typeof recipientDisplayName === "string" ? recipientDisplayName : undefined,
      email: entry.recipient,
      kind: "email",
      value: entry.recipient,
    },
    subject: entry.subject,
  }
}

export async function notificationOutboxDeliverHandler(
  payload: NotificationOutboxDeliverPayload = {},
) {
  const entries = await claimNotificationOutboxEntries({
    includeFailed: payload.includeFailed ?? true,
    limit: payload.limit ?? 25,
    maxAttempts: payload.maxAttempts ?? 4,
    tenantId: payload.tenantId,
  })
  const notificationService = createJobNotificationService()

  for (const entry of entries) {
    const draft = draftFromOutboxEntry(entry)
    const delivery = await notificationService.tryEmail(draft)
    const attempts = entry.attempts + delivery.attempts

    await updateNotificationOutboxDelivery({
      attempts,
      errorMessage: delivery.errorMessage,
      messageId: delivery.messageId,
      outboxId: entry.id,
      status: delivery.status,
    })

    if (entry.tenantId) {
      await recordNotificationDeliveryAudit({
        attempts,
        errorMessage: delivery.errorMessage,
        messageId: delivery.messageId,
        notificationType: delivery.draft.notificationType,
        recipient: delivery.draft.recipient.value,
        source: entry.source,
        status: delivery.status,
        tenantId: entry.tenantId,
      })
    }
  }
}
