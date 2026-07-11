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
    status: string
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
  status?: string | null
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

export type TenantSharePolicySettings = {
  configurationMode: ShareConfigurationMode
  compulsoryShareUnits: number
  id: string | null
  maximumShareUnits: number
  unitAmount: number
}

export type ShareConfigurationMode = "monthly_history" | "unit_based"

export type TenantMigrationSetupMode =
  | "historical_backfill"
  | "brought_forward"

export type TenantMigrationSetupSettings = {
  id: string | null
  mode: TenantMigrationSetupMode
}

export type MemberShareApplicationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"

export type MemberShareApplicationRow = {
  approvedUnits: number | null
  createdAt: Date
  id: string
  memberEmail: string | null
  memberId: string
  memberName: string
  memberNumber: string
  notes: string | null
  requestedByUserId: string | null
  requestedUnits: number
  reviewedAt: Date | null
  reviewedByUserId: string | null
  reviewNotes: string | null
  shareValueSnapshot: number
  status: MemberShareApplicationStatus
  unitAmountSnapshot: number
}

export type MemberUnitSharePosition = {
  approvedOptionalUnits: number
  compulsoryUnits: number
  maximumUnits: number
  pendingOptionalUnits: number
  totalApprovedUnits: number
  totalApprovedValue: number
  totalPendingUnits: number
  totalPendingValue: number
  unitAmount: number
}

export const defaultTenantSharePolicy: TenantSharePolicySettings = {
  configurationMode: "monthly_history",
  compulsoryShareUnits: 1,
  id: null,
  maximumShareUnits: 20,
  unitAmount: 10000,
}

const shareConfigurationModes = new Set(["monthly_history", "unit_based"])
const tenantMigrationSetupModes = new Set([
  "historical_backfill",
  "brought_forward",
])

export const defaultTenantMigrationSetup: TenantMigrationSetupSettings = {
  id: null,
  mode: "historical_backfill",
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

function normalizeTenantSharePolicy(policy: any): TenantSharePolicySettings {
  const configurationMode: ShareConfigurationMode =
    (policy?.shareConfigurationMode ??
      defaultTenantSharePolicy.configurationMode) as ShareConfigurationMode

  if (configurationMode === "monthly_history") {
    return {
      ...defaultTenantSharePolicy,
      configurationMode,
      id: policy?.id ?? defaultTenantSharePolicy.id,
    }
  }

  return {
    ...defaultTenantSharePolicy,
    ...(policy
      ? {
          configurationMode,
          compulsoryShareUnits: Number(
            policy.compulsoryShareUnits ??
              defaultTenantSharePolicy.compulsoryShareUnits
          ),
          id: policy.id,
          maximumShareUnits: Number(
            policy.maximumShareUnits ??
              defaultTenantSharePolicy.maximumShareUnits
          ),
          unitAmount: Number(
            policy.shareUnitAmount ?? defaultTenantSharePolicy.unitAmount
          ),
        }
      : {}),
  }
}

function normalizeTenantMigrationSetup(
  policy: any
): TenantMigrationSetupSettings {
  const mode =
    policy?.migrationSetupMode ?? defaultTenantMigrationSetup.mode

  return {
    ...defaultTenantMigrationSetup,
    id: policy?.id ?? defaultTenantMigrationSetup.id,
    mode: tenantMigrationSetupModes.has(mode)
      ? (mode as TenantMigrationSetupMode)
      : defaultTenantMigrationSetup.mode,
  }
}

function normalizeMemberShareApplication(
  application: any
): MemberShareApplicationRow {
  return {
    approvedUnits:
      application.approvedUnits === null ||
      application.approvedUnits === undefined
        ? null
        : Number(application.approvedUnits),
    createdAt: application.createdAt,
    id: application.id,
    memberEmail: application.member?.email ?? null,
    memberId: application.memberId,
    memberName: application.member?.fullName ?? "Member",
    memberNumber: application.member?.memberNumber ?? "",
    notes: application.notes ?? null,
    requestedByUserId: application.requestedByUserId ?? null,
    requestedUnits: Number(application.requestedUnits),
    reviewedAt: application.reviewedAt ?? null,
    reviewedByUserId: application.reviewedByUserId ?? null,
    reviewNotes: application.reviewNotes ?? null,
    shareValueSnapshot: Number(application.shareValueSnapshot),
    status: application.status,
    unitAmountSnapshot: Number(application.unitAmountSnapshot),
  }
}

function assertShareConfigurationMode(value: string) {
  if (!shareConfigurationModes.has(value)) {
    throw new Error("Share configuration mode is not supported.")
  }
}

function assertTenantMigrationSetupMode(value: string) {
  if (!tenantMigrationSetupModes.has(value)) {
    throw new Error("Tenant migration setup mode is not supported.")
  }
}

export function recommendTenantMigrationSetupMode(input: {
  memberCount?: number | null
  now?: Date
  startDate?: Date | string | null
}): TenantMigrationSetupMode | null {
  if (!input.startDate) return null

  const now = input.now ?? new Date()
  const startDate =
    input.startDate instanceof Date
      ? input.startDate
      : dateFromDateOnly(input.startDate)
  const ageInMonths = Math.max(
    0,
    (now.getUTCFullYear() - startDate.getUTCFullYear()) * 12 +
      (now.getUTCMonth() - startDate.getUTCMonth())
  )

  if (ageInMonths <= 12) {
    return "historical_backfill"
  }

  if (input.memberCount === null || input.memberCount === undefined) {
    return null
  }

  const workload = Math.max(0, input.memberCount) * ageInMonths

  return workload <= 240 ? "historical_backfill" : "brought_forward"
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

function assertPositiveAmount(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be greater than 0.`)
  }
}

function assertNonNegativeInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a whole number 0 or greater.`)
  }
}

function assertPositiveInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive whole number.`)
  }
}

function resolveShareUnitSettingsForMode(
  configurationMode: ShareConfigurationMode,
  input: {
    compulsoryShareUnits?: number
    maximumShareUnits?: number
    unitAmount?: number
  },
  currentPolicy: TenantSharePolicySettings
) {
  if (configurationMode === "monthly_history") {
    return {
      compulsoryShareUnits: defaultTenantSharePolicy.compulsoryShareUnits,
      maximumShareUnits: defaultTenantSharePolicy.maximumShareUnits,
      unitAmount: defaultTenantSharePolicy.unitAmount,
    }
  }

  const unitAmount = input.unitAmount ?? currentPolicy.unitAmount
  const compulsoryShareUnits =
    input.compulsoryShareUnits ?? currentPolicy.compulsoryShareUnits
  const maximumShareUnits =
    input.maximumShareUnits ?? currentPolicy.maximumShareUnits

  assertPositiveAmount(unitAmount, "Share unit amount")
  assertNonNegativeInteger(compulsoryShareUnits, "Compulsory share units")
  assertPositiveInteger(maximumShareUnits, "Maximum share units")

  if (maximumShareUnits < compulsoryShareUnits) {
    throw new Error(
      "Maximum share units cannot be below compulsory share units."
    )
  }

  return {
    compulsoryShareUnits,
    maximumShareUnits,
    unitAmount,
  }
}

async function readOptionalTenantPolicy<T>(
  prisma:
    | {
        tenantPolicy?: {
          findUnique?: (input: unknown) => Promise<T>
        }
      }
    | null
    | undefined,
  read: (delegate: { findUnique: (input: unknown) => Promise<T> }) => Promise<T>
): Promise<T | null> {
  const delegate = prisma?.tenantPolicy

  if (!delegate || typeof delegate.findUnique !== "function") {
    return null
  }

  try {
    return await read(
      delegate as { findUnique: (input: unknown) => Promise<T> }
    )
  } catch (error) {
    if (isPrismaMissingColumnError(error)) {
      return null
    }

    throw error
  }
}

async function getTenantShareConfigurationMode(
  tenantId: string,
  prisma: PrismaClient
): Promise<ShareConfigurationMode> {
  const policy = await readOptionalTenantPolicy(prisma as any, (tenantPolicy) =>
    tenantPolicy.findUnique({
      where: { tenantId },
    })
  )

  return normalizeTenantSharePolicy(policy).configurationMode
}

async function assertMonthlyShareHistoryModelSelected(
  tenantId: string,
  prisma: PrismaClient
) {
  const configurationMode = await getTenantShareConfigurationMode(
    tenantId,
    prisma
  )

  if (configurationMode !== "monthly_history") {
    throw new Error(
      "Dated share history can only be edited when the monthly share history model is selected."
    )
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
          status: entry.status ?? "draft",
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
      migrationSetup: defaultTenantMigrationSetup,
      sharePolicy: defaultTenantSharePolicy,
      shareBusinesses: [],
      shareStructureVersions: [],
      tenant,
    }
  }

  const [
    tenant,
    sharePolicy,
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
        currentSize: true,
        currencyCode: true,
      },
    }),
    readOptionalTenantPolicy(prisma, (tenantPolicy) =>
      tenantPolicy.findUnique({
        where: { tenantId },
      })
    ),
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
    migrationSetup: normalizeTenantMigrationSetup(sharePolicy),
    sharePolicy: normalizeTenantSharePolicy(sharePolicy),
    shareBusinesses,
    shareStructureVersions,
    tenant,
  }
}

export async function getTenantSharePolicy(
  tenantId: string,
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any

  if (!prisma) {
    return defaultTenantSharePolicy
  }

  const policy = await readOptionalTenantPolicy(prisma, (tenantPolicy) =>
    tenantPolicy.findUnique({
      where: { tenantId },
    })
  )

  return normalizeTenantSharePolicy(policy)
}

export async function getTenantMigrationSetup(
  tenantId: string,
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any

  if (!prisma) {
    return defaultTenantMigrationSetup
  }

  const policy = await readOptionalTenantPolicy(prisma, (tenantPolicy) =>
    tenantPolicy.findUnique({
      where: { tenantId },
    })
  )

  return normalizeTenantMigrationSetup(policy)
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

export async function updateTenantSharePolicy(
  input: {
    actorUserId?: string | null
    configurationMode?: ShareConfigurationMode
    compulsoryShareUnits?: number
    maximumShareUnits?: number
    tenantId: string
    unitAmount?: number
  },
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  const previousPolicy = await readOptionalTenantPolicy(
    prisma,
    (tenantPolicy) =>
      tenantPolicy.findUnique({
        where: { tenantId: input.tenantId },
      })
  )
  const currentPolicy = normalizeTenantSharePolicy(previousPolicy)
  const configurationMode =
    input.configurationMode ?? currentPolicy.configurationMode
  assertShareConfigurationMode(configurationMode)
  const { compulsoryShareUnits, maximumShareUnits, unitAmount } =
    resolveShareUnitSettingsForMode(configurationMode, input, currentPolicy)

  const policy = await prisma.tenantPolicy.upsert({
    create: {
      tenantId: input.tenantId,
      compulsoryShareUnits,
      maximumShareUnits,
      shareConfigurationMode: configurationMode,
      shareUnitAmount: unitAmount,
    },
    update: {
      compulsoryShareUnits,
      maximumShareUnits,
      shareConfigurationMode: configurationMode,
      shareUnitAmount: unitAmount,
    },
    where: { tenantId: input.tenantId },
  })

  await createAuditLogEntry(
    {
      action: "tenant_policy.share_policy_updated",
      actorType: "user",
      actorUserId: input.actorUserId ?? null,
      entityId: policy.id,
      entityType: "TenantPolicy",
      metadata: {
        next: normalizeTenantSharePolicy(policy),
        previous: previousPolicy
          ? normalizeTenantSharePolicy(previousPolicy)
          : null,
      },
      tenantId: input.tenantId,
    },
    prisma
  )

  return normalizeTenantSharePolicy(policy)
}

export async function updateTenantMigrationSetup(
  input: {
    actorUserId?: string | null
    mode: TenantMigrationSetupMode
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  assertTenantMigrationSetupMode(input.mode)

  const previousPolicy = await readOptionalTenantPolicy(
    prisma,
    (tenantPolicy) =>
      tenantPolicy.findUnique({
        where: { tenantId: input.tenantId },
      })
  )
  const policy = await prisma.tenantPolicy.upsert({
    create: {
      migrationSetupMode: input.mode,
      tenantId: input.tenantId,
    },
    update: {
      migrationSetupMode: input.mode,
    },
    where: { tenantId: input.tenantId },
  })

  await createAuditLogEntry(
    {
      action: "tenant_policy.migration_setup_mode_updated",
      actorType: "user",
      actorUserId: input.actorUserId ?? null,
      entityId: policy.id,
      entityType: "TenantPolicy",
      metadata: {
        next: normalizeTenantMigrationSetup(policy),
        previous: previousPolicy
          ? normalizeTenantMigrationSetup(previousPolicy)
          : null,
      },
      tenantId: input.tenantId,
    },
    prisma
  )

  return normalizeTenantMigrationSetup(policy)
}

async function assertUnitShareApplicationModelSelected(
  tenantId: string,
  prisma: PrismaClient
) {
  const policy = await getTenantSharePolicy(tenantId, prisma)

  if (policy.configurationMode !== "unit_based") {
    throw new Error(
      "Share applications are only available when the unit-based shareholding model is selected."
    )
  }

  return policy
}

async function assertMemberInTenant(
  input: {
    memberId: string
    tenantId: string
  },
  prisma: any
) {
  const member = await prisma.member.findFirst({
    select: {
      fullName: true,
      id: true,
      memberNumber: true,
    },
    where: {
      id: input.memberId,
      tenantId: input.tenantId,
    },
  })

  if (!member) {
    throw new Error("Member does not belong to this cooperative.")
  }

  return member
}

async function getMemberShareApplicationUnitTotals(
  input: {
    excludeApplicationId?: string
    memberId: string
    tenantId: string
  },
  prisma: any
) {
  const applications = await prisma.memberShareApplication.findMany({
    select: {
      approvedUnits: true,
      id: true,
      requestedUnits: true,
      status: true,
    },
    where: {
      memberId: input.memberId,
      tenantId: input.tenantId,
      status: {
        in: ["approved", "pending"],
      },
      ...(input.excludeApplicationId
        ? {
            id: {
              not: input.excludeApplicationId,
            },
          }
        : {}),
    },
  })

  return applications.reduce(
    (
      totals: {
        approvedOptionalUnits: number
        pendingOptionalUnits: number
      },
      application: any
    ) => {
      if (application.status === "approved") {
        totals.approvedOptionalUnits += Number(
          application.approvedUnits ?? application.requestedUnits
        )
      }

      if (application.status === "pending") {
        totals.pendingOptionalUnits += Number(application.requestedUnits)
      }

      return totals
    },
    {
      approvedOptionalUnits: 0,
      pendingOptionalUnits: 0,
    }
  )
}

export async function getMemberUnitSharePosition(
  input: {
    memberId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<MemberUnitSharePosition> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  const policy = await assertUnitShareApplicationModelSelected(
    input.tenantId,
    prisma
  )
  await assertMemberInTenant(input, prisma)
  const totals = await getMemberShareApplicationUnitTotals(input, prisma)
  const totalApprovedUnits =
    policy.compulsoryShareUnits + totals.approvedOptionalUnits
  const totalPendingUnits = totalApprovedUnits + totals.pendingOptionalUnits

  return {
    approvedOptionalUnits: totals.approvedOptionalUnits,
    compulsoryUnits: policy.compulsoryShareUnits,
    maximumUnits: policy.maximumShareUnits,
    pendingOptionalUnits: totals.pendingOptionalUnits,
    totalApprovedUnits,
    totalApprovedValue: roundCurrency(totalApprovedUnits * policy.unitAmount),
    totalPendingUnits,
    totalPendingValue: roundCurrency(totalPendingUnits * policy.unitAmount),
    unitAmount: policy.unitAmount,
  }
}

export async function listMemberShareApplications(
  input: {
    memberId?: string
    status?: MemberShareApplicationStatus
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<MemberShareApplicationRow[]> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) return []

  const applications = await prisma.memberShareApplication.findMany({
    include: {
      member: {
        select: {
          email: true,
          fullName: true,
          memberNumber: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    where: {
      tenantId: input.tenantId,
      ...(input.memberId ? { memberId: input.memberId } : {}),
      ...(input.status ? { status: input.status } : {}),
    },
  })

  return applications.map(normalizeMemberShareApplication)
}

export async function createMemberShareApplication(
  input: {
    memberId: string
    notes?: string | null
    requestedByUserId?: string | null
    requestedUnits: number
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<MemberShareApplicationRow> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  assertPositiveInteger(input.requestedUnits, "Requested share units")
  const policy = await assertUnitShareApplicationModelSelected(
    input.tenantId,
    prisma
  )
  await assertMemberInTenant(input, prisma)
  const totals = await getMemberShareApplicationUnitTotals(input, prisma)
  const availableUnits =
    policy.maximumShareUnits -
    policy.compulsoryShareUnits -
    totals.approvedOptionalUnits -
    totals.pendingOptionalUnits

  if (input.requestedUnits > availableUnits) {
    throw new Error(
      "Requested shares exceed the member's available optional share units."
    )
  }

  const shareValueSnapshot = roundCurrency(
    input.requestedUnits * policy.unitAmount
  )
  const application = await prisma.memberShareApplication.create({
    data: {
      memberId: input.memberId,
      notes: input.notes?.trim() || null,
      requestedByUserId: input.requestedByUserId ?? null,
      requestedUnits: input.requestedUnits,
      shareValueSnapshot,
      tenantId: input.tenantId,
      unitAmountSnapshot: policy.unitAmount,
    },
    include: {
      member: {
        select: {
          email: true,
          fullName: true,
          memberNumber: true,
        },
      },
    },
  })

  await createOptionalAuditLogEntry(
    {
      action: "member_share_application.created",
      actorType: input.requestedByUserId ? "user" : "system",
      actorUserId: input.requestedByUserId ?? null,
      entityId: application.id,
      entityType: "MemberShareApplication",
      metadata: {
        memberId: input.memberId,
        requestedUnits: input.requestedUnits,
        shareValueSnapshot,
        unitAmountSnapshot: policy.unitAmount,
      },
      tenantId: input.tenantId,
    },
    prisma
  )

  return normalizeMemberShareApplication(application)
}

export async function reviewMemberShareApplication(
  input: {
    actorUserId?: string | null
    applicationId: string
    approvedUnits?: number
    decision: "approved" | "rejected"
    effectiveDate?: Date
    reviewNotes?: string | null
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<MemberShareApplicationRow> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  if (input.decision !== "approved" && input.decision !== "rejected") {
    throw new Error("Share application review decision is not supported.")
  }

  const application = await prisma.memberShareApplication.findFirst({
    include: {
      member: {
        select: {
          email: true,
          fullName: true,
          memberNumber: true,
        },
      },
    },
    where: {
      id: input.applicationId,
      tenantId: input.tenantId,
    },
  })

  if (!application) {
    throw new Error("Share application was not found.")
  }

  if (application.status !== "pending") {
    throw new Error("Only pending share applications can be reviewed.")
  }

  const reviewedAt = new Date()
  const reviewNotes = input.reviewNotes?.trim() || null

  if (input.decision === "rejected") {
    const rejectedApplication = await prisma.memberShareApplication.update({
      data: {
        approvedUnits: null,
        reviewedAt,
        reviewedByUserId: input.actorUserId ?? null,
        reviewNotes,
        status: "rejected",
      },
      include: {
        member: {
          select: {
            email: true,
            fullName: true,
            memberNumber: true,
          },
        },
      },
      where: { id: application.id },
    })

    await createOptionalAuditLogEntry(
      {
        action: "member_share_application.rejected",
        actorType: "user",
        actorUserId: input.actorUserId ?? null,
        entityId: application.id,
        entityType: "MemberShareApplication",
        metadata: {
          memberId: application.memberId,
          requestedUnits: Number(application.requestedUnits),
          reviewNotes,
        },
        tenantId: input.tenantId,
      },
      prisma
    )

    return normalizeMemberShareApplication(rejectedApplication)
  }

  const policy = await assertUnitShareApplicationModelSelected(
    input.tenantId,
    prisma
  )
  const approvedUnits =
    input.approvedUnits ?? Number(application.requestedUnits)
  assertPositiveInteger(approvedUnits, "Approved share units")

  if (approvedUnits > Number(application.requestedUnits)) {
    throw new Error("Approved share units cannot exceed requested units.")
  }

  const totals = await getMemberShareApplicationUnitTotals(
    {
      excludeApplicationId: application.id,
      memberId: application.memberId,
      tenantId: input.tenantId,
    },
    prisma
  )

  if (
    policy.compulsoryShareUnits + totals.approvedOptionalUnits + approvedUnits >
    policy.maximumShareUnits
  ) {
    throw new Error("Approved shares would exceed the member share cap.")
  }

  const approvedAmount = roundCurrency(
    approvedUnits * Number(application.unitAmountSnapshot)
  )

  return prisma.$transaction(async (tx: any) => {
    const approvedApplication = await tx.memberShareApplication.update({
      data: {
        approvedUnits,
        reviewedAt,
        reviewedByUserId: input.actorUserId ?? null,
        reviewNotes,
        status: "approved",
      },
      include: {
        member: {
          select: {
            email: true,
            fullName: true,
            memberNumber: true,
          },
        },
      },
      where: { id: application.id },
    })

    await createMemberShareLedgerEntry(
      {
        amount: approvedAmount,
        createdByUserId: input.actorUserId ?? undefined,
        effectiveDate: input.effectiveDate ?? reviewedAt,
        memberId: application.memberId,
        notes: reviewNotes ?? "Approved optional share application",
        sourceId: application.id,
        sourceType: "share_application",
        tenantId: input.tenantId,
      },
      tx
    )

    await createOptionalAuditLogEntry(
      {
        action: "member_share_application.approved",
        actorType: "user",
        actorUserId: input.actorUserId ?? null,
        entityId: application.id,
        entityType: "MemberShareApplication",
        metadata: {
          approvedAmount,
          approvedUnits,
          memberId: application.memberId,
          requestedUnits: Number(application.requestedUnits),
          unitAmountSnapshot: Number(application.unitAmountSnapshot),
        },
        tenantId: input.tenantId,
      },
      tx
    )

    return normalizeMemberShareApplication(approvedApplication)
  })
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
  await assertMonthlyShareHistoryModelSelected(input.tenantId, prisma)

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
  await assertMonthlyShareHistoryModelSelected(input.tenantId, prisma)

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
  await assertMonthlyShareHistoryModelSelected(input.tenantId, prisma)

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
      status?: "draft" | "pending" | "reviewed" | "completed" | "approved" | "archived"
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
          status:
            profitEntry.status ??
            (input.status === "completed" ? "reviewed" : "draft"),
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
      | "share_application"
      | "payment_receipt"
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
    status?: "draft" | "pending" | "reviewed" | "completed" | "approved" | "archived"
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
    status?: "draft" | "pending" | "reviewed" | "completed" | "approved" | "archived"
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

export async function generateHistoricalBackfillShareProfitAllocations(
  input: {
    actorUserId?: string | null
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  const policy = await prisma.tenantPolicy.findUnique({
    where: { tenantId: input.tenantId },
  })

  if (policy?.migrationSetupMode !== "historical_backfill") {
    throw new Error(
      "Historical backfill dividend calculation requires historical backfill setup mode."
    )
  }

  if (policy?.shareConfigurationMode !== "unit_based") {
    throw new Error(
      "Historical backfill dividend calculation requires unit-based shares."
    )
  }

  const profitEntries = await prisma.shareBusinessProfitEntry.findMany({
    select: { id: true },
    where: {
      tenantId: input.tenantId,
      sourceType: "backfill",
      status: {
        not: "archived",
      },
    },
    orderBy: [{ profitDate: "asc" }, { createdAt: "asc" }],
  })

  if (profitEntries.length === 0) {
    throw new Error("No historical business profit entries are available.")
  }

  const generatedAllocations = []
  for (const profitEntry of profitEntries) {
    const allocations = await generateShareProfitAllocations(
      {
        actorUserId: input.actorUserId ?? null,
        profitEntryId: profitEntry.id,
        tenantId: input.tenantId,
      },
      prisma
    )
    generatedAllocations.push(...allocations)
  }

  return generatedAllocations
}

async function rebuildDividendPeriodAllocationsFromPublishedProfit(
  input: {
    dividendPeriodId: string
    tenantId: string
  },
  tx: any
) {
  const linkedProfitEntries = await tx.shareBusinessProfitEntry.findMany({
    where: {
      linkedDividendPeriodId: input.dividendPeriodId,
      tenantId: input.tenantId,
      status: {
        not: "archived",
      },
    },
    include: {
      allocations: true,
    },
  })
  const memberAllocations = new Map<
    string,
    {
      allocationAmount: number
      savingsBasisAmount: number
    }
  >()

  for (const profitEntry of linkedProfitEntries) {
    for (const allocation of profitEntry.allocations ?? []) {
      if (allocation.status !== "published") continue

      const current = memberAllocations.get(allocation.memberId) ?? {
        allocationAmount: 0,
        savingsBasisAmount: 0,
      }
      current.allocationAmount = roundCurrency(
        current.allocationAmount + Number(allocation.allocatedProfitAmount)
      )
      current.savingsBasisAmount = roundCurrency(
        current.savingsBasisAmount + Number(allocation.memberShareBalance)
      )
      memberAllocations.set(allocation.memberId, current)
    }
  }

  await tx.dividendAllocation.deleteMany({
    where: {
      dividendPeriodId: input.dividendPeriodId,
      tenantId: input.tenantId,
    },
  })

  const periodAllocations = Array.from(memberAllocations.entries()).map(
    ([memberId, allocation]) => ({
      allocationAmount: allocation.allocationAmount,
      dividendPeriodId: input.dividendPeriodId,
      memberId,
      savingsBasisAmount: allocation.savingsBasisAmount,
      tenantId: input.tenantId,
    })
  )

  if (periodAllocations.length > 0) {
    await tx.dividendAllocation.createMany({
      data: periodAllocations,
    })
  }

  const allLinkedEntriesPublished =
    linkedProfitEntries.length > 0 &&
    linkedProfitEntries.every(
      (profitEntry: { allocations?: Array<{ status: string }> }) =>
        (profitEntry.allocations ?? []).length > 0 &&
        (profitEntry.allocations ?? []).every(
          (allocation) => allocation.status === "published"
        )
    )

  if (allLinkedEntriesPublished) {
    await tx.dividendPeriod.update({
      data: {
        publishedAt: new Date(),
        status: "published",
      },
      where: {
        id: input.dividendPeriodId,
        tenantId: input.tenantId,
      },
    })
  }

  return {
    allLinkedEntriesPublished,
    periodAllocationCount: periodAllocations.length,
    periodAllocationTotal: roundCurrency(
      periodAllocations.reduce(
        (total, allocation) => total + allocation.allocationAmount,
        0
      )
    ),
  }
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

    const periodAllocationSummary =
      await rebuildDividendPeriodAllocationsFromPublishedProfit(
        {
          dividendPeriodId: profitEntry.linkedDividendPeriodId,
          tenantId: input.tenantId,
        },
        tx
      )

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
          dividendPeriodPublished:
            periodAllocationSummary.allLinkedEntriesPublished,
          periodAllocationCount: periodAllocationSummary.periodAllocationCount,
          periodAllocationTotal: periodAllocationSummary.periodAllocationTotal,
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

  const configurationMode = await getTenantShareConfigurationMode(
    input.tenantId,
    prisma
  )

  if (configurationMode !== "monthly_history") {
    return 0
  }

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
