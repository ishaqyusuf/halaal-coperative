import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { createAuditLogEntry } from "./audit"
import { assertMigrationAdjustmentMutationOpen } from "./migration-backfill-adjustments"

export type MemberActivityEventStatus = "active" | "inactive"

function startOfMonth(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1))
}

function assertMemberActivityStatus(
  status: string
): asserts status is MemberActivityEventStatus {
  if (status !== "active" && status !== "inactive") {
    throw new Error("Member activity status must be active or inactive.")
  }
}

export async function listMemberActivityEvents(
  input: {
    memberId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma || typeof prisma.memberActivityEvent?.findMany !== "function") {
    return []
  }

  return prisma.memberActivityEvent.findMany({
    where: {
      memberId: input.memberId,
      tenantId: input.tenantId,
    },
    orderBy: { effectiveMonth: "asc" },
  })
}

export async function upsertMemberActivityEvent(
  input: {
    actorUserId: string
    effectiveMonth: Date
    memberId: string
    notes?: string | null
    reason?: string | null
    status: MemberActivityEventStatus
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")
  await assertMigrationAdjustmentMutationOpen(input, prisma)

  if (typeof prisma.memberActivityEvent?.upsert !== "function") {
    throw new Error(
      "Member activity events require the latest Prisma migration and generated client."
    )
  }

  assertMemberActivityStatus(input.status)

  const effectiveMonth = startOfMonth(input.effectiveMonth)
  const data = {
    createdByUserId: input.actorUserId,
    effectiveMonth,
    memberId: input.memberId,
    notes: input.notes?.trim() || null,
    reason: input.reason?.trim() || null,
    status: input.status,
    tenantId: input.tenantId,
  }
  const event = await prisma.memberActivityEvent.upsert({
    create: data,
    update: data,
    where: {
      tenantId_memberId_effectiveMonth: {
        effectiveMonth,
        memberId: input.memberId,
        tenantId: input.tenantId,
      },
    },
  })

  await createAuditLogEntry(
    {
      action: "member.activity_event.upserted",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityId: event.id,
      entityType: "MemberActivityEvent",
      metadata: {
        effectiveMonth: effectiveMonth.toISOString(),
        memberId: input.memberId,
        reason: data.reason,
        status: input.status,
      },
      tenantId: input.tenantId,
    },
    prisma
  )

  return event
}

export async function deleteMemberActivityEvent(
  input: {
    actorUserId: string
    eventId: string
    memberId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")
  await assertMigrationAdjustmentMutationOpen(input, prisma)

  const event = await prisma.memberActivityEvent.findFirst({
    where: {
      id: input.eventId,
      memberId: input.memberId,
      tenantId: input.tenantId,
    },
  })

  if (!event) {
    throw new Error("Member activity event not found.")
  }

  await prisma.memberActivityEvent.delete({
    where: { id: input.eventId },
  })

  await createAuditLogEntry(
    {
      action: "member.activity_event.deleted",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityId: input.eventId,
      entityType: "MemberActivityEvent",
      metadata: {
        effectiveMonth: event.effectiveMonth.toISOString(),
        memberId: input.memberId,
        status: event.status,
      },
      tenantId: input.tenantId,
    },
    prisma
  )
}
