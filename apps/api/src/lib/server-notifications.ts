import {
  listTenantRoleNotificationRecipients,
  recordNotificationDeliveryAudit,
  resolveMobilePushRecipient,
  type MembershipRole,
} from "@halaalvest/db"
import {
  getMobileNotificationRouting,
  isMobileNotificationOpaqueIdentifier,
  MOBILE_NOTIFICATION_ROLES,
  type MobileNotificationRole,
} from "@halaalvest/domain/mobile-notifications"
import {
  mobilePushDeliveryHandler,
  mobilePushDeliveryTask,
  triggerJob,
} from "@halaalvest/jobs"
import {
  createNotificationEmailDraft,
  getNotificationEmailDeliveryErrorCause,
  type NotificationEmailDelivery,
  type NotificationEmailDraft,
} from "@halaalvest/notifications"
import { createServerNotificationService } from "@halaalvest/notifications/server"
import { AppError } from "@halaalvest/errors"
import { captureApiNotificationError } from "../observability/sentry"
import { randomUUID } from "node:crypto"

type MobilePushRecipientHint = {
  entityId?: string
  intendedRole?: MembershipRole | null
  recipientUserId?: string | null
}

const MOBILE_ENTITY_METADATA_KEYS = [
  "paymentReceiptId",
  "receiptId",
  "loanRequestId",
  "loanId",
  "procurementRequestId",
  "foodPurchaseApplicationId",
  "projectFinancingRequestId",
  "guarantorApprovalId",
  "supportCaseId",
  "reportId",
  "memberId",
] as const

function mobileEntityIdFromMetadata(metadata?: Record<string, unknown>) {
  if (!metadata) return undefined
  for (const key of MOBILE_ENTITY_METADATA_KEYS) {
    const value = metadata[key]
    if (isMobileNotificationOpaqueIdentifier(value)) return value.trim()
  }
  return undefined
}

function isMobileNotificationRole(value: string): value is MobileNotificationRole {
  return MOBILE_NOTIFICATION_ROLES.includes(value as MobileNotificationRole)
}

async function queueMobilePushForEmailDraft(input: {
  draft: NotificationEmailDraft
  mobile?: MobilePushRecipientHint
  tenantId: string
}) {
  const hintedRole = input.mobile?.intendedRole ?? null
  const resolved =
    input.mobile?.recipientUserId && hintedRole
      ? {
          intendedRole: hintedRole,
          userId: input.mobile.recipientUserId,
        }
      : await resolveMobilePushRecipient({
          intendedRole: hintedRole,
          tenantId: input.tenantId,
          userEmail: input.draft.recipient.value,
        })
  if (!resolved || !isMobileNotificationRole(resolved.intendedRole)) return

  const routing = getMobileNotificationRouting(
    input.draft.notificationType,
    resolved.intendedRole
  )
  const notificationId = randomUUID()
  await triggerJob(
    mobilePushDeliveryTask,
    async (payload) => {
      await mobilePushDeliveryHandler(payload)
    },
    {
      ...routing,
      ...(input.mobile?.entityId ? { entityId: input.mobile.entityId } : {}),
      intendedRole: resolved.intendedRole,
      notificationId,
      tenantId: input.tenantId,
      userId: resolved.userId,
      version: 1 as const,
    },
    { baseDelayMs: 1_000, maxAttempts: 3 }
  )
}

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
  mobile?: MobilePushRecipientHint
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

  await queueMobilePushForEmailDraft(input).catch((error) => {
    captureApiNotificationError(
      new AppError({
        cause: error,
        code: "PROVIDER_UNAVAILABLE",
        internalMessage: "Mobile push delivery could not be queued.",
        operation: "notifications.push.queue",
      })
    )
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
  const mobileEntityId = mobileEntityIdFromMetadata(input.metadata)
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
        mobile: {
          ...(mobileEntityId ? { entityId: mobileEntityId } : {}),
          intendedRole: isMobileNotificationRole(recipient.role)
            ? recipient.role
            : null,
          recipientUserId: recipient.userId,
        },
        source: input.source,
        tenantId: input.tenantId,
      })
    )
  }

  return deliveries
}
