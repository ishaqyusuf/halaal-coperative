import type { Prisma, PrismaClient } from "../../generated/prisma/client"
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

export type AuditLogSortField =
  | "action"
  | "actor"
  | "entityType"
  | "occurredAt"

export type ListAuditLogsInput = {
  action?: string
  actorType?: "integration" | "system" | "user"
  cursor?: string | null
  entityType?: string
  fromDate?: Date
  limit?: number
  search?: string
  sort?: [AuditLogSortField, "asc" | "desc"] | null
  toDate?: Date
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

function getAuditLogWhere(tenantId: string, input?: ListAuditLogsInput) {
  return {
    tenantId,
    ...(input?.action
      ? {
          action: {
            contains: input.action,
            mode: "insensitive" as const,
          },
        }
      : {}),
    ...(input?.actorType ? { actorType: input.actorType } : {}),
    ...(input?.entityType
      ? {
          entityType: {
            contains: input.entityType,
            mode: "insensitive" as const,
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
            { action: { contains: input.search, mode: "insensitive" as const } },
            {
              entityType: {
                contains: input.search,
                mode: "insensitive" as const,
              },
            },
            {
              entityId: {
                contains: input.search,
                mode: "insensitive" as const,
              },
            },
            {
              actorUser: {
                fullName: {
                  contains: input.search,
                  mode: "insensitive" as const,
                },
              },
            },
            {
              actorUser: {
                email: {
                  contains: input.search,
                  mode: "insensitive" as const,
                },
              },
            },
          ],
        }
      : {}),
  } satisfies Prisma.AuditLogWhereInput
}

function getAuditLogOrderBy(input?: ListAuditLogsInput) {
  const [field, direction] = input?.sort ?? ["occurredAt", "desc"]

  if (field === "action") {
    return [
      { action: direction },
      { occurredAt: "desc" },
      { id: "desc" },
    ] satisfies Prisma.AuditLogOrderByWithRelationInput[]
  }

  if (field === "actor") {
    return [
      { actorUser: { fullName: direction } },
      { actorType: direction },
      { occurredAt: "desc" },
      { id: "desc" },
    ] satisfies Prisma.AuditLogOrderByWithRelationInput[]
  }

  if (field === "entityType") {
    return [
      { entityType: direction },
      { occurredAt: "desc" },
      { id: "desc" },
    ] satisfies Prisma.AuditLogOrderByWithRelationInput[]
  }

  return [
    { occurredAt: direction },
    { id: direction },
  ] satisfies Prisma.AuditLogOrderByWithRelationInput[]
}

export async function listAuditLogs(
  tenantId: string,
  input?: ListAuditLogsInput,
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()

  if (!prisma) {
    return []
  }

  return prisma.auditLog.findMany({
    ...(input?.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    include: {
      actorUser: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
    orderBy: getAuditLogOrderBy(input),
    take: input?.limit ?? 25,
    where: getAuditLogWhere(tenantId, input),
  })
}

export async function countAuditLogs(
  tenantId: string,
  input?: ListAuditLogsInput,
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()

  if (!prisma) {
    return 0
  }

  return prisma.auditLog.count({
    where: getAuditLogWhere(tenantId, input),
  })
}

type AuditUserPreview = {
  email: string
  fullName: string
  id: string
}

type AuditLogWithActor = Prisma.AuditLogGetPayload<{
  include: {
    actorUser: {
      select: {
        email: true
        fullName: true
        id: true
      }
    }
  }
}>

export type ActivityReportEvent = {
  action: string
  actionLabel: string
  actorEmail: string | null
  actorLabel: string
  actorName: string | null
  actorType: string
  actorUserId: string | null
  authorizationRole: string
  authorizerEmail: string | null
  authorizerLabel: string
  authorizerName: string | null
  authorizerUserId: string | null
  entityId: string | null
  entityType: string
  id: string
  metadataSummary: string[]
  occurredAt: Date
}

const authorizerMetadataKeys = [
  "authorizedByUserId",
  "authorizerUserId",
  "approvedByUserId",
  "reviewedByUserId",
  "respondedByUserId",
  "receivedByUserId",
  "appliedByUserId",
  "migrationFinalizedByUserId",
  "migrationEmergencyUnlockedByUserId",
]

const authorizationActionFragments = [
  "approved",
  "rejected",
  "reviewed",
  "disbursed",
  "posted",
  "waived",
  "settled",
  "finalized",
  "published",
  "status_updated",
]

function getMetadataRecord(metadata: unknown): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null
  }

  return metadata as Record<string, unknown>
}

function getMetadataStringValue(
  metadata: Record<string, unknown> | null,
  key: string,
) {
  const value = metadata?.[key]
  return typeof value === "string" && value.trim() ? value : null
}

function getActionLabel(action: string) {
  return action
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function getUserLabel(
  user: AuditUserPreview | null | undefined,
  fallback: string,
) {
  if (!user) {
    return fallback
  }

  return user.fullName || user.email || fallback
}

function resolveAuthorizerUserId(log: AuditLogWithActor) {
  const metadata = getMetadataRecord(log.metadata)

  for (const key of authorizerMetadataKeys) {
    const value = getMetadataStringValue(metadata, key)
    if (value) {
      return value
    }
  }

  if (
    log.actorUserId &&
    authorizationActionFragments.some((fragment) =>
      log.action.includes(fragment),
    )
  ) {
    return log.actorUserId
  }

  return null
}

function getAuthorizationRole(log: AuditLogWithActor) {
  const metadata = getMetadataRecord(log.metadata)

  if (getMetadataStringValue(metadata, "approvedByUserId")) return "Approver"
  if (getMetadataStringValue(metadata, "reviewedByUserId")) return "Reviewer"
  if (getMetadataStringValue(metadata, "respondedByUserId")) return "Responder"
  if (getMetadataStringValue(metadata, "receivedByUserId")) return "Receiver"
  if (
    getMetadataStringValue(metadata, "authorizedByUserId") ||
    getMetadataStringValue(metadata, "authorizerUserId")
  ) {
    return "Authorizer"
  }
  if (log.action.includes("approved")) return "Approver"
  if (log.action.includes("rejected") || log.action.includes("reviewed")) {
    return "Reviewer"
  }
  if (log.action.includes("posted")) return "Poster"
  if (log.action.includes("disbursed")) return "Disbursement authorizer"
  if (log.action.includes("waived") || log.action.includes("settled")) {
    return "Settlement authorizer"
  }

  return "Not recorded"
}

function stringifyMetadataValue(value: unknown) {
  if (value === null || value === undefined) return "empty"
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  return JSON.stringify(value)
}

function getMetadataSummary(metadata: unknown) {
  const record = getMetadataRecord(metadata)
  if (!record) return []

  const summary: string[] = []
  const previousStatus = getMetadataStringValue(record, "previousStatus")
  const nextStatus =
    getMetadataStringValue(record, "nextStatus") ??
    getMetadataStringValue(record, "status")

  if (previousStatus && nextStatus && previousStatus !== nextStatus) {
    summary.push(`Status: ${previousStatus} -> ${nextStatus}`)
  }

  const previous = getMetadataRecord(record.previous)
  const next = getMetadataRecord(record.next)

  if (previous && next) {
    for (const key of Object.keys(next)) {
      if (key === "status" && previousStatus && nextStatus) {
        continue
      }
      const before = previous[key]
      const after = next[key]
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        summary.push(
          `${key}: ${stringifyMetadataValue(before)} -> ${stringifyMetadataValue(after)}`,
        )
      }
      if (summary.length >= 6) break
    }
  }

  for (const key of [
    "adjustmentReason",
    "resolutionSummary",
    "reviewNotes",
    "notes",
    "memberId",
    "loanId",
    "receiptId",
    "supportCaseId",
  ]) {
    const value = getMetadataStringValue(record, key)
    if (value && !summary.some((item) => item.includes(value))) {
      summary.push(`${getActionLabel(key)}: ${value}`)
    }
    if (summary.length >= 6) break
  }

  return summary
}

function normalizeActivityReportEvent(
  log: AuditLogWithActor,
  usersById: Map<string, AuditUserPreview>,
): ActivityReportEvent {
  const actorUser = log.actorUser ?? null
  const authorizerUserId = resolveAuthorizerUserId(log)
  const authorizerUser = authorizerUserId
    ? usersById.get(authorizerUserId) ??
      (authorizerUserId === log.actorUserId ? actorUser : null)
    : null

  return {
    action: log.action,
    actionLabel: getActionLabel(log.action),
    actorEmail: actorUser?.email ?? null,
    actorLabel: getUserLabel(actorUser, log.actorType),
    actorName: actorUser?.fullName ?? null,
    actorType: log.actorType,
    actorUserId: log.actorUserId ?? null,
    authorizationRole: getAuthorizationRole(log),
    authorizerEmail: authorizerUser?.email ?? null,
    authorizerLabel: authorizerUserId
      ? getUserLabel(authorizerUser, authorizerUserId)
      : "Not recorded",
    authorizerName: authorizerUser?.fullName ?? null,
    authorizerUserId,
    entityId: log.entityId ?? null,
    entityType: log.entityType,
    id: log.id,
    metadataSummary: getMetadataSummary(log.metadata),
    occurredAt: log.occurredAt,
  }
}

export async function listActivityReportEvents(
  tenantId: string,
  input?: Parameters<typeof listAuditLogs>[1],
  prismaOverride?: PrismaClient,
): Promise<ActivityReportEvent[]> {
  const prisma = prismaOverride ?? createPrismaClient()

  if (!prisma) {
    return []
  }

  const logs = (await listAuditLogs(
    tenantId,
    input,
    prisma,
  )) as AuditLogWithActor[]
  const authorizerUserIds = Array.from(
    new Set(
      logs
        .map(resolveAuthorizerUserId)
        .filter((value): value is string => Boolean(value)),
    ),
  )
  const users =
    authorizerUserIds.length > 0
      ? await prisma.user.findMany({
          select: {
            email: true,
            fullName: true,
            id: true,
          },
          where: {
            id: {
              in: authorizerUserIds,
            },
            tenantId,
          },
        })
      : []
  const usersById = new Map(users.map((user) => [user.id, user]))

  return logs.map((log) => normalizeActivityReportEvent(log, usersById))
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
  deliveredRecipients?: string[]
  errorMessage?: string
  messageId: string
  notificationType: string
  recipient: string
  routingMode?: "console" | "global_test_override" | "live" | "qa_domain"
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
        deliveredRecipients: input.deliveredRecipients ?? [input.recipient],
        errorMessage: input.errorMessage ?? null,
        notificationType: input.notificationType,
        recipient: input.recipient,
        routingMode: input.routingMode ?? "live",
        source: input.source,
        status: input.status,
      },
      tenantId: input.tenantId,
    },
    prismaOverride,
  )
}
