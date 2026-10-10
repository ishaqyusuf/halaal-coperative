import {
  createAuditLogEntry,
  createPrismaClient,
  disableMobilePushEndpointForProviderFailure,
  getTenantSubscriptionSnapshot,
  listEligibleMobilePushRegistrations,
} from "@halaalvest/db"
import {
  MOBILE_NOTIFICATION_CATEGORY_KEYS,
  MOBILE_NOTIFICATION_ROLES,
  parseMobileNotificationActionPayload,
  type MobileNotificationActionPayload,
  type MobileNotificationCategoryKey,
  type MobileNotificationRole,
} from "@halaalvest/domain/mobile-notifications"
import { sendExpoMobilePush } from "@halaalvest/notifications"
import type { MobilePushReceiptPayload } from "./mobile-push-receipt"

export type MobilePushDeliveryPayload = {
  action: MobileNotificationActionPayload["action"]
  category: MobileNotificationCategoryKey
  entityId?: string
  intendedRole: MobileNotificationRole
  notificationId: string
  tenantId: string
  userId: string
  version: 1
}

type MobilePushDeliveryDependencies = {
  createAudit: typeof createAuditLogEntry
  disableRegistration: typeof disableMobilePushEndpointForProviderFailure
  getSubscription: typeof getTenantSubscriptionSnapshot
  listRegistrations: typeof listEligibleMobilePushRegistrations
  prisma: NonNullable<ReturnType<typeof createPrismaClient>>
  scheduleReceipt: (payload: MobilePushReceiptPayload) => Promise<void>
  sendPush: typeof sendExpoMobilePush
}

export function validateMobilePushPayload(
  payload: MobilePushDeliveryPayload
): MobilePushDeliveryPayload {
  const action = parseMobileNotificationActionPayload(payload)
  if (!action || action.notificationId !== payload.notificationId) {
    throw new Error("The mobile notification action payload is not valid.")
  }
  if (!MOBILE_NOTIFICATION_CATEGORY_KEYS.includes(payload.category)) {
    throw new Error("The mobile notification category is not supported.")
  }
  if (!MOBILE_NOTIFICATION_ROLES.includes(payload.intendedRole)) {
    throw new Error("The mobile notification role is not supported.")
  }
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      payload.notificationId
    )
  ) {
    throw new Error("notificationId must be a UUID.")
  }
  return payload
}

function dependencies(
  overrides?: Partial<MobilePushDeliveryDependencies>
): MobilePushDeliveryDependencies {
  const prisma = overrides?.prisma ?? createPrismaClient()
  if (!prisma) throw new Error("Push delivery requires database configuration.")
  return {
    createAudit: overrides?.createAudit ?? createAuditLogEntry,
    disableRegistration:
      overrides?.disableRegistration ??
      disableMobilePushEndpointForProviderFailure,
    getSubscription:
      overrides?.getSubscription ?? getTenantSubscriptionSnapshot,
    listRegistrations:
      overrides?.listRegistrations ?? listEligibleMobilePushRegistrations,
    prisma,
    scheduleReceipt: overrides?.scheduleReceipt ?? (async () => undefined),
    sendPush: overrides?.sendPush ?? sendExpoMobilePush,
  }
}

export async function mobilePushDeliveryHandler(
  rawPayload: MobilePushDeliveryPayload,
  overrides?: Partial<MobilePushDeliveryDependencies>
) {
  const payload = validateMobilePushPayload(rawPayload)
  const runtime = dependencies(overrides)

  const duplicate = await runtime.prisma.auditLog.findUnique({
    select: { action: true },
    where: { id: payload.notificationId },
  })
  if (duplicate?.action === "notification.push_sent") {
    return { delivered: 0, duplicate: true, failed: 0, suppressed: 0 }
  }

  const subscription = await runtime.getSubscription(
    { tenantId: payload.tenantId },
    runtime.prisma
  )
  const registrations = await runtime.listRegistrations(
    {
      category: payload.category,
      memberLoginEnabled: subscription.enforcement.memberLoginEnabled,
      role: payload.intendedRole,
      tenantId: payload.tenantId,
      userId: payload.userId,
    },
    runtime.prisma
  )
  let delivered = 0
  let failed = 0
  for (const registration of registrations) {
    try {
      const ticket = await runtime.sendPush({
        category: payload.category,
        data: {
          action: payload.action,
          ...(payload.entityId ? { entityId: payload.entityId } : {}),
          intendedRole: payload.intendedRole,
          notificationId: payload.notificationId,
          tenantId: payload.tenantId,
          version: 1,
        },
        to: registration.providerToken,
      })
      if (ticket.status === "ok") {
        delivered += 1
      } else {
        failed += 1
        if (ticket.errorCode === "DeviceNotRegistered") {
          await runtime.disableRegistration(
            {
              failureCode: ticket.errorCode,
              registrationId: registration.id,
              tenantId: payload.tenantId,
            },
            runtime.prisma
          )
        }
      }
      await runtime.createAudit(
        {
          action:
            ticket.status === "ok"
              ? "mobile.push.delivery_sent"
              : "mobile.push.delivery_failed",
          actorType: "system",
          entityId: payload.notificationId,
          entityType: "MobilePushDeliveryAttempt",
          metadata: {
            errorCode: ticket.errorCode,
            providerTicketId: ticket.providerTicketId,
            registrationId: registration.id,
            tokenFingerprint: registration.tokenHash.slice(0, 12),
          },
          tenantId: payload.tenantId,
        },
        runtime.prisma
      )
      if (ticket.status === "ok" && ticket.providerTicketId) {
        await runtime
          .scheduleReceipt({
            notificationId: payload.notificationId,
            providerTicketId: ticket.providerTicketId,
            registrationId: registration.id,
            tenantId: payload.tenantId,
          })
          .catch(async () => {
            await runtime.createAudit(
              {
                action: "mobile.push.receipt_schedule_failed",
                actorType: "system",
                entityId: payload.notificationId,
                entityType: "MobilePushReceipt",
                metadata: { registrationId: registration.id },
                tenantId: payload.tenantId,
              },
              runtime.prisma
            )
          })
      }
    } catch {
      failed += 1
    }
  }

  const action = delivered
    ? "notification.push_sent"
    : registrations.length
      ? "notification.push_failed"
      : "notification.push_suppressed"
  await runtime.prisma.auditLog.upsert({
    create: {
      action,
      actorType: "system",
      entityId: payload.notificationId,
      entityType: "MobileNotification",
      id: payload.notificationId,
      metadata: {
        action: payload.action,
        ...(payload.entityId ? { entityId: payload.entityId } : {}),
        intendedRole: payload.intendedRole,
        notificationType: payload.category,
        recipientUserId: payload.userId,
        source: "mobile-push-job",
      },
      occurredAt: new Date(),
      tenantId: payload.tenantId,
    },
    update: {
      action,
      metadata: {
        action: payload.action,
        ...(payload.entityId ? { entityId: payload.entityId } : {}),
        intendedRole: payload.intendedRole,
        notificationType: payload.category,
        recipientUserId: payload.userId,
        source: "mobile-push-job",
      },
    },
    where: { id: payload.notificationId },
  })

  return {
    delivered,
    duplicate: false,
    failed,
    suppressed: registrations.length ? 0 : 1,
  }
}
