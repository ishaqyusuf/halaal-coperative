import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError } from "../query-error"
import { createAuditLogEntry } from "./audit"
import { createMemberShareLedgerEntry } from "./tenant-finance"

export type HistoricalMemberSharePurchaseRow = {
  createdAt: Date
  createdByUserId: string | null
  id: string
  member: {
    fullName: string
    memberNumber: string
  }
  memberId: string
  notes: string | null
  paidAt: Date
  postedShareLedgerEntryId: string | null
  shareCapitalAmount: number
  shareUnits: number
  tenantId: string
  unitAmountSnapshot: number
  updatedAt: Date
}

function startOfDay(value: Date) {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
  )
}

function purchaseInclude() {
  return {
    member: {
      select: {
        fullName: true,
        memberNumber: true,
      },
    },
  } as const
}

function normalizeHistoricalSharePurchase(
  row: any
): HistoricalMemberSharePurchaseRow {
  return {
    createdAt: row.createdAt,
    createdByUserId: row.createdByUserId ?? null,
    id: row.id,
    member: {
      fullName: row.member?.fullName ?? "Member",
      memberNumber: row.member?.memberNumber ?? "",
    },
    memberId: row.memberId,
    notes: row.notes ?? null,
    paidAt: row.paidAt,
    postedShareLedgerEntryId: row.postedShareLedgerEntryId ?? null,
    shareCapitalAmount: Number(row.shareCapitalAmount ?? 0),
    shareUnits: Number(row.shareUnits ?? 0),
    tenantId: row.tenantId,
    unitAmountSnapshot: Number(row.unitAmountSnapshot ?? 0),
    updatedAt: row.updatedAt,
  }
}

function assertShareUnits(value: number) {
  if (!Number.isInteger(value) || value <= 0) {
    throw ExpectedQueryError.validation(
      "Share units must be a positive whole number."
    )
  }
}

async function readUnitShareAmount(tenantId: string, prisma: any) {
  const policy = await prisma.tenantPolicy.findUnique({
    where: { tenantId },
  })

  if (policy?.shareConfigurationMode !== "unit_based") {
    throw ExpectedQueryError.precondition(
      "Historical share purchases are only available for unit-based share configuration."
    )
  }

  const unitAmount = Number(policy.shareUnitAmount ?? 0)
  if (!Number.isFinite(unitAmount) || unitAmount <= 0) {
    throw ExpectedQueryError.precondition(
      "Tenant share unit amount must be configured first."
    )
  }

  return unitAmount
}

async function assertMemberBelongsToTenant(
  input: {
    memberId: string
    tenantId: string
  },
  prisma: any
) {
  const member = await prisma.member.findFirst({
    select: { id: true },
    where: {
      id: input.memberId,
      tenantId: input.tenantId,
    },
  })

  if (!member) {
    throw ExpectedQueryError.permission(
      "Share purchase member does not belong to this tenant."
    )
  }
}

export async function listHistoricalMemberSharePurchases(
  input: {
    memberId?: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<HistoricalMemberSharePurchaseRow[]> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) return []

  if (typeof prisma.historicalMemberSharePurchase?.findMany !== "function") {
    return []
  }

  const rows = await prisma.historicalMemberSharePurchase.findMany({
    include: purchaseInclude(),
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
    where: {
      tenantId: input.tenantId,
      ...(input.memberId ? { memberId: input.memberId } : {}),
    },
  })

  return rows.map(normalizeHistoricalSharePurchase)
}

export async function createHistoricalMemberSharePurchase(
  input: {
    actorUserId: string
    memberId: string
    notes?: string | null
    paidAt: Date
    shareUnits: number
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<HistoricalMemberSharePurchaseRow> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  if (typeof prisma.historicalMemberSharePurchase?.create !== "function") {
    throw new Error(
      "Historical share purchases require the latest Prisma migration and generated client."
    )
  }

  assertShareUnits(input.shareUnits)

  return prisma.$transaction(async (tx: any) => {
    await assertMemberBelongsToTenant(input, tx)
    const unitAmount = await readUnitShareAmount(input.tenantId, tx)
    const paidAt = startOfDay(input.paidAt)
    const shareCapitalAmount = input.shareUnits * unitAmount
    const purchase = await tx.historicalMemberSharePurchase.create({
      data: {
        createdByUserId: input.actorUserId,
        memberId: input.memberId,
        notes: input.notes?.trim() || null,
        paidAt,
        shareCapitalAmount,
        shareUnits: input.shareUnits,
        tenantId: input.tenantId,
        unitAmountSnapshot: unitAmount,
      },
      include: purchaseInclude(),
    })
    const ledgerEntry = await createMemberShareLedgerEntry(
      {
        amount: shareCapitalAmount,
        createdByUserId: input.actorUserId,
        effectiveDate: paidAt,
        memberId: input.memberId,
        notes: "Historical unit-share purchase",
        sourceId: purchase.id,
        sourceType: "backfill",
        tenantId: input.tenantId,
      },
      tx
    )
    const updated = await tx.historicalMemberSharePurchase.update({
      data: {
        postedShareLedgerEntryId: ledgerEntry.id,
      },
      include: purchaseInclude(),
      where: {
        id: purchase.id,
      },
    })

    await createAuditLogEntry(
      {
        action: "migration.share_purchase.created",
        actorType: "user",
        actorUserId: input.actorUserId,
        entityId: purchase.id,
        entityType: "HistoricalMemberSharePurchase",
        metadata: {
          memberId: input.memberId,
          paidAt: paidAt.toISOString(),
          postedShareLedgerEntryId: ledgerEntry.id,
          shareCapitalAmount,
          shareUnits: input.shareUnits,
          unitAmountSnapshot: unitAmount,
        },
        tenantId: input.tenantId,
      },
      tx
    )

    return normalizeHistoricalSharePurchase(updated)
  })
}
