import {
  claimNotificationOutboxEntries,
  createNotificationOutboxEntryFromDraft,
  recordNotificationDeliveryAudit,
  updateNotificationOutboxDelivery,
} from "@halaalvest/db"
import {
  createEmailDraftFromType,
  createRetryingEmailTransport,
  createResendEmailTransport,
  NotificationService,
  type NotificationEmailDraft,
} from "@halaalvest/notifications"
import type { NotificationOutboxDeliverPayload } from "../tasks/notification-outbox-deliver.task"

function discardNotification() {
  return `notification-${Date.now()}-${Math.random()}`
}

function getJobEmailDeliveryConfig() {
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

function createJobNotificationService() {
  const { apiKey, configured, from, replyTo, testRecipient } =
    getJobEmailDeliveryConfig()

  const baseEmailTransport =
    configured && apiKey && from
      ? createResendEmailTransport({
          apiKey,
          from,
          replyTo,
          testRecipient,
        })
      : undefined

  return new NotificationService(
    discardNotification,
    baseEmailTransport
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
    "recipientDisplayName"
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
        typeof recipientDisplayName === "string"
          ? recipientDisplayName
          : undefined,
      email: entry.recipient,
      kind: "email",
      value: entry.recipient,
    },
    subject: entry.subject,
  }
}

export async function notificationOutboxDeliverHandler(
  payload: NotificationOutboxDeliverPayload = {}
) {
  const summary = {
    failed: 0,
    processed: 0,
    sent: 0,
  }

  if (!getJobEmailDeliveryConfig().configured) {
    return summary
  }

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
    summary.processed += 1
    if (delivery.status === "sent") {
      summary.sent += 1
    }
    if (delivery.status === "failed") {
      summary.failed += 1
    }

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

  return summary
}

export type EmailSmokeTestPayload = {
  email: string
}

export async function emailSmokeTestHandler(payload: EmailSmokeTestPayload) {
  const email = payload.email.trim()

  if (!email) {
    throw new Error("email is required for the email smoke test.")
  }

  const timestamp = new Date()
  const draft = createEmailDraftFromType("workspace_ready", {
    dashboardUrl: "https://app.halaalvest.com",
    recipientEmail: email,
    recipientName: "HalaalVest email smoke test",
    siteUrl: "https://halaalvest.com",
    tenantName: "HalaalVest",
  })
  const outboxEntry = await createNotificationOutboxEntryFromDraft({
    draft,
    metadata: {
      smokeTest: true,
      timestamp: timestamp.toISOString(),
    },
    source: "jobs.email_smoke_test",
  })
  const notificationService = createJobNotificationService()
  const delivery = await notificationService.tryEmail(draft)

  if (outboxEntry) {
    await updateNotificationOutboxDelivery({
      attempts: delivery.attempts,
      errorMessage: delivery.errorMessage,
      messageId: delivery.messageId,
      outboxId: outboxEntry.id,
      status: delivery.status,
    })
  }

  return {
    messageId: delivery.messageId,
    outboxId: outboxEntry?.id ?? null,
    recipient: delivery.draft.recipient.value,
    status: delivery.status,
  }
}
