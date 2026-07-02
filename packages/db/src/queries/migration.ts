import type { PrismaClient } from "../../generated/prisma/client"
import {
  buildInitialMigrationSnapshot,
  type InitialMigrationStatus,
} from "@halaalvest/domain"
import { createPrismaClient } from "../prisma"
import { createAuditLogEntry } from "./audit"
import { getTenantById } from "./tenants"

type InitialMigrationLifecycleInput = {
  actorUserId: string
  tenantId: string
}

function isTerminalInitialMigrationStatus(
  status: InitialMigrationStatus | null | undefined
) {
  return status === "finalized" || status === "live_operations"
}

function getActiveEmergencyUnlock(unlockUntil: Date | null | undefined) {
  if (!unlockUntil) {
    return false
  }

  return new Date(unlockUntil).getTime() > Date.now()
}

function startOfMonth(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1))
}

function monthKeyFromDate(value: Date) {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`
}

function inclusiveMonthDifference(start: Date, end: Date) {
  return (
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - start.getUTCMonth()) +
    1
  )
}

function getExpectedBackfillMonthKeys(input: {
  joinedAt: Date
  tenantStartDate: Date | null | undefined
}) {
  const start = startOfMonth(
    input.tenantStartDate && input.tenantStartDate > input.joinedAt
      ? input.tenantStartDate
      : input.joinedAt
  )
  const end = startOfMonth(new Date())
  const monthCount = inclusiveMonthDifference(start, end)

  if (monthCount <= 0) return []

  return Array.from({ length: monthCount }, (_, index) => {
    const month = new Date(start)
    month.setUTCMonth(month.getUTCMonth() + index)
    return monthKeyFromDate(month)
  })
}

export async function getTenantInitialMigrationState(
  tenantId: string,
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any

  if (!prisma) {
    const tenant = getTenantById(tenantId)

    return {
      counts: {
        appliedBackfillBatches: 0,
        appliedBackfillMonths: 0,
        appliedBackfillMembers: 0,
        businessProfitPools: 1,
        chargeScheduleVersions: 2,
        legacyLoans: 1,
        memberProfiles: tenant?.memberCount ?? 0,
        shareCapitalPlans: 1,
      },
      snapshot: buildInitialMigrationSnapshot({
        hasBusinessProfitPools: true,
        hasChargeSchedules: true,
        hasFinalizationConfirmed: false,
        hasFinanceStartDate: Boolean(tenant?.startDate),
        hasLegacyLoansReviewed: true,
        hasMemberLedgerBackfill: false,
        hasMemberProfiles: Boolean(tenant?.memberCount),
        hasShareCapitalPlan: true,
        status: "member_migration_in_progress",
      }),
    }
  }

  const [
    tenant,
    chargeScheduleVersions,
    businessProfitPools,
    reviewedBusinessProfitEntries,
    shareCapitalPlans,
    memberProfiles,
    liveLegacyLoans,
    legacyLoanMigrationDrafts,
    legacyLoanReviewMarkers,
    businessProfitReviewMarkers,
    businessProfitPolicy,
    appliedBackfillBatches,
    appliedBackfillBatchMembers,
    appliedBackfillMonths,
  ] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        initialMigrationStatus: true,
        migrationEmergencyUnlockUntil: true,
        migrationFinalizedAt: true,
        startDate: true,
      },
    }),
    prisma.chargeDefinitionVersion.count({
      where: { tenantId },
    }),
    prisma.shareBusinessProfitEntry.count({
      where: { tenantId },
    }),
    prisma.shareBusinessProfitEntry.count({
      where: {
        tenantId,
        linkedDividendPeriodId: {
          not: null,
        },
      },
    }),
    prisma.tenantShareStructureVersion.count({
      where: { tenantId },
    }),
    prisma.member.findMany({
      select: {
        id: true,
        joinedAt: true,
      },
      where: { tenantId },
    }),
    prisma.loan.count({
      where: { tenantId },
    }),
    typeof prisma.legacyLoanMigrationDraft?.count === "function"
      ? prisma.legacyLoanMigrationDraft.count({
          where: { tenantId },
        })
      : 0,
    typeof prisma.auditLog?.count === "function"
      ? prisma.auditLog.count({
          where: {
            action: "migration.legacy_loans.reviewed",
            entityType: "Tenant",
            tenantId,
          },
        })
      : 0,
    typeof prisma.auditLog?.count === "function"
      ? prisma.auditLog.count({
          where: {
            action: "migration.business_profit_pools.reviewed",
            entityType: "Tenant",
            tenantId,
          },
        })
      : 0,
    typeof prisma.tenantBusinessPolicy?.findUnique === "function"
      ? prisma.tenantBusinessPolicy.findUnique({
          select: {
            historicalProfitMigrationMode: true,
          },
          where: { tenantId },
        })
      : null,
    prisma.backfillBatch.count({
      where: {
        tenantId,
        status: "applied",
      },
    }),
    prisma.backfillBatch.findMany({
      select: {
        memberId: true,
      },
      where: {
        tenantId,
        status: "applied",
      },
    }),
    typeof prisma.appliedBackfillMonth?.findMany === "function"
      ? prisma.appliedBackfillMonth.findMany({
          select: {
            memberId: true,
            month: true,
          },
          where: { tenantId },
        })
      : [],
  ])

  const hasFinanceStartDate = Boolean(tenant?.startDate)
  const hasChargeSchedules = chargeScheduleVersions > 0
  const hasNoHistoricalBusinessProfits =
    businessProfitReviewMarkers > 0 ||
    businessProfitPolicy?.historicalProfitMigrationMode ===
      "no_historical_business_profit"
  const hasBusinessProfitPools =
    businessProfitPools > 0 || hasNoHistoricalBusinessProfits
  const hasBusinessProfitSeasons =
    businessProfitPools === 0 ||
    reviewedBusinessProfitEntries >= businessProfitPools
  const hasShareCapitalPlan = shareCapitalPlans > 0
  const memberProfileCount = memberProfiles.length
  const hasMemberProfiles = memberProfileCount > 0
  const legacyLoans = liveLegacyLoans + legacyLoanMigrationDrafts
  const hasLegacyLoansReviewed = legacyLoans > 0 || legacyLoanReviewMarkers > 0
  const appliedMonthKeysByMemberId = new Map<string, Set<string>>()

  for (const month of appliedBackfillMonths) {
    const memberMonths =
      appliedMonthKeysByMemberId.get(month.memberId) ?? new Set<string>()
    memberMonths.add(monthKeyFromDate(month.month))
    appliedMonthKeysByMemberId.set(month.memberId, memberMonths)
  }

  const appliedBackfillBatchMemberIds = new Set(
    appliedBackfillBatchMembers.map(
      (batch: { memberId: string }) => batch.memberId
    )
  )
  const appliedBackfillMonthMemberIds = new Set(
    memberProfiles
      .filter((member: { id: string; joinedAt: Date }) => {
        const expectedMonthKeys = getExpectedBackfillMonthKeys({
          joinedAt: member.joinedAt,
          tenantStartDate: tenant?.startDate ?? null,
        })
        const appliedMonthKeys = appliedMonthKeysByMemberId.get(member.id)

        return (
          expectedMonthKeys.length > 0 &&
          expectedMonthKeys.every((monthKey) => appliedMonthKeys?.has(monthKey))
        )
      })
      .map((member: { id: string }) => member.id)
  )
  const appliedBackfillMemberIds = new Set([
    ...appliedBackfillBatchMemberIds,
    ...appliedBackfillMonthMemberIds,
  ])
  const appliedBackfillMembers = appliedBackfillMemberIds.size
  const hasMemberLedgerBackfill =
    hasMemberProfiles && appliedBackfillMembers >= memberProfileCount
  const historicalSetupComplete =
    hasFinanceStartDate &&
    hasChargeSchedules &&
    hasBusinessProfitPools &&
    hasBusinessProfitSeasons &&
    hasShareCapitalPlan &&
    hasLegacyLoansReviewed
  const derivedStatus: InitialMigrationStatus = !hasFinanceStartDate
    ? "not_started"
    : !historicalSetupComplete
      ? "historical_setup_in_progress"
      : !hasMemberLedgerBackfill
        ? "member_migration_in_progress"
        : "migration_review"
  const persistedStatus = tenant?.initialMigrationStatus as
    | InitialMigrationStatus
    | null
    | undefined
  const status = isTerminalInitialMigrationStatus(persistedStatus)
    ? persistedStatus
    : derivedStatus
  const emergencyUnlockActive = getActiveEmergencyUnlock(
    tenant?.migrationEmergencyUnlockUntil
  )
  const hasFinalizationConfirmed =
    isTerminalInitialMigrationStatus(status) ||
    Boolean(tenant?.migrationFinalizedAt)

  return {
    counts: {
      appliedBackfillBatches,
      appliedBackfillMonths: appliedBackfillMonths.length,
      appliedBackfillMembers,
      businessProfitPools,
      businessProfitSeasons: reviewedBusinessProfitEntries,
      chargeScheduleVersions,
      legacyLoans,
      memberProfiles: memberProfileCount,
      shareCapitalPlans,
    },
    snapshot: buildInitialMigrationSnapshot({
      emergencyUnlockActive,
      hasBusinessProfitPools,
      hasBusinessProfitSeasons,
      hasChargeSchedules,
      hasFinalizationConfirmed,
      hasFinanceStartDate,
      hasLegacyLoansReviewed,
      hasMemberLedgerBackfill,
      hasMemberProfiles,
      hasShareCapitalPlan,
      status,
    }),
  }
}

export async function finalizeTenantInitialMigration(
  input: InitialMigrationLifecycleInput,
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  const migrationState = await getTenantInitialMigrationState(
    input.tenantId,
    prisma
  )

  if (
    migrationState.snapshot.status === "finalized" ||
    migrationState.snapshot.status === "live_operations"
  ) {
    throw new Error(
      "Initial migration has already been finalized for this cooperative."
    )
  }

  const missingStepKeys = migrationState.snapshot.missingStepKeys.filter(
    (stepKey) => stepKey !== "finalization"
  )

  if (missingStepKeys.length > 0) {
    throw new Error(
      `Initial migration cannot be finalized until these steps are complete: ${missingStepKeys.join(", ")}.`
    )
  }

  const finalizedAt = new Date()
  const tenant = await prisma.tenant.update({
    data: {
      initialMigrationStatus: "live_operations",
      migrationEmergencyUnlockReason: null,
      migrationEmergencyUnlockUntil: null,
      migrationEmergencyUnlockedByUserId: null,
      migrationFinalizedAt: finalizedAt,
      migrationFinalizedByUserId: input.actorUserId,
    },
    where: { id: input.tenantId },
  })

  await createAuditLogEntry(
    {
      action: "migration.initial.finalized",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityId: input.tenantId,
      entityType: "Tenant",
      metadata: {
        finalizedAt: finalizedAt.toISOString(),
        nextStatus: "live_operations",
      },
      tenantId: input.tenantId,
    },
    prisma
  )

  return tenant
}

export async function markTenantLegacyLoansReviewed(
  input: InitialMigrationLifecycleInput & {
    notes?: string | null
  },
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  const migrationState = await getTenantInitialMigrationState(
    input.tenantId,
    prisma
  )

  if (!migrationState.snapshot.canUseMigrationTools) {
    throw new Error("Initial migration tools are locked for this cooperative.")
  }

  if (
    migrationState.counts.appliedBackfillBatches > 0 ||
    migrationState.counts.appliedBackfillMembers > 0 ||
    migrationState.counts.appliedBackfillMonths > 0
  ) {
    throw new Error(
      "Legacy loan review is locked because member ledger backfill has already started."
    )
  }

  await createAuditLogEntry(
    {
      action: "migration.legacy_loans.reviewed",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityId: input.tenantId,
      entityType: "Tenant",
      metadata: {
        notes: input.notes?.trim() || null,
        reviewedAsNoLegacyLoans: true,
      },
      tenantId: input.tenantId,
    },
    prisma
  )
}

export async function markTenantBusinessProfitPoolsReviewed(
  input: InitialMigrationLifecycleInput & {
    notes?: string | null
  },
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  const migrationState = await getTenantInitialMigrationState(
    input.tenantId,
    prisma
  )

  if (!migrationState.snapshot.canUseMigrationTools) {
    throw new Error("Initial migration tools are locked for this cooperative.")
  }

  if (
    migrationState.counts.appliedBackfillBatches > 0 ||
    migrationState.counts.appliedBackfillMembers > 0 ||
    migrationState.counts.appliedBackfillMonths > 0
  ) {
    throw new Error(
      "Business profit pool review is locked because member ledger backfill has already started."
    )
  }

  if (typeof prisma.tenantBusinessPolicy?.upsert === "function") {
    await prisma.tenantBusinessPolicy.upsert({
      create: {
        historicalProfitMigrationMode: "no_historical_business_profit",
        tenantId: input.tenantId,
      },
      update: {
        historicalProfitMigrationMode: "no_historical_business_profit",
      },
      where: { tenantId: input.tenantId },
    })
  }

  await createAuditLogEntry(
    {
      action: "migration.business_profit_pools.reviewed",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityId: input.tenantId,
      entityType: "Tenant",
      metadata: {
        notes: input.notes?.trim() || null,
        reviewedAsNoBusinessProfitPools: true,
      },
      tenantId: input.tenantId,
    },
    prisma
  )
}

export async function setTenantInitialMigrationEmergencyUnlock(
  input: InitialMigrationLifecycleInput & {
    reason: string
    unlockUntil: Date
  },
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  const migrationState = await getTenantInitialMigrationState(
    input.tenantId,
    prisma
  )

  if (migrationState.snapshot.canUseMigrationTools) {
    throw new Error(
      "Emergency unlock is only available after initial migration has been finalized."
    )
  }

  if (
    Number.isNaN(input.unlockUntil.getTime()) ||
    input.unlockUntil.getTime() <= Date.now()
  ) {
    throw new Error("Emergency unlock expiry must be a future date and time.")
  }

  const tenant = await prisma.tenant.update({
    data: {
      migrationEmergencyUnlockReason: input.reason,
      migrationEmergencyUnlockUntil: input.unlockUntil,
      migrationEmergencyUnlockedByUserId: input.actorUserId,
    },
    where: { id: input.tenantId },
  })

  await createAuditLogEntry(
    {
      action: "migration.initial.emergency_unlocked",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityId: input.tenantId,
      entityType: "Tenant",
      metadata: {
        reason: input.reason,
        unlockUntil: input.unlockUntil.toISOString(),
      },
      tenantId: input.tenantId,
    },
    prisma
  )

  return tenant
}
