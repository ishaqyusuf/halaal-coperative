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
      if (seenRecipients.has(user.email)) {
        continue
      }

      seenRecipients.add(user.email)
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
