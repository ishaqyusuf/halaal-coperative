import {
  listTenantRoleNotificationRecipients,
  recordNotificationDeliveryAudit,
} from "@halaalvest/db"
import {
  createNotificationEmailDraft,
  getNotificationEmailDeliveryErrorCause,
  type NotificationEmailDelivery,
  type NotificationEmailDraft,
} from "@halaalvest/notifications"
import { createServerNotificationService } from "@halaalvest/notifications/server"
import { AppError } from "@halaalvest/errors"
import { captureApiNotificationError } from "../observability/sentry"

export function captureFailedNotificationDelivery(
  delivery: NotificationEmailDelivery
) {
  if (delivery.status !== "failed") return undefined

  const retainedCause = getNotificationEmailDeliveryErrorCause(delivery)
  return captureApiNotificationError(
    new AppError({
      cause:
        retainedCause ??
        new Error("Notification delivery failed without a retained cause."),
      code: "PROVIDER_UNAVAILABLE",
      internalMessage: "Notification email delivery failed.",
      operation: "notifications.email.send",
    })
  )
}

export async function sendEmailDraftWithAudit(input: {
  draft: NotificationEmailDraft
  source: string
  tenantId: string
}) {
  const notificationService = createServerNotificationService()
  const delivery = await notificationService.tryEmail(input.draft)
  captureFailedNotificationDelivery(delivery)

  await recordNotificationDeliveryAudit({
    attempts: delivery.attempts,
    deliveredRecipients: delivery.routing?.deliveredRecipients,
    errorMessage: delivery.errorMessage,
    messageId: delivery.messageId,
    notificationType: delivery.draft.notificationType,
    recipient: delivery.draft.recipient.value,
    routingMode: delivery.routing?.mode,
    source: input.source,
    status: delivery.status,
    tenantId: input.tenantId,
  })

  return delivery
}

export async function sendTenantRoleNotificationEmails(input: {
  actionLabel: string
  actionUrl: string
  bodyText: string
  metadata?: Record<string, unknown>
  notificationType: string
  roles: string[]
  source: string
  subject: string
  tenantId: string
  tenantName: string
  tenantSlug: string
}) {
  const recipients = await listTenantRoleNotificationRecipients({
    notificationType: input.notificationType,
    roles: input.roles,
    tenantId: input.tenantId,
  })

  const deliveries: Awaited<ReturnType<typeof sendEmailDraftWithAudit>>[] = []

  for (const recipient of recipients) {
    const draft = createNotificationEmailDraft({
      actionLabel: input.actionLabel,
      actionUrl: input.actionUrl,
      bodyText: input.bodyText,
      eventLabel: input.notificationType,
      notificationType: input.notificationType,
      previewText: input.bodyText,
      recipient: {
        displayName: recipient.fullName,
        email: recipient.email,
        kind: "email",
        value: recipient.email,
      },
      sender: {
        displayName: input.tenantName,
        localPart: input.tenantSlug,
      },
      subject: input.subject,
    })

    deliveries.push(
      await sendEmailDraftWithAudit({
        draft,
        source: input.source,
        tenantId: input.tenantId,
      })
    )
  }

  return deliveries
}
