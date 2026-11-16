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
import {
  provisionGoLiveFinancing,
  type GoLiveFinancingProvisioning,
} from "./go-live-financing"
import { anchorSetupCommitmentsToGoLive } from "./setup-commitments"
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

type MemberBackfillCoverageCounts = {
  /** Distinct members with applied backfill evidence. */
  appliedMembers: number
  /** Applied members, plus members with nothing to backfill where allowed. */
  satisfiedMembers: number
}

export type MemberBackfillCoverage = {
  appliedBackfillMonths: number
  /** Counts for brought-forward setup: applied opening balances count. */
  broughtForward: MemberBackfillCoverageCounts
  /** Counts for historical backfill setup. */
  historical: MemberBackfillCoverageCounts
  memberProfiles: number
}

/**
 * The member-migration coverage rule, in memory. It is the reference for
 * `readMemberBackfillCoverage`'s SQL and serves clients without `$queryRaw`.
 *
 * A member's backfill is applied when an applied batch or applied opening
 * balance (brought-forward only) exists, or when applied months cover every
 * expected closed month (`getExpectedMemberBackfillMonthKeys`). A member with
 * no expected month counts as applied once any month was applied. In
 * historical setup with a finance start date, members with no expected month
 * are satisfied without evidence.
 */
export function summarizeMemberBackfillCoverage(input: {
  appliedBatchMemberIds: Iterable<string>
  appliedMonths: Array<{ memberId: string; month: Date }>
  appliedOpeningBalanceMemberIds: Iterable<string>
  asOf: Date
  members: Array<{ id: string; joinedAt: Date }>
  tenantStartDate: Date | null | undefined
}): MemberBackfillCoverage {
  const appliedMonthKeysByMemberId = new Map<string, Set<string>>()

  for (const month of input.appliedMonths) {
    const memberMonths =
      appliedMonthKeysByMemberId.get(month.memberId) ?? new Set<string>()
    memberMonths.add(monthKeyFromDate(month.month))
    appliedMonthKeysByMemberId.set(month.memberId, memberMonths)
  }

  const membersWithoutHistoricalMonthIds = new Set<string>()
  const appliedBackfillMonthMemberIds = new Set<string>()

  for (const member of input.members) {
    const expectedMonthKeys = getExpectedMemberBackfillMonthKeys({
      asOf: input.asOf,
      joinedAt: member.joinedAt,
      tenantStartDate: input.tenantStartDate ?? null,
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

  const historicalApplied = new Set([
    ...input.appliedBatchMemberIds,
    ...appliedBackfillMonthMemberIds,
  ])
  const broughtForwardApplied = new Set([
    ...historicalApplied,
    ...input.appliedOpeningBalanceMemberIds,
  ])
  // Members with no closed month since the later of tenant start and join
  // date have nothing to backfill. Brought-forward still needs an opening.
  const historicalSatisfied = new Set([
    ...historicalApplied,
    ...(input.tenantStartDate ? membersWithoutHistoricalMonthIds : []),
  ])

  return {
    appliedBackfillMonths: input.appliedMonths.length,
    broughtForward: {
      appliedMembers: broughtForwardApplied.size,
      satisfiedMembers: broughtForwardApplied.size,
    },
    historical: {
      appliedMembers: historicalApplied.size,
      satisfiedMembers: historicalSatisfied.size,
    },
    memberProfiles: input.members.length,
  }
}

type MemberBackfillCoverageRow = {
  applied_backfill_months: number
  brought_forward_applied_members: number
  historical_applied_members: number
  historical_satisfied_members: number
  member_profiles: number
}

/**
 * Member-migration coverage counted in Postgres: one statement with a
 * bounded result, instead of loading every member, applied month, applied
 * batch and opening balance of the tenant. Month boundaries are UTC, as in
 * `getExpectedMemberBackfillMonthKeys`. Clients without `$queryRaw` (test
 * stubs) use `summarizeMemberBackfillCoverage` over the same rows.
 */
export async function readMemberBackfillCoverage(
  prisma: any,
  tenantId: string,
  asOf: Date
): Promise<MemberBackfillCoverage> {
  if (typeof prisma.$queryRaw !== "function") {
    const [tenant, members, appliedMonths, appliedBatches, openingBalances] =
      await Promise.all([
        prisma.tenant.findUnique({
          select: { startDate: true },
          where: { id: tenantId },
        }),
        prisma.member.findMany({
          select: { id: true, joinedAt: true },
          where: { tenantId },
        }),
        typeof prisma.appliedBackfillMonth?.findMany === "function"
          ? prisma.appliedBackfillMonth.findMany({
              select: { memberId: true, month: true },
              where: { tenantId },
            })
          : [],
        prisma.backfillBatch.findMany({
          select: { memberId: true },
          where: { status: "applied", tenantId },
        }),
        typeof prisma.memberOpeningBalance?.findMany === "function"
          ? prisma.memberOpeningBalance.findMany({
              select: { memberId: true },
              where: { status: "applied", tenantId },
            })
          : [],
      ])

    return summarizeMemberBackfillCoverage({
      appliedBatchMemberIds: appliedBatches.map(
        (row: { memberId: string }) => row.memberId
      ),
      appliedMonths,
      appliedOpeningBalanceMemberIds: openingBalances.map(
        (row: { memberId: string }) => row.memberId
      ),
      asOf,
      members,
      tenantStartDate: tenant?.startDate ?? null,
    })
  }

  const asOfMonth = monthKeyFromDate(asOf) + "-01"
  const [row] = (await prisma.$queryRaw`
    WITH tenant AS (
      SELECT start_date FROM tenants WHERE id = ${tenantId}::uuid
    ),
    member_ranges AS MATERIALIZED (
      SELECT
        m.id,
        date_trunc(
          'month',
          CASE
            WHEN t.start_date IS NOT NULL
              AND (t.start_date::timestamp AT TIME ZONE 'UTC') > m.joined_at
            THEN t.start_date::timestamp
            ELSE m.joined_at AT TIME ZONE 'UTC'
          END
        ) AS start_month
      FROM members m
      LEFT JOIN tenant t ON TRUE
      WHERE m.tenant_id = ${tenantId}::uuid
    ),
    member_coverage AS (
      SELECT
        r.id,
        (
          (EXTRACT(YEAR FROM ${asOfMonth}::date) - EXTRACT(YEAR FROM r.start_month)) * 12
          + EXTRACT(MONTH FROM ${asOfMonth}::date) - EXTRACT(MONTH FROM r.start_month)
        )::int AS expected_months,
        COALESCE(applied.covered_months, 0)::int AS covered_months,
        COALESCE(applied.applied_rows, 0) > 0 AS has_applied_months
      FROM member_ranges r
      -- One index range scan per member on (tenant_id, member_id, month).
      LEFT JOIN LATERAL (
        SELECT
          count(DISTINCT date_trunc('month', a.month)) FILTER (
            WHERE a.month >= r.start_month AND a.month < ${asOfMonth}::date
          ) AS covered_months,
          count(*) AS applied_rows
        FROM applied_backfill_months a
        WHERE a.tenant_id = ${tenantId}::uuid AND a.member_id = r.id
      ) applied ON TRUE
    ),
    historical_applied AS (
      SELECT member_id AS id
      FROM backfill_batches
      WHERE tenant_id = ${tenantId}::uuid AND status = 'applied'
      UNION
      SELECT id
      FROM member_coverage
      WHERE (expected_months <= 0 AND has_applied_months)
        OR (expected_months > 0 AND covered_months >= expected_months)
    ),
    brought_forward_applied AS (
      SELECT id FROM historical_applied
      UNION
      SELECT member_id
      FROM member_opening_balances
      WHERE tenant_id = ${tenantId}::uuid AND status = 'applied'
    ),
    historical_satisfied AS (
      SELECT id FROM historical_applied
      UNION
      SELECT c.id
      FROM member_coverage c
      JOIN tenant t ON t.start_date IS NOT NULL
      WHERE c.expected_months <= 0
    )
    SELECT
      (SELECT count(*) FROM member_ranges)::int AS member_profiles,
      (
        SELECT count(*)
        FROM applied_backfill_months
        WHERE tenant_id = ${tenantId}::uuid
      )::int AS applied_backfill_months,
      (SELECT count(*) FROM historical_applied)::int AS historical_applied_members,
      (SELECT count(*) FROM historical_satisfied)::int AS historical_satisfied_members,
      (SELECT count(*) FROM brought_forward_applied)::int AS brought_forward_applied_members
  `) as MemberBackfillCoverageRow[]

  return {
    appliedBackfillMonths: row?.applied_backfill_months ?? 0,
    broughtForward: {
      appliedMembers: row?.brought_forward_applied_members ?? 0,
      satisfiedMembers: row?.brought_forward_applied_members ?? 0,
    },
    historical: {
      appliedMembers: row?.historical_applied_members ?? 0,
      satisfiedMembers: row?.historical_satisfied_members ?? 0,
    },
    memberProfiles: row?.member_profiles ?? 0,
  }
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

export type TenantFinanceSetupLock = {
  canUseLiveFinancialWrites: boolean
  canUseMigrationTools: boolean
  emergencyUnlockActive: boolean
  /** Member ledger backfill (or a brought-forward opening position) is applied. */
  hasAppliedMemberBackfill: boolean
  /** Past setup (start date, dated charges and shares, past profit) can't change. */
  isLocked: boolean
  isLive: boolean
}

type TenantFinanceSetupLockRow = {
  has_applied_batch: boolean
  has_applied_month: boolean
  has_applied_opening: boolean
  initial_migration_status: InitialMigrationStatus | null
  migration_emergency_unlock_until: Date | null
  migration_setup_mode: string | null
}

export function toTenantFinanceSetupLock(
  row: TenantFinanceSetupLockRow | undefined
): TenantFinanceSetupLock {
  const terminal = isTerminalInitialMigrationStatus(
    row?.initial_migration_status ?? null
  )
  const emergencyUnlockActive = getActiveEmergencyUnlock(
    row?.migration_emergency_unlock_until
  )
  const canUseMigrationTools = !terminal || emergencyUnlockActive
  const hasAppliedMemberBackfill = Boolean(
    row?.has_applied_batch ||
      row?.has_applied_month ||
      (row?.migration_setup_mode === "brought_forward" &&
        row?.has_applied_opening)
  )

  return {
    canUseLiveFinancialWrites: terminal,
    canUseMigrationTools,
    emergencyUnlockActive,
    hasAppliedMemberBackfill,
    isLocked: !canUseMigrationTools || hasAppliedMemberBackfill,
    isLive: terminal,
  }
}

/**
 * The finance-setup lock in one statement: the tenant's write gates plus
 * whether member backfill has been applied. It matches the API's
 * `hasAppliedInitialMigrationBackfill` rule (applied batch, applied month,
 * or an applied opening position in brought-forward setup) without the
 * ~14-statement `getTenantInitialMigrationState` or the per-member review.
 */
export async function getTenantFinanceSetupLock(
  tenantId: string,
  prismaOverride?: PrismaClient
): Promise<TenantFinanceSetupLock> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any

  if (!prisma) {
    return toTenantFinanceSetupLock(undefined)
  }

  const [row] = (await prisma.$queryRaw`
    SELECT
      t.initial_migration_status::text AS initial_migration_status,
      t.migration_emergency_unlock_until,
      tp.migration_setup_mode::text AS migration_setup_mode,
      EXISTS (
        SELECT 1 FROM backfill_batches b
        WHERE b.tenant_id = t.id AND b.status = 'applied'
      ) AS has_applied_batch,
      EXISTS (
        SELECT 1 FROM applied_backfill_months a WHERE a.tenant_id = t.id
      ) AS has_applied_month,
      EXISTS (
        SELECT 1 FROM member_opening_balances o
        WHERE o.tenant_id = t.id AND o.status = 'applied'
      ) AS has_applied_opening
    FROM tenants t
    LEFT JOIN tenant_policies tp ON tp.tenant_id = t.id
    WHERE t.id = ${tenantId}::uuid
  `) as TenantFinanceSetupLockRow[]

  return toTenantFinanceSetupLock(row)
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
    memberBackfillCoverage,
    liveLegacyLoans,
    legacyLoanMigrationDrafts,
    legacyLoanReviewMarkers,
    businessProfitReviewMarkers,
    tenantPolicySetup,
    broughtForwardPendingPastProfitEntries,
    appliedBackfillBatches,
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
    readMemberBackfillCoverage(prisma, tenantId, asOf),
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
  const memberProfileCount = memberBackfillCoverage.memberProfiles
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
      memberBackfillCoverage.appliedBackfillMonths > 0)
  const hasRequiredBusinessProfitPools =
    isBroughtForwardSetup || hasBusinessProfitPools
  const hasRequiredBusinessProfitSeasons = isBroughtForwardSetup
    ? broughtForwardPendingPastProfitEntries === 0 || hasBusinessProfitSeasons
    : hasBusinessProfitSeasons
  const hasRequiredLegacyLoansReviewed =
    isBroughtForwardSetup ||
    hasLegacyLoansReviewed ||
    (hasFinanceStartDate && !tenantHasClosedHistoricalMonths)
  const coverage = isBroughtForwardSetup
    ? memberBackfillCoverage.broughtForward
    : memberBackfillCoverage.historical
  const appliedBackfillMembers = coverage.appliedMembers
  const hasMemberLedgerBackfill =
    hasMemberProfiles && coverage.satisfiedMembers >= memberProfileCount
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
      appliedBackfillMonths: memberBackfillCoverage.appliedBackfillMonths,
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
    /**
     * Open this month's financing cycle as part of going live. Only opens
     * when no cycle exists and there is capacity to snapshot (ADR-20261113).
     */
    openFinancingCycle?: boolean
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
  // Commitments entered during setup start in the go-live month (triage
  // 1.8). Moved before the status change, so a failure leaves setup open.
  const setupCommitments = await anchorSetupCommitmentsToGoLive(
    { goLiveAt: finalizedAt, tenantId: input.tenantId },
    prisma
  )
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

  // A live cooperative must be able to take financing: create the default
  // Quick/Normal products and, when asked, open this month's cycle. A
  // failure here never undoes going live; it is recorded in the audit and
  // `/loans` plus Finance settings show the fix.
  let financing: GoLiveFinancingProvisioning | { error: string }
  try {
    financing = await provisionGoLiveFinancing(
      {
        actorUserId: input.actorUserId,
        openFinancingCycle: input.openFinancingCycle ?? false,
        tenantId: input.tenantId,
      },
      prisma
    )
  } catch (error) {
    financing = {
      error:
        error instanceof Error ? error.message : "Financing set-up failed.",
    }
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
        financing,
        finalizedAt: finalizedAt.toISOString(),
        setupCommitmentsMoved: setupCommitments.movedPlanCount,
        nextStatus: "live_operations",
        tenantActivated,
      },
      tenantId: input.tenantId,
    },
    prisma
  )

  const finalizedTenant = tenantActivated
    ? { ...tenant, status: "active" }
    : tenant

  return { ...finalizedTenant, financing }
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
