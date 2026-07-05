import type { PrismaClient } from "../../generated/prisma/client"
import { allocateBusinessProfitByShare } from "@halaalvest/domain"
import { createPrismaClient } from "../prisma"
import { isPrismaMissingColumnError } from "../prisma-errors"
import { createAuditLogEntry } from "./audit"
import { getTenantInitialMigrationState } from "./migration"
import { readOptionalTenantBusinessPolicy } from "./tenant-business-policy"
import { getTenantById } from "./tenants"

export type BusinessProfitDistributionFrequency =
  | "annual"
  | "semi_annual"
  | "quarterly"
  | "ad_hoc"

export type BusinessProfitDistributionBasis = "share_capital_balance"

export type BusinessProfitExpenseTreatment =
  "deduct_reviewed_expenses_before_distribution"

export type HistoricalProfitMigrationMode =
  | "manual_review_required"
  | "import_historical_profit_pools"
  | "no_historical_business_profit"

export type TenantBusinessProfitPolicySettings = {
  defaultDistributablePercentage: number
  distributionBasis: BusinessProfitDistributionBasis
  expenseTreatment: BusinessProfitExpenseTreatment
  financialYearStartMonth: number
  historicalProfitMigrationMode: HistoricalProfitMigrationMode
  id: string | null
  profitDistributionFrequency: BusinessProfitDistributionFrequency
  requiresProfitDistributionApproval: boolean
  reserveRetentionPercentage: number
}

type BusinessProfitSourceType = "manual" | "backfill" | "import"

export type BusinessProfitSeasonReviewRow = {
  businessNames: string[]
  deductionAmount: number
  deductionReason: string | null
  distributableAmount: number
  entryDeductionAmount: number
  grossProfitAmount: number
  id: string | null
  key: string
  label: string
  periodEnd: Date
  periodStart: Date
  profitEntries: Array<{
    businessName: string
    deductionAmount: number
    expenseAmount: number
    id: string
    profitAmount: number
    profitDate: Date | string
    reason: string | null
  }>
  profitEntryCount: number
  status: "pending" | "draft" | "approved" | "published" | "closed"
}

type BusinessProfitSeasonProfitEntry = {
  allocatableProfitAmount?: unknown
  expenseAmount?: unknown
  id: string
  profitAmount?: unknown
  profitDate: Date | string
  reason?: string | null
  shareBusiness?: {
    name?: string | null
  } | null
}

type BusinessProfitSeasonBucket = BusinessProfitSeasonReviewRow

const dividendPeriodReviewSelect = {
  id: true,
  name: true,
  periodStart: true,
  periodEnd: true,
  totalProfitAmount: true,
  deductionAmount: true,
  deductionReason: true,
  distributableAmount: true,
  status: true,
} as const

const legacyDividendPeriodReviewSelect = {
  id: true,
  name: true,
  periodStart: true,
  periodEnd: true,
  totalProfitAmount: true,
  distributableAmount: true,
  status: true,
} as const

const businessProfitDistributionFrequencies = new Set([
  "annual",
  "semi_annual",
  "quarterly",
  "ad_hoc",
])
const businessProfitDistributionBases = new Set(["share_capital_balance"])
const businessProfitExpenseTreatments = new Set([
  "deduct_reviewed_expenses_before_distribution",
])
const historicalProfitMigrationModes = new Set([
  "manual_review_required",
  "import_historical_profit_pools",
  "no_historical_business_profit",
])

export const defaultTenantBusinessProfitPolicy: TenantBusinessProfitPolicySettings =
  {
    defaultDistributablePercentage: 100,
    distributionBasis: "share_capital_balance",
    expenseTreatment: "deduct_reviewed_expenses_before_distribution",
    financialYearStartMonth: 1,
    historicalProfitMigrationMode: "manual_review_required",
    id: null,
    profitDistributionFrequency: "annual",
    requiresProfitDistributionApproval: true,
    reserveRetentionPercentage: 0,
  }

async function listDividendPeriodsForBusinessProfitReview(
  prisma: any,
  input: {
    orderBy?: any
    tenantId: string
  }
) {
  try {
    return await prisma.dividendPeriod.findMany({
      orderBy: input.orderBy,
      select: dividendPeriodReviewSelect,
      where: { tenantId: input.tenantId },
    })
  } catch (error) {
    if (!isPrismaMissingColumnError(error)) {
      throw error
    }

    return prisma.dividendPeriod.findMany({
      orderBy: input.orderBy,
      select: legacyDividendPeriodReviewSelect,
      where: { tenantId: input.tenantId },
    })
  }
}

function normalizeTenantBusinessProfitPolicy(
  policy: any
): TenantBusinessProfitPolicySettings {
  return {
    ...defaultTenantBusinessProfitPolicy,
    ...(policy
      ? {
          defaultDistributablePercentage: Number(
            policy.defaultDistributablePercentage
          ),
          distributionBasis:
            policy.distributionBasis ??
            defaultTenantBusinessProfitPolicy.distributionBasis,
          expenseTreatment:
            policy.expenseTreatment ??
            defaultTenantBusinessProfitPolicy.expenseTreatment,
          financialYearStartMonth: Number(policy.financialYearStartMonth),
          historicalProfitMigrationMode:
            policy.historicalProfitMigrationMode ??
            defaultTenantBusinessProfitPolicy.historicalProfitMigrationMode,
          id: policy.id,
          profitDistributionFrequency:
            policy.profitDistributionFrequency ??
            defaultTenantBusinessProfitPolicy.profitDistributionFrequency,
          requiresProfitDistributionApproval: Boolean(
            policy.requiresProfitDistributionApproval
          ),
          reserveRetentionPercentage: Number(policy.reserveRetentionPercentage),
        }
      : {}),
  }
}

function assertBusinessPolicyChoice(
  value: string,
  validValues: Set<string>,
  label: string
) {
  if (!validValues.has(value)) {
    throw new Error(`${label} is not supported.`)
  }
}

function assertPercentage(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`${label} must be between 0 and 100.`)
  }
}

async function assertHistoricalFinanceSetupMutationOpen(
  tenantId: string,
  prisma: PrismaClient
) {
  const migrationState = await getTenantInitialMigrationState(tenantId, prisma)

  if (!migrationState.snapshot.canUseMigrationTools) {
    throw new Error(
      "Historical finance setup is locked because initial migration is finalized."
    )
  }

  if (
    migrationState.counts.appliedBackfillBatches > 0 ||
    migrationState.counts.appliedBackfillMembers > 0 ||
    migrationState.counts.appliedBackfillMonths > 0
  ) {
    throw new Error(
      "Historical finance setup is locked because member ledger backfill has already started."
    )
  }
}

function isHistoricalBusinessProfitSource(
  sourceType: string | null | undefined
) {
  return sourceType === "backfill" || sourceType === "import"
}

async function createOptionalAuditLogEntry(
  input: Parameters<typeof createAuditLogEntry>[0],
  prisma: any
) {
  if (typeof prisma.auditLog?.create !== "function") {
    return null
  }

  return createAuditLogEntry(input, prisma)
}

function toDateOnly(value: Date | string) {
  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : value.slice(0, 10)
}

function dateFromDateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`)
}

function monthIndexToDate(monthIndex: number) {
  const year = Math.floor(monthIndex / 12)
  const month = monthIndex % 12

  return new Date(Date.UTC(year, month, 1))
}

function monthIndexToPeriodEnd(monthIndex: number) {
  const year = Math.floor(monthIndex / 12)
  const month = monthIndex % 12

  return new Date(Date.UTC(year, month + 1, 0))
}

function formatSeasonDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(value)
}

function getBusinessProfitSeasonSpanMonths(
  frequency: BusinessProfitDistributionFrequency
) {
  if (frequency === "quarterly") return 3
  if (frequency === "semi_annual") return 6
  if (frequency === "annual") return 12

  return 0
}

function getBusinessProfitSeasonPeriod(
  profitDateValue: Date | string,
  policy: TenantBusinessProfitPolicySettings
) {
  const profitDate = dateFromDateOnly(toDateOnly(profitDateValue))

  if (policy.profitDistributionFrequency === "ad_hoc") {
    return {
      periodEnd: profitDate,
      periodStart: profitDate,
    }
  }

  const spanMonths = getBusinessProfitSeasonSpanMonths(
    policy.profitDistributionFrequency
  )
  const profitMonthIndex =
    profitDate.getUTCFullYear() * 12 + profitDate.getUTCMonth()
  const fiscalStartMonthIndex = policy.financialYearStartMonth - 1
  let fiscalStartIndex =
    profitDate.getUTCFullYear() * 12 + fiscalStartMonthIndex

  if (profitMonthIndex < fiscalStartIndex) {
    fiscalStartIndex -= 12
  }

  const offset = profitMonthIndex - fiscalStartIndex
  const seasonStartIndex =
    fiscalStartIndex + Math.floor(offset / spanMonths) * spanMonths

  return {
    periodEnd: monthIndexToPeriodEnd(seasonStartIndex + spanMonths - 1),
    periodStart: monthIndexToDate(seasonStartIndex),
  }
}

function getBusinessProfitSeasonLabel(
  policy: TenantBusinessProfitPolicySettings,
  periodStart: Date,
  periodEnd: Date
) {
  const range = `${formatSeasonDate(periodStart)} - ${formatSeasonDate(
    periodEnd
  )}`

  if (policy.profitDistributionFrequency === "quarterly") {
    return `Quarterly dividend (${range})`
  }

  if (policy.profitDistributionFrequency === "semi_annual") {
    return `Bi-annual dividend (${range})`
  }

  if (policy.profitDistributionFrequency === "ad_hoc") {
    return `Ad hoc dividend (${formatSeasonDate(periodEnd)})`
  }

  return `Yearly dividend (${range})`
}

function getBusinessProfitSeasonKey(periodStart: Date, periodEnd: Date) {
  return `${toDateOnly(periodStart)}:${toDateOnly(periodEnd)}`
}

function buildBusinessProfitSeasonReviewRows(input: {
  dividendPeriods: any[]
  entries: BusinessProfitSeasonProfitEntry[]
  policy: TenantBusinessProfitPolicySettings
}) {
  const existingPeriodsByKey = new Map(
    input.dividendPeriods.map((period) => [
      getBusinessProfitSeasonKey(period.periodStart, period.periodEnd),
      period,
    ])
  )
  const buckets = new Map<
    string,
    {
      entries: BusinessProfitSeasonProfitEntry[]
      periodEnd: Date
      periodStart: Date
    }
  >()

  for (const entry of input.entries) {
    const period = getBusinessProfitSeasonPeriod(entry.profitDate, input.policy)
    const key = getBusinessProfitSeasonKey(period.periodStart, period.periodEnd)
    const bucket = buckets.get(key) ?? {
      entries: [],
      periodEnd: period.periodEnd,
      periodStart: period.periodStart,
    }

    bucket.entries.push(entry)
    buckets.set(key, bucket)
  }

  return Array.from(buckets.entries())
    .map(([key, bucket]): BusinessProfitSeasonBucket => {
      const existingPeriod = existingPeriodsByKey.get(key)
      const grossProfitAmount = roundCurrency(
        bucket.entries.reduce(
          (total, entry) => total + Number(entry.profitAmount ?? 0),
          0
        )
      )
      const entryDeductionAmount = roundCurrency(
        bucket.entries.reduce(
          (total, entry) => total + Number(entry.expenseAmount ?? 0),
          0
        )
      )
      const fallbackSeasonDeduction = existingPeriod
        ? Math.max(
            0,
            Number(existingPeriod.totalProfitAmount ?? 0) -
              Number(existingPeriod.distributableAmount ?? 0) -
              entryDeductionAmount
          )
        : 0
      const deductionAmount = roundCurrency(
        Number(existingPeriod?.deductionAmount ?? fallbackSeasonDeduction)
      )
      const businessNames = Array.from(
        new Set(
          bucket.entries.map(
            (entry) => entry.shareBusiness?.name ?? "Business profit"
          )
        )
      ).sort((a, b) => a.localeCompare(b))
      const distributableAmount = roundCurrency(
        grossProfitAmount - entryDeductionAmount - deductionAmount
      )

      return {
        businessNames,
        deductionAmount,
        deductionReason: existingPeriod?.deductionReason ?? null,
        distributableAmount,
        entryDeductionAmount,
        grossProfitAmount,
        id: existingPeriod?.id ?? null,
        key,
        label: existingPeriod?.name
          ? existingPeriod.name
          : getBusinessProfitSeasonLabel(
              input.policy,
              bucket.periodStart,
              bucket.periodEnd
            ),
        periodEnd: bucket.periodEnd,
        periodStart: bucket.periodStart,
        profitEntries: bucket.entries.map((entry) => ({
          businessName: entry.shareBusiness?.name ?? "Business profit",
          deductionAmount: roundCurrency(Number(entry.expenseAmount ?? 0)),
          expenseAmount: roundCurrency(Number(entry.expenseAmount ?? 0)),
          id: entry.id,
          profitAmount: roundCurrency(Number(entry.profitAmount ?? 0)),
          profitDate: entry.profitDate,
          reason: entry.reason ?? null,
        })),
        profitEntryCount: bucket.entries.length,
        status: existingPeriod?.status ?? "pending",
      }
    })
    .sort(
      (a, b) =>
        a.periodStart.getTime() - b.periodStart.getTime() ||
        a.label.localeCompare(b.label)
    )
}

async function assertBusinessProfitMutationOpen(
  input: {
    sourceType?: BusinessProfitSourceType | string | null
    tenantId: string
  },
  prisma: PrismaClient
) {
  const migrationState = await getTenantInitialMigrationState(
    input.tenantId,
    prisma
  )

  if (isHistoricalBusinessProfitSource(input.sourceType)) {
    if (!migrationState.snapshot.canUseMigrationTools) {
      throw new Error(
        "Historical business profit migration records are locked because initial migration is finalized."
      )
    }

    if (
      migrationState.counts.appliedBackfillBatches > 0 ||
      migrationState.counts.appliedBackfillMembers > 0 ||
      migrationState.counts.appliedBackfillMonths > 0
    ) {
      throw new Error(
        "Historical business profit migration records are locked because member ledger backfill has already started."
      )
    }

    return
  }

  if (
    migrationState.snapshot.canUseLiveFinancialWrites ||
    migrationState.snapshot.status === "finalized"
  ) {
    return
  }

  if (!migrationState.snapshot.canUseMigrationTools) {
    throw new Error(
      "Business profit records are locked until live operations are available."
    )
  }

  if (
    migrationState.counts.appliedBackfillBatches > 0 ||
    migrationState.counts.appliedBackfillMembers > 0 ||
    migrationState.counts.appliedBackfillMonths > 0
  ) {
    throw new Error(
      "Business profit records are locked because member ledger backfill has already started. Finish migration or create live business records after go-live."
    )
  }
}

async function assertLiveFinancialWritesOpen(
  tenantId: string,
  prisma: PrismaClient
) {
  const migrationState = await getTenantInitialMigrationState(tenantId, prisma)

  if (!migrationState.snapshot.canUseLiveFinancialWrites) {
    throw new Error(
      "Live financial record writes are locked until initial migration is finalized."
    )
  }
}

export async function getTenantFinanceSetup(
  tenantId: string,
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any

  if (!prisma) {
    const tenant = getTenantById(tenantId)
    return {
      businessPolicy: defaultTenantBusinessProfitPolicy,
      businessProfitSeasons: [],
      chargeDefinitions: [],
      dividendPeriods: [],
      shareBusinesses: [],
      shareStructureVersions: [],
      tenant,
    }
  }

  const [
    tenant,
    businessPolicy,
    shareStructureVersions,
    chargeDefinitions,
    shareBusinesses,
    dividendPeriods,
  ] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        startDate: true,
        currencyCode: true,
      },
    }),
    readOptionalTenantBusinessPolicy(prisma, (tenantBusinessPolicy) =>
      tenantBusinessPolicy.findUnique({
        where: { tenantId },
      })
    ),
    prisma.tenantShareStructureVersion.findMany({
      where: { tenantId },
      orderBy: { effectiveFrom: "asc" },
    }),
    prisma.chargeDefinition.findMany({
      where: { tenantId },
      include: {
        versions: {
          orderBy: { effectiveFrom: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.shareBusiness.findMany({
      where: { tenantId },
      include: {
        linkedDividendPeriod: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        profitEntries: {
          include: {
            allocations: true,
            linkedDividendPeriod: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
          orderBy: [{ profitDate: "desc" }, { createdAt: "desc" }],
        },
      },
      orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
    }),
    listDividendPeriodsForBusinessProfitReview(prisma, {
      tenantId,
      orderBy: [{ periodStart: "desc" }, { createdAt: "desc" }],
    }),
  ])
  const normalizedBusinessPolicy =
    normalizeTenantBusinessProfitPolicy(businessPolicy)
  const businessProfitSeasons = buildBusinessProfitSeasonReviewRows({
    dividendPeriods,
    entries: shareBusinesses.flatMap((business: any) =>
      (business.profitEntries ?? []).map((entry: any) => ({
        ...entry,
        shareBusiness: {
          name: business.name,
        },
      }))
    ),
    policy: normalizedBusinessPolicy,
  })

  return {
    businessPolicy: normalizedBusinessPolicy,
    businessProfitSeasons,
    chargeDefinitions,
    dividendPeriods,
    shareBusinesses,
    shareStructureVersions,
    tenant,
  }
}

export async function getTenantBusinessProfitPolicy(
  tenantId: string,
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any

  if (!prisma) {
    return defaultTenantBusinessProfitPolicy
  }

  const policy = await readOptionalTenantBusinessPolicy(
    prisma,
    (tenantBusinessPolicy) =>
      tenantBusinessPolicy.findUnique({
        where: { tenantId },
      })
  )

  return normalizeTenantBusinessProfitPolicy(policy)
}

export async function listBusinessProfitSeasonReviews(
  tenantId: string,
  prismaOverride?: PrismaClient
): Promise<BusinessProfitSeasonReviewRow[]> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any

  if (!prisma) return []

  const [policy, entries, dividendPeriods] = await Promise.all([
    getTenantBusinessProfitPolicy(tenantId, prisma),
    prisma.shareBusinessProfitEntry.findMany({
      include: {
        shareBusiness: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ profitDate: "asc" }, { createdAt: "asc" }],
      where: {
        tenantId,
        status: {
          not: "archived",
        },
      },
    }),
    listDividendPeriodsForBusinessProfitReview(prisma, {
      tenantId,
    }),
  ])

  return buildBusinessProfitSeasonReviewRows({
    dividendPeriods,
    entries,
    policy,
  })
}

export async function saveBusinessProfitSeasonReviews(
  input: {
    actorUserId?: string | null
    seasons: Array<{
      deductionAmount: number
      deductionReason?: string | null
      key: string
    }>
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  await assertHistoricalFinanceSetupMutationOpen(
    input.tenantId,
    prisma as PrismaClient
  )

  const [policy, entries, dividendPeriods] = await Promise.all([
    getTenantBusinessProfitPolicy(input.tenantId, prisma),
    prisma.shareBusinessProfitEntry.findMany({
      include: {
        shareBusiness: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ profitDate: "asc" }, { createdAt: "asc" }],
      where: {
        tenantId: input.tenantId,
        status: {
          not: "archived",
        },
      },
    }),
    listDividendPeriodsForBusinessProfitReview(prisma, {
      tenantId: input.tenantId,
    }),
  ])
  const seasons = buildBusinessProfitSeasonReviewRows({
    dividendPeriods,
    entries,
    policy,
  })
  const submittedSeasonsByKey = new Map(
    input.seasons.map((season) => [season.key, season])
  )

  return prisma.$transaction(async (tx: any) => {
    const reviewedSeasonIds: string[] = []

    for (const season of seasons) {
      const submittedSeason = submittedSeasonsByKey.get(season.key)
      const deductionAmount = roundCurrency(
        Number(submittedSeason?.deductionAmount ?? season.deductionAmount ?? 0)
      )
      const deductionReason =
        submittedSeason?.deductionReason?.trim() ||
        (deductionAmount > 0 ? season.deductionReason : null)
      const baseAllocatableAmount = roundCurrency(
        season.grossProfitAmount - season.entryDeductionAmount
      )
      const distributableAmount = roundCurrency(
        baseAllocatableAmount - deductionAmount
      )

      if (!Number.isFinite(deductionAmount) || deductionAmount < 0) {
        throw new Error(`${season.label} deduction must be a positive number.`)
      }

      if (deductionAmount > baseAllocatableAmount) {
        throw new Error(
          `${season.label} deduction cannot exceed its shareable profit.`
        )
      }

      if (deductionAmount > 0 && !deductionReason) {
        throw new Error(`${season.label} needs a deduction reason.`)
      }

      const existingPeriod = await tx.dividendPeriod.findFirst({
        where: {
          periodEnd: season.periodEnd,
          periodStart: season.periodStart,
          tenantId: input.tenantId,
        },
      })

      if (
        existingPeriod?.status === "published" ||
        existingPeriod?.status === "closed"
      ) {
        throw new Error(
          `${existingPeriod.name} is already ${existingPeriod.status} and cannot be edited.`
        )
      }

      const period = existingPeriod
        ? await tx.dividendPeriod.update({
            data: {
              deductionAmount,
              deductionReason,
              distributableAmount,
              name: season.label,
              status: "approved",
              totalProfitAmount: season.grossProfitAmount,
            },
            where: { id: existingPeriod.id },
          })
        : await tx.dividendPeriod.create({
            data: {
              deductionAmount,
              deductionReason,
              distributableAmount,
              name: season.label,
              periodEnd: season.periodEnd,
              periodStart: season.periodStart,
              status: "approved",
              tenantId: input.tenantId,
              totalProfitAmount: season.grossProfitAmount,
            },
          })

      reviewedSeasonIds.push(period.id)

      let remainingDistributable = distributableAmount

      for (const [index, entry] of season.profitEntries.entries()) {
        const entryBaseAllocatable = roundCurrency(
          Number(entry.profitAmount ?? 0) - Number(entry.expenseAmount ?? 0)
        )
        const reviewedAllocatable =
          index === season.profitEntries.length - 1
            ? remainingDistributable
            : roundCurrency(
                baseAllocatableAmount > 0
                  ? distributableAmount *
                      (entryBaseAllocatable / baseAllocatableAmount)
                  : 0
              )

        remainingDistributable = roundCurrency(
          remainingDistributable - reviewedAllocatable
        )

        await tx.shareBusinessProfitEntry.update({
          data: {
            allocatableProfitAmount: reviewedAllocatable,
            linkedDividendPeriodId: period.id,
            status: "reviewed",
          },
          where: { id: entry.id },
        })
      }
    }

    await createOptionalAuditLogEntry(
      {
        action: "migration.business_profit_seasons.reviewed",
        actorType: "user",
        actorUserId: input.actorUserId ?? null,
        entityId: input.tenantId,
        entityType: "Tenant",
        metadata: {
          seasonCount: reviewedSeasonIds.length,
          seasonIds: reviewedSeasonIds,
        },
        tenantId: input.tenantId,
      },
      tx
    )

    return reviewedSeasonIds
  })
}

export async function updateTenantBusinessProfitPolicy(
  input: {
    actorUserId?: string | null
    defaultDistributablePercentage: number
    distributionBasis?: BusinessProfitDistributionBasis
    expenseTreatment?: BusinessProfitExpenseTreatment
    financialYearStartMonth: number
    historicalProfitMigrationMode?: HistoricalProfitMigrationMode
    profitDistributionFrequency: BusinessProfitDistributionFrequency
    requiresProfitDistributionApproval: boolean
    reserveRetentionPercentage: number
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  const distributionBasis =
    input.distributionBasis ??
    defaultTenantBusinessProfitPolicy.distributionBasis
  const expenseTreatment =
    input.expenseTreatment ?? defaultTenantBusinessProfitPolicy.expenseTreatment
  const historicalProfitMigrationMode =
    input.historicalProfitMigrationMode ??
    defaultTenantBusinessProfitPolicy.historicalProfitMigrationMode

  assertBusinessPolicyChoice(
    input.profitDistributionFrequency,
    businessProfitDistributionFrequencies,
    "Profit distribution frequency"
  )
  assertBusinessPolicyChoice(
    distributionBasis,
    businessProfitDistributionBases,
    "Distribution basis"
  )
  assertBusinessPolicyChoice(
    expenseTreatment,
    businessProfitExpenseTreatments,
    "Expense treatment"
  )
  assertBusinessPolicyChoice(
    historicalProfitMigrationMode,
    historicalProfitMigrationModes,
    "Historical profit migration mode"
  )

  if (
    !Number.isInteger(input.financialYearStartMonth) ||
    input.financialYearStartMonth < 1 ||
    input.financialYearStartMonth > 12
  ) {
    throw new Error("Financial year start month must be between 1 and 12.")
  }

  assertPercentage(
    input.defaultDistributablePercentage,
    "Default distributable percentage"
  )
  assertPercentage(input.reserveRetentionPercentage, "Reserve retention")

  if (
    input.defaultDistributablePercentage + input.reserveRetentionPercentage >
    100
  ) {
    throw new Error(
      "Distributable percentage plus reserve retention cannot exceed 100."
    )
  }

  const previousPolicy = await readOptionalTenantBusinessPolicy(
    prisma,
    (tenantBusinessPolicy) =>
      tenantBusinessPolicy.findUnique({
        where: { tenantId: input.tenantId },
      })
  )
  const policy = await prisma.tenantBusinessPolicy.upsert({
    create: {
      tenantId: input.tenantId,
      defaultDistributablePercentage: input.defaultDistributablePercentage,
      distributionBasis,
      expenseTreatment,
      financialYearStartMonth: input.financialYearStartMonth,
      historicalProfitMigrationMode,
      profitDistributionFrequency: input.profitDistributionFrequency,
      requiresProfitDistributionApproval:
        input.requiresProfitDistributionApproval,
      reserveRetentionPercentage: input.reserveRetentionPercentage,
    },
    update: {
      defaultDistributablePercentage: input.defaultDistributablePercentage,
      distributionBasis,
      expenseTreatment,
      financialYearStartMonth: input.financialYearStartMonth,
      historicalProfitMigrationMode,
      profitDistributionFrequency: input.profitDistributionFrequency,
      requiresProfitDistributionApproval:
        input.requiresProfitDistributionApproval,
      reserveRetentionPercentage: input.reserveRetentionPercentage,
    },
    where: { tenantId: input.tenantId },
  })

  await createAuditLogEntry(
    {
      action: "tenant_business_policy.updated",
      actorType: "user",
      actorUserId: input.actorUserId ?? null,
      entityId: policy.id,
      entityType: "TenantBusinessPolicy",
      metadata: {
        next: normalizeTenantBusinessProfitPolicy(policy),
        previous: previousPolicy
          ? normalizeTenantBusinessProfitPolicy(previousPolicy)
          : null,
      },
      tenantId: input.tenantId,
    },
    prisma
  )

  return normalizeTenantBusinessProfitPolicy(policy)
}

export async function listTenantShareStructureVersions(
  tenantId: string,
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) return []

  return prisma.tenantShareStructureVersion.findMany({
    where: { tenantId },
    orderBy: { effectiveFrom: "asc" },
  })
}

export async function createTenantShareStructureVersion(
  input: {
    tenantId: string
    effectiveFrom: Date
    amount: number
    basis?: "after_charge_deductions"
    notes?: string
    valueType?: "fixed_amount" | "percentage"
    createdByUserId?: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")
  await assertHistoricalFinanceSetupMutationOpen(input.tenantId, prisma)

  return prisma.tenantShareStructureVersion.create({
    data: {
      tenantId: input.tenantId,
      effectiveFrom: input.effectiveFrom,
      amount: input.amount,
      basis: input.basis ?? "after_charge_deductions",
      notes: input.notes,
      valueType: input.valueType ?? "fixed_amount",
      createdByUserId: input.createdByUserId,
    },
  })
}

export async function upsertTenantShareStructureVersion(
  input: {
    tenantId: string
    effectiveFrom: Date
    amount: number
    basis?: "after_charge_deductions"
    notes?: string
    valueType?: "fixed_amount" | "percentage"
    createdByUserId?: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")
  await assertHistoricalFinanceSetupMutationOpen(input.tenantId, prisma)

  const updateData: Record<string, unknown> = {
    amount: input.amount,
    basis: input.basis ?? "after_charge_deductions",
    valueType: input.valueType ?? "fixed_amount",
  }

  if (input.notes !== undefined) {
    updateData.notes = input.notes
  }

  return prisma.tenantShareStructureVersion.upsert({
    where: {
      tenantId_effectiveFrom: {
        tenantId: input.tenantId,
        effectiveFrom: input.effectiveFrom,
      },
    },
    create: {
      tenantId: input.tenantId,
      effectiveFrom: input.effectiveFrom,
      amount: input.amount,
      basis: input.basis ?? "after_charge_deductions",
      notes: input.notes,
      valueType: input.valueType ?? "fixed_amount",
      createdByUserId: input.createdByUserId,
    },
    update: updateData,
  })
}

export async function updateTenantShareStructureVersion(
  input: {
    tenantId: string
    shareStructureVersionId: string
    effectiveFrom: Date
    amount: number
    basis?: "after_charge_deductions"
    notes?: string
    valueType?: "fixed_amount" | "percentage"
  },
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")
  await assertHistoricalFinanceSetupMutationOpen(input.tenantId, prisma)

  const existing = await prisma.tenantShareStructureVersion.findFirst({
    where: {
      id: input.shareStructureVersionId,
      tenantId: input.tenantId,
    },
  })

  if (!existing) {
    throw new Error("Share structure version not found")
  }

  return prisma.tenantShareStructureVersion.update({
    where: {
      id: input.shareStructureVersionId,
      tenantId: input.tenantId,
    },
    data: {
      amount: input.amount,
      basis: input.basis ?? existing.basis ?? "after_charge_deductions",
      effectiveFrom: input.effectiveFrom,
      notes: input.notes ?? null,
      valueType: input.valueType ?? existing.valueType ?? "fixed_amount",
    },
  })
}

export async function listChargeDefinitionVersions(
  tenantId: string,
  chargeDefinitionId: string,
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) return []

  return prisma.chargeDefinitionVersion.findMany({
    where: {
      tenantId,
      chargeDefinitionId,
    },
    orderBy: { effectiveFrom: "asc" },
  })
}

export async function createChargeDefinitionVersion(
  input: {
    tenantId: string
    chargeDefinitionId: string
    effectiveFrom: Date
    amount: number
    kind: "fixed" | "percentage"
    chargeValueType?: "fixed_amount" | "percentage"
    notes?: string
    createdByUserId?: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")
  await assertHistoricalFinanceSetupMutationOpen(input.tenantId, prisma)

  return prisma.$transaction(async (tx: any) => {
    const version = await tx.chargeDefinitionVersion.create({
      data: {
        tenantId: input.tenantId,
        chargeDefinitionId: input.chargeDefinitionId,
        effectiveFrom: input.effectiveFrom,
        amount: input.amount,
        kind: input.kind,
        chargeValueType:
          input.chargeValueType ??
          (input.kind === "percentage" ? "percentage" : "fixed_amount"),
        notes: input.notes,
        createdByUserId: input.createdByUserId,
      },
    })

    const latestVersion = await tx.chargeDefinitionVersion.findFirst({
      where: {
        tenantId: input.tenantId,
        chargeDefinitionId: input.chargeDefinitionId,
        effectiveFrom: {
          lte: new Date(),
        },
      },
      orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }],
    })

    if (latestVersion) {
      await tx.chargeDefinition.update({
        where: {
          id: input.chargeDefinitionId,
          tenantId: input.tenantId,
        },
        data: {
          amount: latestVersion.amount,
          kind: latestVersion.kind,
          chargeValueType: latestVersion.chargeValueType,
        },
      })
    }

    return version
  })
}

export async function updateChargeDefinitionVersion(
  input: {
    tenantId: string
    chargeDefinitionVersionId: string
    effectiveFrom: Date
    amount: number
    chargeValueType?: "fixed_amount" | "percentage"
    notes?: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")
  await assertHistoricalFinanceSetupMutationOpen(input.tenantId, prisma)

  return prisma.$transaction(async (tx: any) => {
    const existing = await tx.chargeDefinitionVersion.findFirst({
      where: {
        id: input.chargeDefinitionVersionId,
        tenantId: input.tenantId,
      },
    })

    if (!existing) {
      throw new Error("Charge version not found")
    }

    const chargeValueType =
      input.chargeValueType ??
      existing.chargeValueType ??
      (existing.kind === "percentage" ? "percentage" : "fixed_amount")
    const kind = chargeValueType === "percentage" ? "percentage" : "fixed"
    const version = await tx.chargeDefinitionVersion.update({
      where: {
        id: input.chargeDefinitionVersionId,
        tenantId: input.tenantId,
      },
      data: {
        amount: input.amount,
        chargeValueType,
        effectiveFrom: input.effectiveFrom,
        kind,
        notes: input.notes ?? null,
      },
    })

    const latestVersion = await tx.chargeDefinitionVersion.findFirst({
      where: {
        tenantId: input.tenantId,
        chargeDefinitionId: existing.chargeDefinitionId,
        effectiveFrom: {
          lte: new Date(),
        },
      },
      orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }],
    })

    if (latestVersion) {
      await tx.chargeDefinition.update({
        where: {
          id: existing.chargeDefinitionId,
          tenantId: input.tenantId,
        },
        data: {
          amount: latestVersion.amount,
          chargeValueType: latestVersion.chargeValueType,
          kind: latestVersion.kind,
        },
      })
    }

    return version
  })
}

export async function listShareBusinesses(
  tenantId: string,
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) return []

  return prisma.shareBusiness.findMany({
    where: { tenantId },
    include: {
      linkedDividendPeriod: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
      profitEntries: {
        include: {
          allocations: true,
          linkedDividendPeriod: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
        orderBy: [{ profitDate: "desc" }, { createdAt: "desc" }],
      },
    },
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
  })
}

export async function createShareBusiness(
  input: {
    tenantId: string
    name: string
    capitalAmount: number
    profitAmount: number
    startDate: Date
    endDate?: Date
    status?: "planned" | "active" | "completed" | "archived"
    notes?: string
    linkedDividendPeriodId?: string
    createdByUserId?: string
    sourceType?: BusinessProfitSourceType
    profitEntries?: Array<{
      allocatableProfitAmount: number
      expenseAmount: number
      profitAmount: number
      profitDate: Date
      reason?: string
    }>
  },
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")
  await assertBusinessProfitMutationOpen(
    { sourceType: input.sourceType ?? "manual", tenantId: input.tenantId },
    prisma
  )

  return prisma.$transaction(async (tx: any) => {
    const profitEntries =
      input.profitEntries ??
      (input.profitAmount > 0
        ? [
            {
              allocatableProfitAmount: input.profitAmount,
              expenseAmount: 0,
              profitAmount: input.profitAmount,
              profitDate: input.endDate ?? input.startDate,
              reason: input.notes,
            },
          ]
        : [])
    const totalProfitAmount = profitEntries.reduce(
      (total, entry) => total + entry.profitAmount,
      0
    )
    const business = await tx.shareBusiness.create({
      data: {
        tenantId: input.tenantId,
        name: input.name,
        capitalAmount: input.capitalAmount,
        profitAmount: input.profitEntries
          ? totalProfitAmount
          : input.profitAmount,
        startDate: input.startDate,
        endDate: input.endDate,
        status: input.status ?? "planned",
        notes: input.notes,
        linkedDividendPeriodId: input.linkedDividendPeriodId,
        createdByUserId: input.createdByUserId,
      },
    })

    for (const profitEntry of profitEntries) {
      const createdProfitEntry = await tx.shareBusinessProfitEntry.create({
        data: {
          tenantId: input.tenantId,
          shareBusinessId: business.id,
          linkedDividendPeriodId: input.linkedDividendPeriodId,
          profitAmount: profitEntry.profitAmount,
          expenseAmount: profitEntry.expenseAmount,
          allocatableProfitAmount: profitEntry.allocatableProfitAmount,
          profitDate: profitEntry.profitDate,
          notes: input.notes,
          reason: profitEntry.reason,
          status: input.status === "completed" ? "reviewed" : "draft",
          sourceType: input.sourceType ?? "manual",
          createdByUserId: input.createdByUserId,
        },
      })

      if (profitEntry.expenseAmount > 0 && profitEntry.reason) {
        await tx.shareBusinessProfitExpenseLine.create({
          data: {
            tenantId: input.tenantId,
            profitEntryId: createdProfitEntry.id,
            reason: profitEntry.reason,
            amount: profitEntry.expenseAmount,
          },
        })
      }
    }

    await createOptionalAuditLogEntry(
      {
        action: "share_business.created",
        actorType: "user",
        actorUserId: input.createdByUserId ?? null,
        entityId: business.id,
        entityType: "ShareBusiness",
        metadata: {
          capitalAmount: input.capitalAmount,
          profitEntryCount: profitEntries.length,
          sourceType: input.sourceType ?? "manual",
          status: input.status ?? "planned",
        },
        tenantId: input.tenantId,
      },
      tx
    )

    return tx.shareBusiness.findFirst({
      where: { id: business.id, tenantId: input.tenantId },
      include: {
        profitEntries: {
          include: {
            allocations: true,
          },
          orderBy: [{ profitDate: "desc" }, { createdAt: "desc" }],
        },
      },
    })
  })
}

export async function updateShareBusiness(
  input: {
    tenantId: string
    shareBusinessId: string
    name: string
    capitalAmount: number
    profitAmount: number
    startDate: Date
    endDate?: Date | null
    status?: "planned" | "active" | "completed" | "archived"
    notes?: string
    linkedDividendPeriodId?: string | null
    actorUserId?: string | null
  },
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  const existing = await prisma.shareBusiness.findFirst({
    where: {
      id: input.shareBusinessId,
      tenantId: input.tenantId,
    },
    include: {
      profitEntries: {
        select: {
          allocations: {
            select: {
              status: true,
            },
          },
          sourceType: true,
        },
      },
    },
  })

  if (!existing) {
    throw new Error("Share business not found")
  }

  if (
    existing.profitEntries.some((entry: any) =>
      entry.allocations.some(
        (allocation: { status: string }) => allocation.status === "published"
      )
    )
  ) {
    throw new Error("Published profit allocations cannot be edited.")
  }

  await assertBusinessProfitMutationOpen(
    {
      sourceType: existing.profitEntries.some((entry: any) =>
        isHistoricalBusinessProfitSource(entry.sourceType)
      )
        ? "backfill"
        : "manual",
      tenantId: input.tenantId,
    },
    prisma
  )

  const updatedBusiness = await prisma.shareBusiness.update({
    where: {
      id: input.shareBusinessId,
      tenantId: input.tenantId,
    },
    data: {
      capitalAmount: input.capitalAmount,
      endDate: input.endDate ?? null,
      linkedDividendPeriodId: input.linkedDividendPeriodId ?? null,
      name: input.name,
      notes: input.notes ?? null,
      profitAmount: input.profitAmount,
      startDate: input.startDate,
      status: input.status ?? existing.status,
    },
  })

  await createOptionalAuditLogEntry(
    {
      action: "share_business.updated",
      actorType: "user",
      actorUserId: input.actorUserId ?? null,
      entityId: input.shareBusinessId,
      entityType: "ShareBusiness",
      metadata: {
        status: input.status ?? existing.status,
      },
      tenantId: input.tenantId,
    },
    prisma
  )

  return updatedBusiness
}

export async function createMemberShareLedgerEntry(
  input: {
    tenantId: string
    memberId: string
    sourceType:
      | "monthly_share_charge"
      | "backfill"
      | "manual_adjustment"
      | "import"
      | "reversal"
    amount: number
    effectiveDate: Date
    sourceId?: string
    notes?: string
    createdByUserId?: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  if (input.sourceType !== "backfill" && input.sourceType !== "import") {
    await assertLiveFinancialWritesOpen(input.tenantId, prisma)
  }

  return prisma.memberShareLedgerEntry.create({
    data: {
      tenantId: input.tenantId,
      memberId: input.memberId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      amount: input.amount,
      effectiveDate: input.effectiveDate,
      notes: input.notes,
      createdByUserId: input.createdByUserId,
    },
  })
}

export async function listMemberShareLedgerEntries(
  input: {
    tenantId: string
    asOfDate?: Date
    memberId?: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) return []

  return prisma.memberShareLedgerEntry.findMany({
    where: {
      tenantId: input.tenantId,
      ...(input.memberId ? { memberId: input.memberId } : {}),
      ...(input.asOfDate ? { effectiveDate: { lte: input.asOfDate } } : {}),
    },
    include: {
      member: {
        select: {
          fullName: true,
          memberNumber: true,
        },
      },
    },
    orderBy: [{ effectiveDate: "desc" }, { createdAt: "desc" }],
  })
}

export async function getMemberShareBalancesAtDate(
  tenantId: string,
  asOfDate: Date,
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) return []

  const entries = await prisma.memberShareLedgerEntry.findMany({
    where: {
      tenantId,
      effectiveDate: {
        lte: asOfDate,
      },
    },
    include: {
      member: {
        select: {
          fullName: true,
          memberNumber: true,
          status: true,
        },
      },
    },
  })
  const balances = new Map<
    string,
    {
      memberId: string
      memberName: string
      memberNumber: string
      shareBalance: number
    }
  >()

  for (const entry of entries) {
    const current = balances.get(entry.memberId) ?? {
      memberId: entry.memberId,
      memberName: entry.member.fullName,
      memberNumber: entry.member.memberNumber,
      shareBalance: 0,
    }
    current.shareBalance += Number(entry.amount)
    balances.set(entry.memberId, current)
  }

  return Array.from(balances.values())
    .filter((balance) => balance.shareBalance > 0)
    .sort(
      (a, b) =>
        b.shareBalance - a.shareBalance ||
        a.memberName.localeCompare(b.memberName)
    )
}

async function getEligibleMemberShareBalancesAtDate(
  tenantId: string,
  asOfDate: Date,
  prisma: any
) {
  const [shareLedgerEntries, amountLogs] = await Promise.all([
    prisma.memberShareLedgerEntry.findMany({
      where: {
        tenantId,
        effectiveDate: {
          lte: asOfDate,
        },
        member: {
          joinedAt: {
            lte: asOfDate,
          },
        },
      },
      include: {
        member: {
          select: {
            fullName: true,
            joinedAt: true,
            memberNumber: true,
            status: true,
          },
        },
      },
    }),
    prisma.memberAmountLog.findMany({
      where: {
        tenantId,
        effectiveFrom: {
          lte: asOfDate,
        },
        member: {
          joinedAt: {
            lte: asOfDate,
          },
        },
      },
      include: {
        member: {
          select: {
            fullName: true,
            joinedAt: true,
            memberNumber: true,
            status: true,
          },
        },
      },
      orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }],
    }),
  ])
  const balances = new Map<
    string,
    {
      joinedAt: Date
      memberId: string
      memberName: string
      memberNumber: string
      shareBalance: number
    }
  >()

  for (const entry of shareLedgerEntries) {
    const current = balances.get(entry.memberId) ?? {
      joinedAt: entry.member.joinedAt,
      memberId: entry.memberId,
      memberName: entry.member.fullName,
      memberNumber: entry.member.memberNumber,
      shareBalance: 0,
    }
    current.shareBalance += Number(entry.amount)
    balances.set(entry.memberId, current)
  }

  const latestAmountLogMemberIds = new Set<string>()

  for (const log of amountLogs) {
    if (
      balances.has(log.memberId) ||
      latestAmountLogMemberIds.has(log.memberId)
    ) {
      continue
    }

    latestAmountLogMemberIds.add(log.memberId)
    balances.set(log.memberId, {
      joinedAt: log.member.joinedAt,
      memberId: log.memberId,
      memberName: log.member.fullName,
      memberNumber: log.member.memberNumber,
      shareBalance: Number(log.amount),
    })
  }

  return Array.from(balances.values())
    .filter((balance) => balance.shareBalance > 0)
    .sort(
      (a, b) =>
        b.shareBalance - a.shareBalance ||
        a.memberName.localeCompare(b.memberName)
    )
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export async function getSharePoolSummary(
  tenantId: string,
  asOfDate = new Date(),
  prismaOverride?: PrismaClient
) {
  const balances = await getMemberShareBalancesAtDate(
    tenantId,
    asOfDate,
    prismaOverride
  )
  const totalShareBalance = balances.reduce(
    (total, balance) => total + balance.shareBalance,
    0
  )

  return {
    asOfDate,
    memberCount: balances.length,
    topMembers: balances.slice(0, 5).map((balance) => ({
      ...balance,
      sharePercentage:
        totalShareBalance > 0 ? balance.shareBalance / totalShareBalance : 0,
    })),
    totalShareBalance,
  }
}

export async function createShareBusinessProfitEntry(
  input: {
    tenantId: string
    shareBusinessId: string
    profitAmount: number
    expenseAmount?: number
    allocatableProfitAmount?: number
    profitDate: Date
    reason?: string
    status?: "draft" | "reviewed" | "approved" | "archived"
    sourceType?: "manual" | "backfill" | "import"
    linkedDividendPeriodId?: string
    notes?: string
    createdByUserId?: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")
  await assertBusinessProfitMutationOpen(
    { sourceType: input.sourceType ?? "manual", tenantId: input.tenantId },
    prisma
  )
  const expenseAmount = input.expenseAmount ?? 0
  const allocatableProfitAmount =
    input.allocatableProfitAmount ??
    Math.max(0, input.profitAmount - expenseAmount)

  if (expenseAmount < 0) {
    throw new Error("Expense amount cannot be negative.")
  }

  if (
    allocatableProfitAmount < 0 ||
    allocatableProfitAmount > input.profitAmount
  ) {
    throw new Error(
      "Allocatable profit must be between zero and the recorded profit amount."
    )
  }

  const profitEntry = await prisma.shareBusinessProfitEntry.create({
    data: {
      tenantId: input.tenantId,
      shareBusinessId: input.shareBusinessId,
      linkedDividendPeriodId: input.linkedDividendPeriodId,
      profitAmount: input.profitAmount,
      expenseAmount,
      allocatableProfitAmount,
      profitDate: input.profitDate,
      reason: input.reason,
      status: input.status ?? "draft",
      sourceType: input.sourceType ?? "manual",
      notes: input.notes,
      createdByUserId: input.createdByUserId,
    },
  })

  await createOptionalAuditLogEntry(
    {
      action: "share_business_profit_entry.created",
      actorType: "user",
      actorUserId: input.createdByUserId ?? null,
      entityId: profitEntry.id,
      entityType: "ShareBusinessProfitEntry",
      metadata: {
        allocatableProfitAmount,
        profitAmount: input.profitAmount,
        sourceType: input.sourceType ?? "manual",
        status: input.status ?? "draft",
      },
      tenantId: input.tenantId,
    },
    prisma
  )

  return profitEntry
}

export async function updateShareBusinessProfitEntry(
  input: {
    tenantId: string
    profitEntryId: string
    profitAmount: number
    expenseAmount?: number
    allocatableProfitAmount?: number
    profitDate: Date
    reason?: string
    status?: "draft" | "reviewed" | "approved" | "archived"
    sourceType?: "manual" | "backfill" | "import"
    linkedDividendPeriodId?: string | null
    notes?: string
    actorUserId?: string | null
  },
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")
  const expenseAmount = input.expenseAmount ?? 0
  const allocatableProfitAmount =
    input.allocatableProfitAmount ??
    Math.max(0, input.profitAmount - expenseAmount)

  if (expenseAmount < 0) {
    throw new Error("Expense amount cannot be negative.")
  }

  if (
    allocatableProfitAmount < 0 ||
    allocatableProfitAmount > input.profitAmount
  ) {
    throw new Error(
      "Allocatable profit must be between zero and the recorded profit amount."
    )
  }

  return prisma.$transaction(async (tx: any) => {
    const existing = await tx.shareBusinessProfitEntry.findFirst({
      where: {
        id: input.profitEntryId,
        tenantId: input.tenantId,
      },
      include: {
        allocations: {
          select: { status: true },
        },
      },
    })

    if (!existing) {
      throw new Error("Business profit entry not found")
    }

    await assertBusinessProfitMutationOpen(
      {
        sourceType: isHistoricalBusinessProfitSource(existing.sourceType)
          ? existing.sourceType
          : (input.sourceType ?? existing.sourceType),
        tenantId: input.tenantId,
      },
      tx as PrismaClient
    )

    if (
      existing.allocations.some(
        (allocation: { status: string }) => allocation.status === "published"
      )
    ) {
      throw new Error("Published profit allocations cannot be edited.")
    }

    await tx.shareProfitAllocation.deleteMany({
      where: {
        tenantId: input.tenantId,
        profitEntryId: input.profitEntryId,
        status: "draft",
      },
    })

    const updatedProfitEntry = await tx.shareBusinessProfitEntry.update({
      where: {
        id: input.profitEntryId,
        tenantId: input.tenantId,
      },
      data: {
        allocatableProfitAmount,
        expenseAmount,
        linkedDividendPeriodId: input.linkedDividendPeriodId ?? null,
        notes: input.notes ?? null,
        profitAmount: input.profitAmount,
        profitDate: input.profitDate,
        reason: input.reason ?? null,
        sourceType: input.sourceType ?? existing.sourceType,
        status: input.status ?? existing.status,
      },
    })

    await createOptionalAuditLogEntry(
      {
        action: "share_business_profit_entry.updated",
        actorType: "user",
        actorUserId: input.actorUserId ?? null,
        entityId: input.profitEntryId,
        entityType: "ShareBusinessProfitEntry",
        metadata: {
          allocatableProfitAmount,
          profitAmount: input.profitAmount,
          sourceType: input.sourceType ?? existing.sourceType,
          status: input.status ?? existing.status,
        },
        tenantId: input.tenantId,
      },
      tx
    )

    return updatedProfitEntry
  })
}

export async function generateShareProfitAllocations(
  input: {
    actorUserId?: string | null
    tenantId: string
    profitEntryId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  return prisma.$transaction(async (tx: any) => {
    const profitEntry = await tx.shareBusinessProfitEntry.findFirst({
      where: {
        id: input.profitEntryId,
        tenantId: input.tenantId,
      },
    })

    if (!profitEntry) throw new Error("Business profit entry not found")
    await assertBusinessProfitMutationOpen(
      { sourceType: profitEntry.sourceType, tenantId: input.tenantId },
      tx as PrismaClient
    )

    const balances = await getMemberShareBalancesAtDate(
      input.tenantId,
      profitEntry.profitDate,
      tx as PrismaClient
    )
    const totalShareBalance = balances.reduce(
      (total, balance) => total + balance.shareBalance,
      0
    )

    if (totalShareBalance <= 0) {
      throw new Error("No member share balances exist on this profit date.")
    }

    const allocations = allocateBusinessProfitByShare({
      profitAmount: Number(
        profitEntry.allocatableProfitAmount ?? profitEntry.profitAmount
      ),
      balances,
    })

    await tx.shareProfitAllocation.deleteMany({
      where: {
        tenantId: input.tenantId,
        profitEntryId: input.profitEntryId,
        status: "draft",
      },
    })

    await tx.shareProfitAllocation.createMany({
      data: allocations.map(
        (allocation: {
          allocatedProfitAmount: number
          memberId: string
          shareBalance: number
          sharePercentage: number
        }) => ({
          tenantId: input.tenantId,
          memberId: allocation.memberId,
          profitEntryId: input.profitEntryId,
          memberShareBalance: allocation.shareBalance,
          totalShareBalance,
          sharePercentage: allocation.sharePercentage,
          allocatedProfitAmount: allocation.allocatedProfitAmount,
          status: "draft",
        })
      ),
    })

    await createOptionalAuditLogEntry(
      {
        action: "share_profit_allocations.generated",
        actorType: "user",
        actorUserId: input.actorUserId ?? null,
        entityId: input.profitEntryId,
        entityType: "ShareBusinessProfitEntry",
        metadata: {
          allocationCount: allocations.length,
          totalShareBalance,
        },
        tenantId: input.tenantId,
      },
      tx
    )

    return tx.shareProfitAllocation.findMany({
      where: {
        tenantId: input.tenantId,
        profitEntryId: input.profitEntryId,
      },
      include: {
        member: {
          select: {
            fullName: true,
            memberNumber: true,
          },
        },
      },
      orderBy: { allocatedProfitAmount: "desc" },
    })
  })
}

export async function publishShareProfitAllocations(
  input: {
    actorUserId?: string | null
    tenantId: string
    profitEntryId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  return prisma.$transaction(async (tx: any) => {
    const profitEntry = await tx.shareBusinessProfitEntry.findFirst({
      where: {
        id: input.profitEntryId,
        tenantId: input.tenantId,
      },
      include: {
        allocations: true,
      },
    })

    if (!profitEntry) throw new Error("Business profit entry not found")
    await assertBusinessProfitMutationOpen(
      { sourceType: profitEntry.sourceType, tenantId: input.tenantId },
      tx as PrismaClient
    )
    if (!profitEntry.linkedDividendPeriodId) {
      throw new Error(
        "Link this profit entry to a dividend period before publishing."
      )
    }
    if (profitEntry.allocations.length === 0) {
      throw new Error("Generate share profit allocations before publishing.")
    }

    await tx.shareProfitAllocation.updateMany({
      where: {
        tenantId: input.tenantId,
        profitEntryId: input.profitEntryId,
        status: "draft",
      },
      data: {
        status: "published",
      },
    })

    for (const allocation of profitEntry.allocations) {
      await tx.dividendAllocation.upsert({
        where: {
          dividendPeriodId_memberId: {
            dividendPeriodId: profitEntry.linkedDividendPeriodId,
            memberId: allocation.memberId,
          },
        },
        update: {
          savingsBasisAmount: allocation.memberShareBalance,
          allocationAmount: allocation.allocatedProfitAmount,
        },
        create: {
          tenantId: input.tenantId,
          dividendPeriodId: profitEntry.linkedDividendPeriodId,
          memberId: allocation.memberId,
          savingsBasisAmount: allocation.memberShareBalance,
          allocationAmount: allocation.allocatedProfitAmount,
        },
      })
    }

    await createOptionalAuditLogEntry(
      {
        action: "share_profit_allocations.published",
        actorType: "user",
        actorUserId: input.actorUserId ?? null,
        entityId: input.profitEntryId,
        entityType: "ShareBusinessProfitEntry",
        metadata: {
          allocationCount: profitEntry.allocations.length,
          dividendPeriodId: profitEntry.linkedDividendPeriodId,
        },
        tenantId: input.tenantId,
      },
      tx
    )

    return tx.shareProfitAllocation.findMany({
      where: {
        tenantId: input.tenantId,
        profitEntryId: input.profitEntryId,
      },
      include: {
        member: {
          select: {
            fullName: true,
            memberNumber: true,
          },
        },
      },
      orderBy: { allocatedProfitAmount: "desc" },
    })
  })
}

export async function getBusinessProfitMigrationWorksheet(
  input: {
    profitEntryId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  const profitEntry = await prisma.shareBusinessProfitEntry.findFirst({
    where: {
      id: input.profitEntryId,
      tenantId: input.tenantId,
    },
    include: {
      allocations: {
        include: {
          member: {
            select: {
              fullName: true,
              joinedAt: true,
              memberNumber: true,
            },
          },
        },
        orderBy: { allocatedProfitAmount: "desc" },
      },
      expenseLines: {
        orderBy: [{ createdAt: "asc" }],
      },
      linkedDividendPeriod: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
      shareBusiness: true,
    },
  })

  if (!profitEntry) {
    throw new Error("Business profit entry not found")
  }

  const eligibilityDate = profitEntry.shareBusiness.startDate
  const eligibleMembers = await getEligibleMemberShareBalancesAtDate(
    input.tenantId,
    eligibilityDate,
    prisma
  )
  const totalShareBalance = roundCurrency(
    eligibleMembers.reduce((total, member) => total + member.shareBalance, 0)
  )
  const expenseLines =
    (profitEntry.expenseLines ?? []).length > 0
      ? (profitEntry.expenseLines ?? []).map((line: any) => ({
          amount: Number(line.amount),
          id: line.id,
          reason: line.reason,
        }))
      : Number(profitEntry.expenseAmount ?? 0) > 0
        ? [
            {
              amount: Number(profitEntry.expenseAmount ?? 0),
              id: "legacy-expense-total",
              reason: "Historical expenses",
            },
          ]
        : []
  const expenseTotal = roundCurrency(
    expenseLines.reduce((total: number, line: any) => total + line.amount, 0)
  )
  const shareableDividend = roundCurrency(
    Number(profitEntry.profitAmount) - expenseTotal
  )
  const existingAllocations = new Map(
    (profitEntry.allocations ?? []).map((allocation: any) => [
      allocation.memberId,
      allocation,
    ])
  )
  const allocatedTotal = roundCurrency(
    (profitEntry.allocations ?? []).reduce(
      (total: number, allocation: any) =>
        total + Number(allocation.allocatedProfitAmount),
      0
    )
  )

  return {
    allocatedTotal,
    allocations: eligibleMembers.map((member) => {
      const allocation = existingAllocations.get(member.memberId) as
        | any
        | undefined

      return {
        allocatedProfitAmount: allocation
          ? Number(allocation.allocatedProfitAmount)
          : 0,
        joinedAt: member.joinedAt,
        memberId: member.memberId,
        memberName: member.memberName,
        memberNumber: member.memberNumber,
        shareBalance: member.shareBalance,
        sharePercentage: allocation
          ? Number(allocation.sharePercentage)
          : totalShareBalance > 0
            ? (member.shareBalance / totalShareBalance) * 100
            : 0,
        status: allocation?.status ?? "draft",
      }
    }),
    eligibleMemberCount: eligibleMembers.length,
    expenseLines,
    expenseTotal,
    profitEntry: {
      allocatableProfitAmount: Number(profitEntry.allocatableProfitAmount),
      hasPublishedAllocations: (profitEntry.allocations ?? []).some(
        (allocation: any) => allocation.status === "published"
      ),
      id: profitEntry.id,
      linkedDividendPeriod: profitEntry.linkedDividendPeriod,
      profitAmount: Number(profitEntry.profitAmount),
      profitDate: profitEntry.profitDate,
      reason: profitEntry.reason,
      status: profitEntry.status,
    },
    remainingAmount: roundCurrency(shareableDividend - allocatedTotal),
    shareableDividend,
    shareBusiness: {
      id: profitEntry.shareBusiness.id,
      name: profitEntry.shareBusiness.name,
      startDate: profitEntry.shareBusiness.startDate,
    },
    totalShareBalance,
  }
}

export async function saveBusinessProfitMigrationWorksheet(
  input: {
    allocationMode: "percentage" | "value"
    allocations: Array<{
      allocatedProfitAmount?: number | null
      memberId: string
      sharePercentage?: number | null
    }>
    expenseLines: Array<{
      amount: number
      reason: string
    }>
    profitAmount: number
    profitDate: Date
    profitEntryId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  return prisma.$transaction(async (tx: any) => {
    const profitEntry = await tx.shareBusinessProfitEntry.findFirst({
      where: {
        id: input.profitEntryId,
        tenantId: input.tenantId,
      },
      include: {
        allocations: true,
        shareBusiness: true,
      },
    })

    if (!profitEntry) {
      throw new Error("Business profit entry not found")
    }

    await assertBusinessProfitMutationOpen(
      { sourceType: profitEntry.sourceType, tenantId: input.tenantId },
      tx as PrismaClient
    )

    if (
      (profitEntry.allocations ?? []).some(
        (allocation: any) => allocation.status === "published"
      )
    ) {
      throw new Error("Published profit allocations cannot be edited.")
    }

    const normalizedExpenseLines = input.expenseLines
      .map((line) => ({
        amount: roundCurrency(Number(line.amount)),
        reason: line.reason.trim(),
      }))
      .filter((line) => line.reason || line.amount > 0)

    for (const line of normalizedExpenseLines) {
      if (!line.reason) {
        throw new Error("Every expense line needs a charge reason.")
      }

      if (line.amount < 0) {
        throw new Error("Expense line amounts cannot be negative.")
      }
    }

    const expenseTotal = roundCurrency(
      normalizedExpenseLines.reduce((total, line) => total + line.amount, 0)
    )
    const shareableDividend = roundCurrency(input.profitAmount - expenseTotal)

    if (shareableDividend < 0) {
      throw new Error("Shareable dividend cannot be negative.")
    }

    const eligibleMembers = await getEligibleMemberShareBalancesAtDate(
      input.tenantId,
      profitEntry.shareBusiness.startDate,
      tx
    )
    const eligibleById = new Map(
      eligibleMembers.map((member) => [member.memberId, member])
    )
    const totalShareBalance = roundCurrency(
      eligibleMembers.reduce((total, member) => total + member.shareBalance, 0)
    )

    if (eligibleMembers.length === 0 || totalShareBalance <= 0) {
      throw new Error(
        "No eligible member share balances exist on this business start date."
      )
    }

    const allocationRows = input.allocations
      .map((allocation) => {
        const member = eligibleById.get(allocation.memberId)

        if (!member) {
          return null
        }

        const sharePercentage =
          input.allocationMode === "percentage"
            ? Number(allocation.sharePercentage ?? 0)
            : shareableDividend > 0
              ? (Number(allocation.allocatedProfitAmount ?? 0) /
                  shareableDividend) *
                100
              : 0
        const allocatedProfitAmount =
          input.allocationMode === "percentage"
            ? roundCurrency(shareableDividend * (sharePercentage / 100))
            : roundCurrency(Number(allocation.allocatedProfitAmount ?? 0))

        if (sharePercentage < 0 || sharePercentage > 100) {
          throw new Error("Member percentage must be between 0 and 100.")
        }

        if (allocatedProfitAmount < 0) {
          throw new Error("Member dividend value cannot be negative.")
        }

        return {
          allocatedProfitAmount,
          member,
          sharePercentage,
        }
      })
      .filter((allocation): allocation is NonNullable<typeof allocation> =>
        Boolean(allocation)
      )

    const allocatedTotal = roundCurrency(
      allocationRows.reduce(
        (total, allocation) => total + allocation.allocatedProfitAmount,
        0
      )
    )

    if (Math.abs(allocatedTotal - shareableDividend) > 0.01) {
      throw new Error("Allocated total must equal the shareable dividend.")
    }

    await tx.shareBusinessProfitEntry.update({
      where: {
        id: input.profitEntryId,
        tenantId: input.tenantId,
      },
      data: {
        allocatableProfitAmount: shareableDividend,
        expenseAmount: expenseTotal,
        profitAmount: input.profitAmount,
        profitDate: input.profitDate,
      },
    })

    await tx.shareBusinessProfitExpenseLine.deleteMany({
      where: {
        profitEntryId: input.profitEntryId,
        tenantId: input.tenantId,
      },
    })

    if (normalizedExpenseLines.length > 0) {
      await tx.shareBusinessProfitExpenseLine.createMany({
        data: normalizedExpenseLines.map((line) => ({
          amount: line.amount,
          profitEntryId: input.profitEntryId,
          reason: line.reason,
          tenantId: input.tenantId,
        })),
      })
    }

    await tx.shareProfitAllocation.deleteMany({
      where: {
        profitEntryId: input.profitEntryId,
        status: "draft",
        tenantId: input.tenantId,
      },
    })

    await tx.shareProfitAllocation.createMany({
      data: allocationRows.map((allocation) => ({
        allocatedProfitAmount: allocation.allocatedProfitAmount,
        memberId: allocation.member.memberId,
        memberShareBalance: allocation.member.shareBalance,
        profitEntryId: input.profitEntryId,
        sharePercentage: allocation.sharePercentage,
        status: "draft",
        tenantId: input.tenantId,
        totalShareBalance,
      })),
    })

    return tx.shareProfitAllocation.findMany({
      where: {
        profitEntryId: input.profitEntryId,
        tenantId: input.tenantId,
      },
      include: {
        member: {
          select: {
            fullName: true,
            memberNumber: true,
          },
        },
      },
      orderBy: { allocatedProfitAmount: "desc" },
    })
  })
}

export async function getResolvedShareAmountForMonth(
  input: {
    tenantId: string
    memberId: string
    month: Date
  },
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) return 0

  const memberOverride = await prisma.memberShareOverride.findFirst({
    where: {
      tenantId: input.tenantId,
      memberId: input.memberId,
      effectiveFrom: {
        lte: input.month,
      },
    },
    orderBy: { effectiveFrom: "desc" },
  })

  if (memberOverride) {
    return Number(memberOverride.amount)
  }

  const tenantDefault = await prisma.tenantShareStructureVersion.findFirst({
    where: {
      tenantId: input.tenantId,
      effectiveFrom: {
        lte: input.month,
      },
    },
    orderBy: { effectiveFrom: "desc" },
  })

  return tenantDefault ? Number(tenantDefault.amount) : 0
}
