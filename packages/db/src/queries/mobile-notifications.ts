import type { PrismaClient } from "../../generated/prisma/client"
import { createHash } from "node:crypto"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError } from "../query-error"
import type { MembershipRole } from "./auth"
import {
  MOBILE_NOTIFICATION_ACTIONS,
  MOBILE_NOTIFICATION_ROLES,
  type MobileNotificationAction,
  type MobileNotificationRole,
} from "@halaalvest/domain/mobile-notifications"
import {
  getMobilePushRegistrationState,
  getMobileUserNotificationPreferences,
} from "./mobile-push-notifications"

export type MobileFeatureNotificationDelivery = {
  action: MobileNotificationAction
  entityId: string | null
  errorMessage: string | null
  id: string
  intendedRole: MobileNotificationRole | null
  isRead: boolean
  notificationType: string
  occurredAt: string
  safeSummary: string
  safeTitle: string
  source: string | null
  status: "failed" | "queued" | "sent" | "suppressed" | "unknown"
}

function notificationAction(type: string): MobileNotificationAction {
  const normalized = type.toLowerCase()
  if (normalized.includes("receipt") || normalized.includes("payment")) {
    return "open_receipts"
  }
  if (normalized.includes("guarantor")) return "open_guarantors"
  if (normalized.includes("financing") || normalized.includes("loan")) {
    return "open_financing"
  }
  if (normalized.includes("support")) return "open_support"
  if (normalized.includes("report")) return "open_reports"
  if (normalized.includes("security") || normalized.includes("session")) {
    return "open_security"
  }
  if (normalized.includes("update")) return "open_updates"
  return "open_notifications"
}

export function deriveMobileNotificationReadAuditId(
  tenantId: string,
  actorUserId: string,
  deliveryId: string
) {
  const bytes = Buffer.from(
    createHash("sha1")
      .update(
        `halaalvest:mobile-notification-read:${tenantId}:${actorUserId}:${deliveryId}`
      )
      .digest()
      .subarray(0, 16)
  )
  bytes[6] = (bytes[6]! & 0x0f) | 0x50
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = bytes.toString("hex")

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function metadataString(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null
  }
  const value = (metadata as Record<string, unknown>)[key]
  return typeof value === "string" && value.trim() ? value : null
}

function deliveryStatus(
  action: string
): MobileFeatureNotificationDelivery["status"] {
  if (action === "notification.email_sent") return "sent"
  if (action === "notification.push_sent") return "sent"
  if (action === "notification.email_failed") return "failed"
  if (action === "notification.push_failed") return "failed"
  if (action === "notification.email_queued") return "queued"
  if (action === "notification.push_suppressed") return "suppressed"
  return "unknown"
}

function metadataNotificationAction(metadata: unknown) {
  const value = metadataString(metadata, "action")
  return value && MOBILE_NOTIFICATION_ACTIONS.includes(value as MobileNotificationAction)
    ? (value as MobileNotificationAction)
    : null
}

function metadataNotificationRole(metadata: unknown) {
  const value = metadataString(metadata, "intendedRole")
  return value && MOBILE_NOTIFICATION_ROLES.includes(value as MobileNotificationRole)
    ? (value as MobileNotificationRole)
    : null
}

function safeCopy(type: string) {
  const normalized = type.toLowerCase()
  const kind =
    normalized.includes("receipt") || normalized.includes("payment")
      ? "Receipt"
      : normalized.includes("loan") || normalized.includes("financing")
        ? "Financing"
        : normalized.includes("procurement")
          ? "Procurement"
          : normalized.includes("food")
            ? "Foodstuff Purchase"
            : normalized.includes("project")
              ? "Project financing"
              : normalized.includes("share")
                ? "Share"
                : normalized.includes("guarantor")
                  ? "Guarantor"
                  : normalized.includes("support")
                    ? "Support"
                    : "Cooperative"
  return {
    safeSummary: `${kind} activity is available inside the app.`,
    safeTitle: `${kind} update`,
  }
}

export const MOBILE_NOTIFICATION_PAGE_SIZE = 25

type NotificationCenterInput = {
  memberLoginEnabled: boolean
  mobileDeviceSessionId?: string | null
  role: MembershipRole
  tenantId: string
  userEmail: string
  userId: string
}

type NotificationSummaryCounts = {
  failed: number
  queued: number
  sent: number
  totalDeliveries: number
  unread: number
}

function recipientEmailVariants(email: string) {
  return [...new Set([email.trim().toLowerCase(), email.trim()])].filter(
    Boolean
  )
}

/**
 * The recipient rule shared by the SQL and the in-memory check: a delivery
 * with `recipientUserId` belongs to that user; otherwise to the `recipient`
 * address. A delivery meant for another role is hidden.
 */
function isOwnDelivery(
  metadata: unknown,
  input: { normalizedEmail: string; role: MembershipRole; userId: string }
) {
  const intendedRole = metadataNotificationRole(metadata)
  if (intendedRole && intendedRole !== input.role) return false
  const recipientUserId = metadataString(metadata, "recipientUserId")
  if (recipientUserId) return recipientUserId === input.userId
  return (
    metadataString(metadata, "recipient")?.trim().toLowerCase() ===
    input.normalizedEmail
  )
}

function countAsNumber(value: unknown) {
  if (typeof value === "bigint") return Number(value)
  if (typeof value === "number") return value
  if (typeof value === "string") return Number(value) || 0
  return 0
}

/**
 * True totals over the user's whole notification history (mobile plan M5):
 * one statement, recipient-scoped in SQL, so other members' notifications
 * in a busy tenant never push the user's own items or unread count out of a
 * window. Narrow test doubles without `$queryRaw` get null and fall back to
 * page counts.
 */
async function readNotificationSummaryCounts(
  prisma: PrismaClient,
  input: {
    /** Same address variants as the list query, so totals match the list. */
    emails: string[]
    role: MembershipRole
    tenantId: string
    userId: string
  }
): Promise<NotificationSummaryCounts | null> {
  const raw = prisma as unknown as { $queryRaw?: unknown }
  if (typeof raw.$queryRaw !== "function") return null
  const roles = [...MOBILE_NOTIFICATION_ROLES]
  const rows = (await prisma.$queryRaw`
    SELECT
      COUNT(*) AS "totalDeliveries",
      COUNT(*) FILTER (
        WHERE d.action IN ('notification.email_failed', 'notification.push_failed')
      ) AS "failed",
      COUNT(*) FILTER (WHERE d.action = 'notification.email_queued') AS "queued",
      COUNT(*) FILTER (
        WHERE d.action IN ('notification.email_sent', 'notification.push_sent')
      ) AS "sent",
      COUNT(*) FILTER (
        WHERE NOT EXISTS (
          SELECT 1 FROM audit_logs r
          WHERE r.tenant_id = d.tenant_id
            AND r.action = 'mobile.notification.read'
            AND r.actor_user_id = ${input.userId}::uuid
            AND r.entity_id = d.id::text
        )
      ) AS "unread"
    FROM audit_logs d
    WHERE d.tenant_id = ${input.tenantId}::uuid
      AND d.action LIKE 'notification.%'
      AND (
        NULLIF(BTRIM(d.metadata->>'intendedRole'), '') IS NULL
        OR NOT (d.metadata->>'intendedRole' = ANY(${roles}::text[]))
        OR d.metadata->>'intendedRole' = ${input.role}
      )
      AND (
        d.metadata->>'recipientUserId' = ${input.userId}
        OR (
          NULLIF(BTRIM(d.metadata->>'recipientUserId'), '') IS NULL
          AND d.metadata->>'recipient' = ANY(${input.emails}::text[])
        )
      )
  `) as Array<Record<keyof NotificationSummaryCounts, unknown>>
  const row = rows[0]
  return {
    failed: countAsNumber(row?.failed),
    queued: countAsNumber(row?.queued),
    sent: countAsNumber(row?.sent),
    totalDeliveries: countAsNumber(row?.totalDeliveries),
    unread: countAsNumber(row?.unread),
  }
}

/**
 * The bell badge on mobile home: the notification center's unread total
 * (same recipient rule and read markers), in one statement.
 */
export async function getMobileNotificationUnreadCount(
  input: {
    role: MembershipRole
    tenantId: string
    userEmail: string
    userId: string
  },
  prismaOverride?: PrismaClient
): Promise<number> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) return 0
  const counts = await readNotificationSummaryCounts(prisma, {
    emails: recipientEmailVariants(input.userEmail),
    role: input.role,
    tenantId: input.tenantId,
    userId: input.userId,
  })
  return counts?.unread ?? 0
}

export async function getMobileNotificationCenter(
  input: NotificationCenterInput & {
    /** The last delivery id of the previous page. */
    cursor?: string | null
    limit?: number
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) {
    return {
      deliveries: [],
      generatedAt: new Date().toISOString(),
      nextCursor: null,
      preferences: [],
      pushRegistration: null,
      summary: {
        enabledPreferences: 0,
        failed: 0,
        queued: 0,
        sent: 0,
        totalDeliveries: 0,
        unread: 0,
      },
    }
  }
  const normalizedEmail = input.userEmail.trim().toLowerCase()
  const limit = Math.min(
    Math.max(input.limit ?? MOBILE_NOTIFICATION_PAGE_SIZE, 1),
    50
  )
  const emails = recipientEmailVariants(input.userEmail)
  const scope = {
    normalizedEmail,
    role: input.role,
    tenantId: input.tenantId,
    userId: input.userId,
  }
  const [deliveryLogs, counts, preferences, pushRegistration] =
    await Promise.all([
      prisma.auditLog.findMany({
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
        select: { action: true, id: true, metadata: true, occurredAt: true },
        take: limit + 1,
        where: {
          action: { startsWith: "notification." },
          OR: [
            { metadata: { equals: input.userId, path: ["recipientUserId"] } },
            ...emails.map((email) => ({
              metadata: { equals: email, path: ["recipient"] },
            })),
          ],
          tenantId: input.tenantId,
        },
      }),
      readNotificationSummaryCounts(prisma, { ...scope, emails }),
      getMobileUserNotificationPreferences(
        {
          memberLoginEnabled: input.memberLoginEnabled,
          role: input.role,
          tenantId: input.tenantId,
          userId: input.userId,
        },
        prisma
      ),
      getMobilePushRegistrationState(
        {
          mobileDeviceSessionId: input.mobileDeviceSessionId,
          tenantId: input.tenantId,
          userId: input.userId,
        },
        prisma
      ),
    ])
  const hasMore = deliveryLogs.length > limit
  const pageLogs = deliveryLogs.slice(0, limit)
  const ownLogs = pageLogs.filter((log) => isOwnDelivery(log.metadata, scope))
  const readLogs =
    ownLogs.length === 0
      ? []
      : await prisma.auditLog.findMany({
          select: { actorUserId: true, entityId: true },
          where: {
            action: "mobile.notification.read",
            actorUserId: input.userId,
            entityId: { in: ownLogs.map((log) => log.id) },
            tenantId: input.tenantId,
          },
        })
  const readIds = new Set(
    readLogs
      .filter((log) => log.actorUserId === input.userId)
      .map((log) => log.entityId)
      .filter((id): id is string => Boolean(id))
  )
  const deliveries = ownLogs.map((log) => {
    const notificationType =
      metadataString(log.metadata, "notificationType") ?? "notification.email"
    const status = deliveryStatus(log.action)
    return {
      action:
        metadataNotificationAction(log.metadata) ??
        notificationAction(notificationType),
      entityId: metadataString(log.metadata, "entityId"),
      errorMessage:
        status === "failed" ? "Delivery could not be completed." : null,
      id: log.id,
      intendedRole: metadataNotificationRole(log.metadata),
      isRead: readIds.has(log.id),
      notificationType,
      occurredAt: log.occurredAt.toISOString(),
      ...safeCopy(notificationType),
      source: metadataString(log.metadata, "source"),
      status,
    }
  })
  const pageCounts: NotificationSummaryCounts = {
    failed: deliveries.filter((item) => item.status === "failed").length,
    queued: deliveries.filter((item) => item.status === "queued").length,
    sent: deliveries.filter((item) => item.status === "sent").length,
    totalDeliveries: deliveries.length,
    unread: deliveries.filter((item) => !item.isRead).length,
  }
  return {
    deliveries,
    generatedAt: new Date().toISOString(),
    nextCursor: hasMore ? (pageLogs.at(-1)?.id ?? null) : null,
    preferences,
    pushRegistration,
    summary: {
      enabledPreferences: preferences.filter((item) => item.enabled).length,
      ...(counts ?? pageCounts),
    },
  }
}

export async function markMobileNotificationsRead(
  input: {
    actorUserId: string
    deliveryIds: string[]
    tenantId: string
    userEmail: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma)
    throw new Error(
      "Notifications are unavailable without database configuration."
    )
  const ids = [...new Set(input.deliveryIds)].slice(0, 25)
  if (!ids.length) return { markedCount: 0 }
  const logs = await prisma.auditLog.findMany({
    select: { id: true, metadata: true },
    where: {
      action: { startsWith: "notification." },
      id: { in: ids },
      tenantId: input.tenantId,
    },
  })
  const email = input.userEmail.trim().toLowerCase()
  if (
    logs.some((log) => {
      const recipientUserId = metadataString(log.metadata, "recipientUserId")
      if (recipientUserId) return recipientUserId !== input.actorUserId
      return (
        metadataString(log.metadata, "recipient")?.trim().toLowerCase() !==
        email
      )
    }) || logs.length !== ids.length
  ) {
    throw ExpectedQueryError.permission(
      "One or more notifications do not belong to this account."
    )
  }
  const existing = await prisma.auditLog.findMany({
    select: { entityId: true },
    where: {
      action: "mobile.notification.read",
      actorUserId: input.actorUserId,
      entityId: { in: ids },
      tenantId: input.tenantId,
    },
  })
  const existingIds = new Set(existing.map((item) => item.entityId))
  const unreadIds = ids.filter((id) => !existingIds.has(id))
  if (unreadIds.length) {
    await prisma.auditLog.createMany({
      data: unreadIds.map((id) => ({
        action: "mobile.notification.read",
        actorType: "user" as const,
        actorUserId: input.actorUserId,
        entityId: id,
        entityType: "NotificationDelivery",
        id: deriveMobileNotificationReadAuditId(
          input.tenantId,
          input.actorUserId,
          id
        ),
        metadata: { readFrom: "mobile" },
        occurredAt: new Date(),
        tenantId: input.tenantId,
      })),
      skipDuplicates: true,
    })
  }
  return { markedCount: unreadIds.length }
}
