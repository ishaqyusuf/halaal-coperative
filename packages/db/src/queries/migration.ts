import type {
  PrismaClient,
  TenantBusinessPolicy,
} from "../../generated/prisma/client"
import {
  buildInitialMigrationSnapshot,
  getBusinessProfitSeasonPeriod,
  type InitialMigrationStepKey,
  type InitialMigrationStatus,
} from "@halaalvest/domain"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError } from "../query-error"
import { isPrismaMissingColumnError } from "../prisma-errors"
import { createAuditLogEntry } from "./audit"
import { readOptionalTenantBusinessPolicy } from "./tenant-business-policy"
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

function getMissingGettingStartedSetupStepKeys(
  missingStepKeys: InitialMigrationStepKey[]
) {
  const requiredSetupStepKeys = new Set<InitialMigrationStepKey>([
    "migration_setup_mode",
    "finance_start_date",
    "charge_schedules",
    "business_profit_pools",
    "business_profit_seasons",
  ])

  return missingStepKeys.filter((stepKey) => requiredSetupStepKeys.has(stepKey))
}

async function readTenantPolicySetupSettings(prisma: any, tenantId: string) {
  if (typeof prisma.tenantPolicy?.findUnique !== "function") {
    return {
      hasMigrationSetupMode: false,
      migrationSetupMode: "historical_backfill" as const,
      shareConfigurationMode: "monthly_history" as const,
    }
  }

  try {
    const policy = await prisma.tenantPolicy.findUnique({
      select: {
        migrationSetupMode: true,
        shareConfigurationMode: true,
      },
      where: { tenantId },
    })

    return {
      hasMigrationSetupMode: Boolean(policy?.migrationSetupMode),
      migrationSetupMode:
        policy?.migrationSetupMode === "brought_forward"
          ? ("brought_forward" as const)
          : ("historical_backfill" as const),
      shareConfigurationMode:
        policy?.shareConfigurationMode === "unit_based"
          ? ("unit_based" as const)
          : ("monthly_history" as const),
    }
  } catch (error) {
    if (isPrismaMissingColumnError(error)) {
      return {
        hasMigrationSetupMode: false,
        migrationSetupMode: "historical_backfill" as const,
        shareConfigurationMode: "monthly_history" as const,
      }
    }

    throw error
  }
}

function getActiveEmergencyUnlock(unlockUntil: Date | null | undefined) {
  if (!unlockUntil) {
    return false
  }

  return new Date(unlockUntil).getTime() > Date.now()
}

function startOfTodayUtc() {
  const now = new Date()

  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )
}

function startOfMonth(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1))
}

function monthKeyFromDate(value: Date) {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`
}

function monthDifference(start: Date, end: Date) {
  return (
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - start.getUTCMonth())
  )
}

/**
 * Historical backfill covers closed months only: from the later of the
 * tenant start and member join month up to, but excluding, the `asOf` month.
 * The current month belongs to normal monthly-record workflows.
 */
export function getExpectedMemberBackfillMonthKeys(input: {
  asOf?: Date
  joinedAt: Date
  tenantStartDate: Date | null | undefined
}) {
  const start = startOfMonth(
    input.tenantStartDate && input.tenantStartDate > input.joinedAt
      ? input.tenantStartDate
      : input.joinedAt
  )
  const end = startOfMonth(input.asOf ?? new Date())
  const monthCount = monthDifference(start, end)

  if (monthCount <= 0) return []

  return Array.from({ length: monthCount }, (_, index) => {
    const month = new Date(start)
    month.setUTCMonth(month.getUTCMonth() + index)
    return monthKeyFromDate(month)
  })
}

export function hasClosedHistoricalMonths(
  startDate: Date | null | undefined,
  asOf = new Date()
) {
  if (!startDate) return false

  return monthDifference(startOfMonth(startDate), startOfMonth(asOf)) > 0
}

/**
 * The write gates from the migration snapshot, read from the tenant row only.
 * `canUseLiveFinancialWrites` and `canUseMigrationTools` depend only on the
 * persisted lifecycle status and the emergency unlock (the derived status is
 * never terminal), so guards that need nothing else use this one-row read
 * instead of the full ~17-query `getTenantInitialMigrationState`.
 */
export async function getTenantMigrationWriteAccess(
  tenantId: string,
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any

  if (!prisma) {
    return {
      canUseLiveFinancialWrites: false,
      canUseMigrationTools: true,
      emergencyUnlockActive: false,
    }
  }

  const tenant = await prisma.tenant.findUnique({
    select: {
      initialMigrationStatus: true,
      migrationEmergencyUnlockUntil: true,
    },
    where: { id: tenantId },
  })
  const terminal = isTerminalInitialMigrationStatus(
    tenant?.initialMigrationStatus as InitialMigrationStatus | null | undefined
  )
  const emergencyUnlockActive = getActiveEmergencyUnlock(
    tenant?.migrationEmergencyUnlockUntil
  )

  return {
    canUseLiveFinancialWrites: terminal,
    canUseMigrationTools: !terminal || emergencyUnlockActive,
    emergencyUnlockActive,
  }
}

export async function getTenantInitialMigrationState(
  tenantId: string,
  prismaOverride?: PrismaClient,
  options: { asOf?: Date } = {}
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  const asOf = options.asOf ?? new Date()

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
      requiresHistoricalBackfill: true,
      snapshot: buildInitialMigrationSnapshot({
        hasBusinessProfitPools: true,
        hasChargeSchedules: true,
        hasFinalizationConfirmed: false,
        hasFinanceStartDate: Boolean(tenant?.startDate),
        hasLegacyLoansReviewed: true,
        hasMemberLedgerBackfill: false,
        hasMemberProfiles: Boolean(tenant?.memberCount),
        hasShareCapitalPlan: true,
        requiresShareCapitalPlan: false,
        status: "member_migration_in_progress",
      }),
    }
  }

  const businessProfitPolicy = await readOptionalTenantBusinessPolicy<Pick<
    TenantBusinessPolicy,
    | "financialYearStartMonth"
    | "historicalProfitMigrationMode"
    | "profitDistributionFrequency"
  > | null>(prisma, (tenantBusinessPolicy) =>
    tenantBusinessPolicy.findUnique({
      select: {
        financialYearStartMonth: true,
        historicalProfitMigrationMode: true,
        profitDistributionFrequency: true,
      },
      where: { tenantId },
    })
  )
  const currentProfitSeason = getBusinessProfitSeasonPeriod(startOfTodayUtc(), {
    financialYearStartMonth: Number(
      businessProfitPolicy?.financialYearStartMonth ?? 1
    ),
    profitDistributionFrequency:
      businessProfitPolicy?.profitDistributionFrequency ?? "annual",
  })

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
    tenantPolicySetup,
    broughtForwardPendingPastProfitEntries,
    appliedBackfillBatches,
    appliedBackfillBatchMembers,
    appliedBackfillMonths,
    appliedOpeningBalanceMembers,
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
    readTenantPolicySetupSettings(prisma, tenantId),
    prisma.shareBusinessProfitEntry.count({
      where: {
        tenantId,
        profitDate: {
          lt: currentProfitSeason.periodStart,
        },
        status: "pending",
      },
    }),
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
    typeof prisma.memberOpeningBalance?.findMany === "function"
      ? prisma.memberOpeningBalance.findMany({
          select: {
            memberId: true,
          },
          where: {
            status: "applied",
            tenantId,
          },
        })
      : [],
  ])

  const hasFinanceStartDate = Boolean(tenant?.startDate)
  const hasChargeSchedules = chargeScheduleVersions > 0
  const hasNoHistoricalBusinessProfits =
    businessProfitReviewMarkers > 0 ||
    businessProfitPolicy?.historicalProfitMigrationMode ===
      "no_historical_business_profit"
  const hasMigrationSetupMode = tenantPolicySetup.hasMigrationSetupMode
  const isBroughtForwardSetup =
    tenantPolicySetup.migrationSetupMode === "brought_forward"
  const hasBusinessProfitPools =
    businessProfitPools > 0 || hasNoHistoricalBusinessProfits
  const hasBusinessProfitSeasons =
    businessProfitPools === 0 ||
    reviewedBusinessProfitEntries >= businessProfitPools
  const hasShareCapitalPlan =
    tenantPolicySetup.shareConfigurationMode === "unit_based" ||
    shareCapitalPlans > 0
  const memberProfileCount = memberProfiles.length
  const hasMemberProfiles = memberProfileCount > 0
  const legacyLoans = liveLegacyLoans + legacyLoanMigrationDrafts
  const hasLegacyLoansReviewed = legacyLoans > 0 || legacyLoanReviewMarkers > 0
  // A cooperative that starts in the current month has no closed month to
  // migrate, so it only needs historical tooling when history already exists.
  const tenantHasClosedHistoricalMonths = hasClosedHistoricalMonths(
    tenant?.startDate,
    asOf
  )
  const requiresHistoricalBackfill =
    !isBroughtForwardSetup &&
    (!hasFinanceStartDate ||
      tenantHasClosedHistoricalMonths ||
      legacyLoans > 0 ||
      appliedBackfillBatches > 0 ||
      appliedBackfillMonths.length > 0)
  const hasRequiredBusinessProfitPools =
    isBroughtForwardSetup || hasBusinessProfitPools
  const hasRequiredBusinessProfitSeasons = isBroughtForwardSetup
    ? broughtForwardPendingPastProfitEntries === 0 || hasBusinessProfitSeasons
    : hasBusinessProfitSeasons
  const hasRequiredLegacyLoansReviewed =
    isBroughtForwardSetup ||
    hasLegacyLoansReviewed ||
    (hasFinanceStartDate && !tenantHasClosedHistoricalMonths)
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
  const membersWithoutHistoricalMonthIds = new Set<string>()
  const appliedBackfillMonthMemberIds = new Set<string>()

  for (const member of memberProfiles as Array<{
    id: string
    joinedAt: Date
  }>) {
    const expectedMonthKeys = getExpectedMemberBackfillMonthKeys({
      asOf,
      joinedAt: member.joinedAt,
      tenantStartDate: tenant?.startDate ?? null,
    })
    const appliedMonthKeys = appliedMonthKeysByMemberId.get(member.id)

    if (expectedMonthKeys.length === 0) {
      if (appliedMonthKeys?.size) {
        appliedBackfillMonthMemberIds.add(member.id)
      }
      membersWithoutHistoricalMonthIds.add(member.id)
    } else if (
      expectedMonthKeys.every((monthKey) => appliedMonthKeys?.has(monthKey))
    ) {
      appliedBackfillMonthMemberIds.add(member.id)
    }
  }

  const appliedBackfillMemberIds = new Set([
    ...appliedBackfillBatchMemberIds,
    ...appliedBackfillMonthMemberIds,
    ...(isBroughtForwardSetup
      ? appliedOpeningBalanceMembers.map(
          (row: { memberId: string }) => row.memberId
        )
      : []),
  ])
  const appliedBackfillMembers = appliedBackfillMemberIds.size
  // Members with no closed month since the later of tenant start and join date
  // have nothing to backfill. Brought-forward still needs an opening position.
  const satisfiedMemberIds = new Set([
    ...appliedBackfillMemberIds,
    ...(hasFinanceStartDate && !isBroughtForwardSetup
      ? membersWithoutHistoricalMonthIds
      : []),
  ])
  const hasMemberLedgerBackfill =
    hasMemberProfiles && satisfiedMemberIds.size >= memberProfileCount
  const historicalSetupComplete =
    hasMigrationSetupMode &&
    hasFinanceStartDate &&
    hasChargeSchedules &&
    hasRequiredBusinessProfitPools &&
    hasRequiredBusinessProfitSeasons &&
    hasRequiredLegacyLoansReviewed
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
    requiresHistoricalBackfill,
    snapshot: buildInitialMigrationSnapshot({
      emergencyUnlockActive,
      hasBusinessProfitPools: hasRequiredBusinessProfitPools,
      hasBusinessProfitSeasons: hasRequiredBusinessProfitSeasons,
      hasChargeSchedules,
      hasFinalizationConfirmed,
      hasFinanceStartDate,
      hasLegacyLoansReviewed: hasRequiredLegacyLoansReviewed,
      hasMemberLedgerBackfill,
      hasMemberProfiles,
      hasMigrationSetupMode,
      hasShareCapitalPlan,
      requiresShareCapitalPlan: false,
      status,
    }),
  }
}

export async function finalizeTenantInitialMigration(
  input: InitialMigrationLifecycleInput & {
    /** How the admin confirmed going live; recorded in the audit metadata. */
    confirmationMethod?: "checkbox"
  },
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
    throw ExpectedQueryError.conflict(
      "Initial migration has already been finalized for this cooperative."
    )
  }

  const missingStepKeys = getMissingGettingStartedSetupStepKeys(
    migrationState.snapshot.missingStepKeys
  )

  if (missingStepKeys.length > 0) {
    throw ExpectedQueryError.precondition(
      `Initial setup cannot be finalized until these steps are complete: ${missingStepKeys.join(", ")}.`
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
  // Going live is what makes a cooperative created through sign-up active.
  // Mobile sign-in, device sessions, workspace lists and QA profiles all
  // require `active`; suspended or archived tenants are never reactivated.
  const tenantActivated = tenant?.status === "pending"

  if (tenantActivated) {
    await prisma.tenant.update({
      data: { status: "active" },
      where: { id: input.tenantId },
    })
  }

  await createAuditLogEntry(
    {
      action: "migration.initial.finalized",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityId: input.tenantId,
      entityType: "Tenant",
      metadata: {
        ...(input.confirmationMethod
          ? { confirmation: input.confirmationMethod }
          : {}),
        finalizedAt: finalizedAt.toISOString(),
        nextStatus: "live_operations",
        tenantActivated,
      },
      tenantId: input.tenantId,
    },
    prisma
  )

  return tenantActivated ? { ...tenant, status: "active" } : tenant
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
    throw ExpectedQueryError.precondition(
      "Initial migration tools are locked for this cooperative."
    )
  }

  if (
    migrationState.counts.appliedBackfillBatches > 0 ||
    migrationState.counts.appliedBackfillMembers > 0 ||
    migrationState.counts.appliedBackfillMonths > 0
  ) {
    throw ExpectedQueryError.precondition(
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
    throw ExpectedQueryError.precondition(
      "Initial migration tools are locked for this cooperative."
    )
  }

  if (
    migrationState.counts.appliedBackfillBatches > 0 ||
    migrationState.counts.appliedBackfillMembers > 0 ||
    migrationState.counts.appliedBackfillMonths > 0
  ) {
    throw ExpectedQueryError.precondition(
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
    throw ExpectedQueryError.precondition(
      "Emergency unlock is only available after initial migration has been finalized."
    )
  }

  if (
    Number.isNaN(input.unlockUntil.getTime()) ||
    input.unlockUntil.getTime() <= Date.now()
  ) {
    throw ExpectedQueryError.validation(
      "Emergency unlock expiry must be a future date and time."
    )
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
