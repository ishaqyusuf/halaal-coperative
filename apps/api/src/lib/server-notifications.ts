import {
  listTenantRoleNotificationRecipients,
  recordNotificationDeliveryAudit,
} from "@halaalvest/db"
import {
  createNotificationEmailDraft,
  type NotificationEmailDraft,
} from "@halaalvest/notifications"
import { createServerNotificationService } from "@halaalvest/notifications/server"

export async function sendEmailDraftWithAudit(input: {
  draft: NotificationEmailDraft
  source: string
  tenantId: string
}) {
  const notificationService = createServerNotificationService()
  const delivery = await notificationService.tryEmail(input.draft)

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
      subject: input.subject,
    })

    deliveries.push(
      await sendEmailDraftWithAudit({
        draft,
        source: input.source,
        tenantId: input.tenantId,
      }),
    )
  }

  return deliveries
}
