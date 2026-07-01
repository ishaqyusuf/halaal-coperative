import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { createAuditLogEntry } from "./audit"
import { getTenantInitialMigrationState } from "./migration"

async function assertMigrationAdjustmentMutationOpen(
  input: {
    memberId: string
    tenantId: string
  },
  prisma: PrismaClient,
) {
  const migrationState = await getTenantInitialMigrationState(
    input.tenantId,
    prisma,
  )

  if (
    !migrationState.snapshot.canUseMigrationTools &&
    !migrationState.snapshot.canUseLiveFinancialWrites
  ) {
    throw new Error(
      "Migration adjustments are locked because initial migration is finalized.",
    )
  }

  const [appliedMonths, appliedBatches] = await Promise.all([
    typeof (prisma as any).appliedBackfillMonth?.findMany === "function"
      ? (prisma as any).appliedBackfillMonth.findMany({
          select: { id: true },
          take: 1,
          where: {
            memberId: input.memberId,
            tenantId: input.tenantId,
          },
        })
      : [],
    typeof (prisma as any).backfillBatch?.findMany === "function"
      ? (prisma as any).backfillBatch.findMany({
          select: { id: true },
          take: 1,
          where: {
            memberId: input.memberId,
            status: "applied",
            tenantId: input.tenantId,
          },
        })
      : [],
  ])

  if (appliedMonths.length > 0 || appliedBatches.length > 0) {
    throw new Error(
      "This member's historical ledger has already been applied. Use correction workflows instead of migration adjustment edits.",
    )
  }
}

export async function listMigrationProfitAdjustmentOptions(
  tenantId: string,
  prismaOverride?: PrismaClient,
  memberId?: string | null,
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) return []

  if (typeof prisma.shareBusinessProfitEntry?.findMany !== "function") {
    return []
  }

  const entries = await prisma.shareBusinessProfitEntry.findMany({
    include: {
      allocations: true,
      migrationProfitAdjustments: true,
      shareBusiness: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [{ profitDate: "desc" }, { createdAt: "desc" }],
    where: { tenantId },
  })

  return entries.map((entry: any) => {
    const allocatableProfitAmount = Number(entry.allocatableProfitAmount ?? entry.profitAmount)
    const resolveAdjustmentAmount = (adjustment: any) =>
      adjustment.allocatedProfitAmount == null
        ? allocatableProfitAmount * (Number(adjustment.sharePercentage ?? 0) / 100)
        : Number(adjustment.allocatedProfitAmount)
    const totalAdjusted = (entry.migrationProfitAdjustments ?? []).reduce(
      (sum: number, adjustment: any) => sum + resolveAdjustmentAmount(adjustment),
      0,
    )
    const totalAllocated = (entry.allocations ?? []).reduce(
      (sum: number, allocation: any) => sum + Number(allocation.allocatedProfitAmount),
      0,
    )
    const memberAdjustedAmount = memberId
      ? (entry.migrationProfitAdjustments ?? [])
          .filter((adjustment: any) => adjustment.memberId === memberId)
          .reduce((sum: number, adjustment: any) => sum + resolveAdjustmentAmount(adjustment), 0)
      : 0
    const memberPublishedAmount = memberId
      ? (entry.allocations ?? [])
          .filter((allocation: any) => allocation.memberId === memberId)
          .reduce((sum: number, allocation: any) => sum + Number(allocation.allocatedProfitAmount), 0)
      : 0
    const totalOtherAdjusted = memberId
      ? (entry.migrationProfitAdjustments ?? [])
          .filter((adjustment: any) => adjustment.memberId !== memberId)
          .reduce((sum: number, adjustment: any) => sum + resolveAdjustmentAmount(adjustment), 0)
      : totalAdjusted
    const editableAvailableAmount = Math.max(
      0,
      allocatableProfitAmount - totalAllocated - totalOtherAdjusted,
    )

    return {
      id: entry.id,
      availableAmount: Math.max(0, allocatableProfitAmount - totalAdjusted - totalAllocated),
      allocatableProfitAmount,
      businessName: entry.shareBusiness?.name ?? "Business profit",
      editableAvailableAmount,
      expenseAmount: Number(entry.expenseAmount ?? 0),
      memberAllocatedAmount: memberAdjustedAmount + memberPublishedAmount,
      memberMigrationAdjustmentAmount: memberAdjustedAmount,
      memberPublishedAllocationAmount: memberPublishedAmount,
      profitAmount: Number(entry.profitAmount),
      profitDate: entry.profitDate,
      totalDisbursedAmount: totalAdjusted + totalAllocated,
    }
  })
}

export async function upsertMigrationProfitAdjustment(
  input: {
    actorUserId: string
    allocatedProfitAmount?: number | null
    memberId: string
    notes?: string | null
    profitEntryId: string
    sharePercentage?: number | null
    tenantId: string
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")
  await assertMigrationAdjustmentMutationOpen(input, prisma)

  if (typeof prisma.migrationProfitAdjustment?.upsert !== "function") {
    throw new Error("Migration profit adjustments require the latest Prisma migration and generated client.")
  }

  if (input.allocatedProfitAmount == null && input.sharePercentage == null) {
    throw new Error("Set a member profit amount or a share percentage.")
  }

  if (input.allocatedProfitAmount != null && input.sharePercentage != null) {
    throw new Error("Set either a member profit amount or a share percentage, not both.")
  }

  if (input.allocatedProfitAmount != null && input.allocatedProfitAmount < 0) {
    throw new Error("Member profit amount cannot be negative.")
  }

  if (input.sharePercentage != null && (input.sharePercentage < 0 || input.sharePercentage > 100)) {
    throw new Error("Share percentage must be between 0 and 100.")
  }

  const profitEntry = await prisma.shareBusinessProfitEntry.findFirst({
    include: {
      allocations: true,
      migrationProfitAdjustments: true,
    },
    where: {
      id: input.profitEntryId,
      tenantId: input.tenantId,
    },
  })

  if (!profitEntry) {
    throw new Error("Business profit entry not found.")
  }

  const adjustedAmount =
    input.allocatedProfitAmount ??
    Number(profitEntry.allocatableProfitAmount ?? profitEntry.profitAmount) * ((input.sharePercentage ?? 0) / 100)
  const allocatableProfitAmount = Number(profitEntry.allocatableProfitAmount ?? profitEntry.profitAmount)

  if (adjustedAmount > allocatableProfitAmount) {
    throw new Error("Member profit adjustment cannot exceed the allocatable profit amount.")
  }

  const totalAllocated = (profitEntry.allocations ?? []).reduce(
    (sum: number, allocation: any) => sum + Number(allocation.allocatedProfitAmount),
    0,
  )
  const totalOtherAdjusted = (profitEntry.migrationProfitAdjustments ?? []).reduce(
    (sum: number, adjustment: any) => {
      if (adjustment.memberId === input.memberId) {
        return sum
      }

      const amount =
        adjustment.allocatedProfitAmount == null
          ? allocatableProfitAmount * (Number(adjustment.sharePercentage ?? 0) / 100)
          : Number(adjustment.allocatedProfitAmount)

      return sum + amount
    },
    0,
  )
  const availableAmount = Math.max(0, allocatableProfitAmount - totalAllocated - totalOtherAdjusted)

  if (adjustedAmount > availableAmount) {
    throw new Error("Member profit adjustment cannot exceed the remaining available profit amount.")
  }

  const data = {
    allocatedProfitAmount: input.allocatedProfitAmount ?? null,
    createdByUserId: input.actorUserId,
    memberId: input.memberId,
    notes: input.notes?.trim() || null,
    profitEntryId: input.profitEntryId,
    sharePercentage: input.sharePercentage ?? null,
    tenantId: input.tenantId,
  }
  const adjustment = await prisma.migrationProfitAdjustment.upsert({
    create: data,
    update: data,
    where: {
      tenantId_memberId_profitEntryId: {
        memberId: input.memberId,
        profitEntryId: input.profitEntryId,
        tenantId: input.tenantId,
      },
    },
  })

  await createAuditLogEntry({
    action: "migration.profit_adjustment.upserted",
    actorType: "user",
    actorUserId: input.actorUserId,
    entityId: adjustment.id,
    entityType: "MigrationProfitAdjustment",
    metadata: {
      adjustedAmount,
      allocatedProfitAmount: input.allocatedProfitAmount ?? null,
      memberId: input.memberId,
      profitEntryId: input.profitEntryId,
      sharePercentage: input.sharePercentage ?? null,
    },
    tenantId: input.tenantId,
  }, prisma)

  return adjustment
}
