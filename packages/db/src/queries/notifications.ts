import type { Prisma, PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { listTenantUsersWithMemberships } from "./auth"

export type CreateNotificationOutboxEntryInput = {
  actionLabel: string
  actionUrl: string
  bodyHtml?: string
  bodyText: string
  metadata?: Record<string, unknown>
  notificationType: string
  recipient: string
  source: string
  subject: string
  tenantId?: string | null
}

export async function createNotificationOutboxEntry(
  input: CreateNotificationOutboxEntryInput,
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()

  if (!prisma) {
    return null
  }

  return prisma.notificationOutbox.create({
    data: {
      actionLabel: input.actionLabel,
      actionUrl: input.actionUrl,
      bodyText: input.bodyText,
      metadata: {
        ...(input.metadata ?? {}),
        ...(input.bodyHtml ? { bodyHtml: input.bodyHtml } : {}),
      } as Prisma.InputJsonValue,
      notificationType: input.notificationType,
      recipient: input.recipient,
      source: input.source,
      subject: input.subject,
      tenantId: input.tenantId ?? null,
    },
  })
}

export type NotificationEmailDraftInput = {
  actionLabel: string
  actionUrl: string
  bodyHtml?: string
  bodyText: string
  notificationType: string
  previewText: string
  recipient: {
    displayName?: string
    value: string
  }
  subject: string
}

export async function createNotificationOutboxEntryFromDraft(
  input: {
    draft: NotificationEmailDraftInput
    metadata?: Record<string, unknown>
    source: string
    tenantId?: string | null
  },
  prismaOverride?: PrismaClient,
) {
  return createNotificationOutboxEntry(
    {
      actionLabel: input.draft.actionLabel,
      actionUrl: input.draft.actionUrl,
      bodyHtml: input.draft.bodyHtml,
      bodyText: input.draft.bodyText,
      metadata: {
        ...(input.metadata ?? {}),
        previewText: input.draft.previewText,
        recipientDisplayName: input.draft.recipient.displayName ?? null,
      },
      notificationType: input.draft.notificationType,
      recipient: input.draft.recipient.value,
      source: input.source,
      subject: input.draft.subject,
      tenantId: input.tenantId ?? null,
    },
    prismaOverride,
  )
}

export type UpdateNotificationOutboxDeliveryInput = {
  attempts: number
  errorMessage?: string
  messageId?: string
  outboxId: string
  status: "failed" | "queued" | "sent"
}

export async function updateNotificationOutboxDelivery(
  input: UpdateNotificationOutboxDeliveryInput,
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()

  if (!prisma) {
    return null
  }

  return prisma.notificationOutbox.update({
    where: {
      id: input.outboxId,
    },
    data: {
      attempts: input.attempts,
      errorMessage: input.errorMessage ?? null,
      messageId: input.messageId ?? null,
      sentAt: input.status === "sent" ? new Date() : null,
      status: input.status,
    },
  })
}

export async function listNotificationOutboxEntries(
  tenantId: string,
  input?: {
    fromDate?: Date
    limit?: number
    notificationType?: string
    search?: string
    status?: "failed" | "queued" | "sent"
    toDate?: Date
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()

  if (!prisma) {
    return []
  }

  return prisma.notificationOutbox.findMany({
    where: {
      tenantId,
      ...(input?.status ? { status: input.status } : {}),
      ...(input?.notificationType
        ? {
            notificationType: {
              contains: input.notificationType,
              mode: "insensitive",
            },
          }
        : {}),
      ...((input?.fromDate || input?.toDate)
        ? {
            createdAt: {
              ...(input?.fromDate ? { gte: input.fromDate } : {}),
              ...(input?.toDate ? { lte: input.toDate } : {}),
            },
          }
        : {}),
      ...(input?.search
        ? {
            OR: [
              { recipient: { contains: input.search, mode: "insensitive" } },
              { subject: { contains: input.search, mode: "insensitive" } },
              { notificationType: { contains: input.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
    take: input?.limit ?? 20,
  })
}

export async function claimNotificationOutboxEntries(
  input?: {
    includeFailed?: boolean
    limit?: number
    maxAttempts?: number
    tenantId?: string
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()

  if (!prisma) {
    return []
  }

  const maxAttempts = input?.maxAttempts ?? 4

  return prisma.notificationOutbox.findMany({
    where: {
      ...(input?.tenantId ? { tenantId: input.tenantId } : {}),
      attempts: {
        lt: maxAttempts,
      },
      OR: [
        {
          status: "queued",
        },
        ...(input?.includeFailed
          ? [
              {
                status: "failed" as const,
              },
            ]
          : []),
      ],
    },
    orderBy: {
      createdAt: "asc",
    },
    take: input?.limit ?? 25,
  })
}

export async function getNotificationOutboxSummary(
  tenantId: string,
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()

  if (!prisma) {
    return {
      failedCount: 0,
      lastSentAt: null as Date | null,
      queuedCount: 0,
      sentCount: 0,
    }
  }

  const [queuedCount, sentCount, failedCount, lastSent] = await Promise.all([
    prisma.notificationOutbox.count({
      where: {
        tenantId,
        status: "queued",
      },
    }),
    prisma.notificationOutbox.count({
      where: {
        tenantId,
        status: "sent",
      },
    }),
    prisma.notificationOutbox.count({
      where: {
        tenantId,
        status: "failed",
      },
    }),
    prisma.notificationOutbox.findFirst({
      orderBy: {
        sentAt: "desc",
      },
      where: {
        tenantId,
        status: "sent",
        sentAt: {
          not: null,
        },
      },
    }),
  ])

  return {
    failedCount,
    lastSentAt: lastSent?.sentAt ?? null,
    queuedCount,
    sentCount,
  }
}

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

export async function queueTenantRoleNotifications(
  input: {
    actionLabel: string
    actionUrl: string
    bodyHtml?: string
    bodyText: string
    metadata?: Record<string, unknown>
    notificationType: string
    roles: string[]
    source: string
    subject: string
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

  const queuedEntries = []
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

      const entry = await createNotificationOutboxEntry(
        {
          actionLabel: input.actionLabel,
          actionUrl: input.actionUrl,
          bodyHtml: input.bodyHtml,
          bodyText: input.bodyText,
          metadata: {
            ...(input.metadata ?? {}),
            role,
          },
          notificationType: input.notificationType,
          recipient: user.email,
          source: input.source,
          subject: input.subject,
          tenantId: input.tenantId,
        },
        prisma,
      )

      if (entry) {
        queuedEntries.push(entry)
      }
    }
  }

  return queuedEntries
}
