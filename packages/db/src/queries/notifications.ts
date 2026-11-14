import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { listTenantUsersWithMemberships } from "./auth"

export async function listNotificationPreferences(tenantId: string, prismaOverride?: PrismaClient) {
  const prisma = prismaOverride ?? createPrismaClient()

  if (!prisma) {
    return []
  }

  return prisma.notificationPreference.findMany({
    where: {
      tenantId,
    },
    orderBy: [{ role: "asc" }, { notificationType: "asc" }, { channel: "asc" }],
  })
}

export async function listTenantRoleNotificationRecipients(
  input: {
    notificationType: string
    roles: string[]
    tenantId: string
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()

  if (!prisma) {
    return []
  }

  const [users, preferences] = await Promise.all([
    listTenantUsersWithMemberships(input.tenantId),
    prisma.notificationPreference.findMany({
      where: {
        tenantId: input.tenantId,
        notificationType: input.notificationType,
        channel: "email",
      },
    }),
  ])

  const recipients: Array<{
    email: string
    fullName: string
    role: string
    userId: string
  }> = []
  const seenRecipients = new Set<string>()

  for (const role of input.roles) {
    const rolePreferences = preferences.filter((preference) => preference.role === role)
    const shouldNotifyRole = rolePreferences.length === 0 || rolePreferences.some((preference) => preference.enabled)

    if (!shouldNotifyRole) {
      continue
    }

    const matchingUsers = users.filter((user) => user.memberships.some((membership) => membership.role === role))

    for (const user of matchingUsers) {
      // Case variants of one mailbox must not receive the same event twice.
      const recipientKey = user.email.trim().toLowerCase()
      if (seenRecipients.has(recipientKey)) {
        continue
      }

      seenRecipients.add(recipientKey)
      recipients.push({
        email: user.email,
        fullName: user.fullName,
        role,
        userId: user.id,
      })
    }
  }

  return recipients
}

export async function upsertNotificationPreference(
  input: {
    actorUserId: string
    channel: string
    enabled: boolean
    notificationType: string
    role?: string | null
    tenantId: string
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()

  if (!prisma) {
    throw new Error("Database not configured")
  }

  return prisma.$transaction(async (tx) => {
    const existingPreference = await tx.notificationPreference.findFirst({
      where: {
        tenantId: input.tenantId,
        role: input.role ?? null,
        notificationType: input.notificationType,
        channel: input.channel,
      },
    })

    const preference = existingPreference
      ? await tx.notificationPreference.update({
          where: {
            id: existingPreference.id,
          },
          data: {
            enabled: input.enabled,
          },
        })
      : await tx.notificationPreference.create({
          data: {
            tenantId: input.tenantId,
            role: input.role ?? null,
            notificationType: input.notificationType,
            channel: input.channel,
            enabled: input.enabled,
          },
        })

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        actorType: "user",
        action: "notification_preference.updated",
        entityType: "NotificationPreference",
        entityId: preference.id,
        metadata: {
          channel: input.channel,
          enabled: input.enabled,
          notificationType: input.notificationType,
          role: input.role ?? null,
        },
        occurredAt: new Date(),
      },
    })

    return preference
  })
}

export type NotificationDeliveryStatus = "failed" | "queued" | "sent"

const deliveryActionByStatus: Record<NotificationDeliveryStatus, string> = {
  failed: "notification.email_failed",
  queued: "notification.email_queued",
  sent: "notification.email_sent",
}
const deliveryActions = Object.values(deliveryActionByStatus)

function getDeliveryStatusFromAction(
  action: string
): NotificationDeliveryStatus {
  if (action === deliveryActionByStatus.sent) return "sent"
  if (action === deliveryActionByStatus.failed) return "failed"

  return "queued"
}

function getDeliveryMetadataString(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null
  }

  const value = (metadata as Record<string, unknown>)[key]

  return typeof value === "string" ? value : null
}

type NotificationDeliveryFilters = {
  /** Only emails sent to this address (a member sees their own). */
  recipient?: string | null
  /** Part of the recipient address. */
  search?: string | null
  status?: NotificationDeliveryStatus | null
  type?: string | null
}

function getNotificationDeliveryWhere(
  tenantId: string,
  filters: NotificationDeliveryFilters
) {
  const metadataFilters = [
    filters.recipient
      ? {
          metadata: {
            equals: filters.recipient,
            path: ["recipient"],
          },
        }
      : null,
    filters.search
      ? {
          metadata: {
            path: ["recipient"],
            string_contains: filters.search.trim().toLowerCase(),
          },
        }
      : null,
    filters.type
      ? { metadata: { equals: filters.type, path: ["notificationType"] } }
      : null,
  ].filter((filter) => filter !== null)

  return {
    action: filters.status
      ? deliveryActionByStatus[filters.status]
      : { in: deliveryActions },
    tenantId,
    ...(metadataFilters.length > 0 ? { AND: metadataFilters } : {}),
  }
}

/**
 * One page of sent, waiting or failed emails, newest first. Filters run in
 * SQL so paging and totals stay right beyond the first page.
 */
export async function listNotificationDeliveries(
  tenantId: string,
  input: NotificationDeliveryFilters & {
    cursor?: string | null
    pageSize?: number
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  const pageSize = input.pageSize ?? 25

  if (!prisma) {
    return { data: [], nextCursor: null as string | null }
  }

  const rows = await prisma.auditLog.findMany({
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    select: { action: true, id: true, metadata: true, occurredAt: true },
    take: pageSize + 1,
    where: getNotificationDeliveryWhere(tenantId, input),
  })
  const page = rows.slice(0, pageSize)

  return {
    data: page.map((row) => ({
      id: row.id,
      notificationType:
        getDeliveryMetadataString(row.metadata, "notificationType") ??
        "notification.email",
      occurredAt: row.occurredAt,
      recipient:
        getDeliveryMetadataString(row.metadata, "recipient") ?? "Unknown",
      status: getDeliveryStatusFromAction(row.action),
    })),
    nextCursor: rows.length > pageSize ? (page.at(-1)?.id ?? null) : null,
  }
}

/** Totals by status in one grouped read. */
export async function countNotificationDeliveriesByStatus(
  tenantId: string,
  filters: Pick<NotificationDeliveryFilters, "recipient"> = {},
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  const counts: Record<NotificationDeliveryStatus, number> = {
    failed: 0,
    queued: 0,
    sent: 0,
  }

  if (!prisma) {
    return counts
  }

  const groups = await prisma.auditLog.groupBy({
    _count: { _all: true },
    by: ["action"],
    where: getNotificationDeliveryWhere(tenantId, filters),
  })

  for (const group of groups) {
    counts[getDeliveryStatusFromAction(group.action)] += group._count._all
  }

  return counts
}

/**
 * Whether each staff role gets each email. No saved choice means the email is
 * sent, which is how `listTenantRoleNotificationRecipients` decides.
 */
export async function listStaffNotificationSettings(
  tenantId: string,
  input: { notificationTypes: string[]; roles: string[] },
  prismaOverride?: PrismaClient,
) {
  const preferences = await listNotificationPreferences(
    tenantId,
    prismaOverride,
  )

  return input.notificationTypes.map((notificationType) => ({
    notificationType,
    roles: input.roles.map((role) => {
      const saved = preferences.filter(
        (preference) =>
          preference.channel === "email" &&
          preference.notificationType === notificationType &&
          preference.role === role,
      )

      return {
        enabled:
          saved.length === 0 || saved.some((preference) => preference.enabled),
        role,
      }
    }),
  }))
}
