import type { Prisma, PrismaClient } from "@prisma/client"
import { createPrismaClient } from "../prisma"

export type CreateAuditLogEntryInput = {
  action: string
  actorType: "integration" | "system" | "user"
  entityId?: string | null
  entityType: string
  metadata?: Record<string, unknown>
  occurredAt?: Date
  tenantId: string
  actorUserId?: string | null
}

export async function createAuditLogEntry(
  input: CreateAuditLogEntryInput,
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()

  if (!prisma) {
    return null
  }

  return prisma.auditLog.create({
    data: {
      action: input.action,
      actorType: input.actorType,
      actorUserId: input.actorUserId ?? null,
      entityId: input.entityId ?? null,
      entityType: input.entityType,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
      occurredAt: input.occurredAt ?? new Date(),
      tenantId: input.tenantId,
    },
  })
}

export async function listAuditLogs(
  tenantId: string,
  input?: {
    action?: string
    actorType?: "integration" | "system" | "user"
    entityType?: string
    fromDate?: Date
    limit?: number
    search?: string
    toDate?: Date
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()

  if (!prisma) {
    return []
  }

  return prisma.auditLog.findMany({
    where: {
      tenantId,
      ...(input?.action
        ? {
            action: {
              contains: input.action,
              mode: "insensitive",
            },
          }
        : {}),
      ...(input?.actorType ? { actorType: input.actorType } : {}),
      ...(input?.entityType
        ? {
            entityType: {
              contains: input.entityType,
              mode: "insensitive",
            },
          }
        : {}),
      ...((input?.fromDate || input?.toDate)
        ? {
            occurredAt: {
              ...(input?.fromDate ? { gte: input.fromDate } : {}),
              ...(input?.toDate ? { lte: input.toDate } : {}),
            },
          }
        : {}),
      ...(input?.search
        ? {
            OR: [
              { action: { contains: input.search, mode: "insensitive" } },
              { entityType: { contains: input.search, mode: "insensitive" } },
              { entityId: { contains: input.search, mode: "insensitive" } },
              {
                actorUser: {
                  fullName: {
                    contains: input.search,
                    mode: "insensitive",
                  },
                },
              },
              {
                actorUser: {
                  email: {
                    contains: input.search,
                    mode: "insensitive",
                  },
                },
              },
            ],
          }
        : {}),
    },
    include: {
      actorUser: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
    orderBy: {
      occurredAt: "desc",
    },
    take: input?.limit ?? 25,
  })
}

export async function getAuditSummary(tenantId: string, prismaOverride?: PrismaClient) {
  const prisma = prismaOverride ?? createPrismaClient()

  if (!prisma) {
    return {
      recentActionsCount: 0,
      systemEventsCount: 0,
      userEventsCount: 0,
    }
  }

  const since = new Date()
  since.setUTCDate(since.getUTCDate() - 30)

  const [recentActionsCount, systemEventsCount, userEventsCount] = await Promise.all([
    prisma.auditLog.count({
      where: {
        tenantId,
        occurredAt: {
          gte: since,
        },
      },
    }),
    prisma.auditLog.count({
      where: {
        tenantId,
        actorType: "system",
        occurredAt: {
          gte: since,
        },
      },
    }),
    prisma.auditLog.count({
      where: {
        tenantId,
        actorType: "user",
        occurredAt: {
          gte: since,
        },
      },
    }),
  ])

  return {
    recentActionsCount,
    systemEventsCount,
    userEventsCount,
  }
}

export type NotificationDeliveryAuditInput = {
  attempts: number
  errorMessage?: string
  messageId: string
  notificationType: string
  recipient: string
  source: string
  status: "failed" | "queued" | "sent"
  tenantId: string
}

export async function recordNotificationDeliveryAudit(
  input: NotificationDeliveryAuditInput,
  prismaOverride?: PrismaClient,
) {
  return createAuditLogEntry(
    {
      action:
        input.status === "sent"
          ? "notification.email_sent"
          : input.status === "queued"
            ? "notification.email_queued"
            : "notification.email_failed",
      actorType: "system",
      entityId: input.messageId,
      entityType: "NotificationEmail",
      metadata: {
        attempts: input.attempts,
        errorMessage: input.errorMessage ?? null,
        notificationType: input.notificationType,
        recipient: input.recipient,
        source: input.source,
        status: input.status,
      },
      tenantId: input.tenantId,
    },
    prismaOverride,
  )
}
