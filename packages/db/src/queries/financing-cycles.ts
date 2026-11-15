import type {
  FinancingCapacityBasis,
  FinancingCycleStatus,
  LoanIntakeReservationMode,
  LoanRequestStatus,
  LoanType,
  PrismaClient,
} from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError } from "../query-error"
import { getMobileBillingCommitmentAmount } from "./cooperative-mobile-billing"
import {
  excludeBroughtForwardLoanProductWhere,
  isBroughtForwardLoanProduct,
} from "./loan-product-rules"

export type FinancingPolicySnapshot = {
  activeFinancingBlocksEmergency: boolean
  activeFinancingBlocksProcurement: boolean
  disbursementRequiresDeployableFunds: boolean
  financingCapacityBasis: FinancingCapacityBasis
  foodPurchaseAllowsCommitmentReductionDuringPayback: boolean
  foodPurchaseMaximumPaybackMonths: number
  loanIntakeReservationMode: LoanIntakeReservationMode
  loanEligibilityMultiple: number
  normalLoanAllocationPercentage: number
  normalLoanTermMonths: number
  procurementAllowsCommitmentReductionDuringPayback: boolean
  procurementMaximumPaybackMonths: number
  quickLoanAllocationPercentage: number
  quickLoanTermMonths: number
  requiresDualLoanApproval: boolean
  reserveBufferAmount: number
  specialSavingsCountsForEligibility: boolean
  strictCommitmentDuringFinancing: boolean
}

type FinancingCyclePeriod = {
  periodEnd: Date
  periodStart: Date
}

export type FinancingCycleUsageByType = {
  approvedAmount: number
  budgetAmount: number
  disbursedAmount: number
  heldAmount: number
  remainingAmount: number
  requestedReservedAmount: number
}

export type FinancingCycleHealthWarning = {
  key:
    | "closed_cycle"
    | "collections_below_projected"
    | "missing_cycle"
    | "normal_quota_closed"
    | "paused_cycle"
    | "quick_quota_closed"
  label: string
  severity: "critical" | "warning"
}

export type MonthlyFinancingCyclePreview = FinancingCyclePeriod & {
  capacityBasis: FinancingCapacityBasis
  collectionCoverage: number
  existingCycle: {
    id: string
    status: FinancingCycleStatus
  } | null
  intakeReservationMode: LoanIntakeReservationMode
  normal: FinancingCycleUsageByType
  normalAllocationPercentage: number
  projectedCommitmentAmount: number
  quick: FinancingCycleUsageByType
  quickAllocationPercentage: number
  receivedContributionAmount: number
  reserveBufferAmount: number
  totalCapacityAmount: number
}

export type LoanProductSettingsRow = {
  code: string | null
  id: string | null
  isActive: boolean
  loanType: LoanType
  maxSavingsMultiple: number
  name: string
  termMonths: number
}

export type TenantFinancingSettingsWorkspace = {
  currentCyclePreview: MonthlyFinancingCyclePreview
  policy: FinancingPolicySnapshot & {
    id: string | null
  }
  products: {
    normal: LoanProductSettingsRow
    quick: LoanProductSettingsRow
  }
}

export type MonthlyFinancingCycleHealth = FinancingCyclePeriod & {
  collectionCoverage: number
  cycle: {
    id: string
    status: FinancingCycleStatus
  } | null
  deployableFunds: DeployableFundsSnapshot
  intakeStatus: "closed" | "missing" | "open" | "paused"
  normal: FinancingCycleUsageByType
  normalAllocationPercentage: number
  projectedCommitmentAmount: number
  quick: FinancingCycleUsageByType
  quickAllocationPercentage: number
  receivedContributionAmount: number
  reserveBufferAmount: number
  totalCapacityAmount: number
  warnings: FinancingCycleHealthWarning[]
}

export type LoanRequestCapacityCheck = {
  budgetAmount: number
  disbursedAmount: number
  financingCycleId: string
  heldAmount: number
  loanType: LoanType
  remainingAmount: number
  requestedAmount: number
  requestedReservedAmount: number
}

/**
 * Funding side of deployable funds (ADR-20261113-deployable-funds-member-funds-held).
 * Every amount is tenant-wide and non-negative.
 */
export type MemberFundsHeldBreakdown = {
  /** max(0, applied opening financing − applied opening savings − share capital). */
  cooperativeOpeningEquityAmount: number
  /** Savings + share capital + cooperative opening equity. */
  memberFundsHeldAmount: number
  /** Contributions + applied opening savings − special-savings refunds paid. */
  memberSavingsHeldAmount: number
  /** Applied opening share capital + share capital paid outside contributions. */
  memberShareCapitalHeldAmount: number
  openingSavingsAmount: number
  openingShareCapitalAmount: number
  /** Receipt share allocations, pay-separately share charges, historical purchases. */
  separateSharePurchaseAmount: number
  specialSavingsWithdrawalAmount: number
  totalContributionAmount: number
}

export type DeployableFundsSnapshot = MemberFundsHeldBreakdown & {
  approvedHoldAmount: number
  /** Funds held − outstanding financing − reserve − mobile billing, before approved holds. */
  availablePoolAmount: number
  deployableFunds: number
  mobileBillingCommitmentAmount: number
  outstandingFinancingAmount: number
  reserveBufferAmount: number
}

export type MonthlyFinancingCycleInput = {
  periodStart?: Date
  tenantId: string
}

export type MonthlyFinancingCycleStatusInput = {
  actorUserId: string
  expectedStatus?: FinancingCycleStatus
  financingCycleId: string
  status: Extract<FinancingCycleStatus, "closed" | "open" | "paused">
  statusNote?: string
  tenantId: string
}

export type TenantFinancingCyclePolicyInput = {
  actorUserId: string
  activeFinancingBlocksEmergency?: boolean
  activeFinancingBlocksProcurement?: boolean
  disbursementRequiresDeployableFunds?: boolean
  financingCapacityBasis?: FinancingCapacityBasis
  foodPurchaseAllowsCommitmentReductionDuringPayback?: boolean
  foodPurchaseMaximumPaybackMonths?: number
  loanIntakeReservationMode?: LoanIntakeReservationMode
  loanEligibilityMultiple?: number
  normalLoanAllocationPercentage?: number
  normalLoanTermMonths?: number
  procurementAllowsCommitmentReductionDuringPayback?: boolean
  procurementMaximumPaybackMonths?: number
  quickLoanAllocationPercentage?: number
  quickLoanTermMonths?: number
  requiresDualLoanApproval?: boolean
  reserveBufferAmount?: number
  specialSavingsCountsForEligibility?: boolean
  strictCommitmentDuringFinancing?: boolean
  tenantId: string
}

export type LoanProductSettingsInput = {
  actorUserId: string
  code?: string | null
  isActive: boolean
  loanProductId?: string | null
  loanType: LoanType
  maxSavingsMultiple: number
  name: string
  tenantId: string
  termMonths: number
}

export type LoanRequestCapacityInput = {
  loanProduct: {
    loanType: LoanType
  }
  requestedAmount: number
  requestedAt?: Date
  tenantId: string
}

export type DeployableFundsInput = {
  excludeLoanId?: string
  tenantId: string
}

export const DEFAULT_FINANCING_POLICY: FinancingPolicySnapshot = {
  activeFinancingBlocksEmergency: true,
  activeFinancingBlocksProcurement: true,
  disbursementRequiresDeployableFunds: true,
  financingCapacityBasis: "projected_monthly_commitments",
  foodPurchaseAllowsCommitmentReductionDuringPayback: false,
  foodPurchaseMaximumPaybackMonths: 1,
  loanIntakeReservationMode: "submitted_request_amount",
  loanEligibilityMultiple: 2,
  normalLoanAllocationPercentage: 70,
  normalLoanTermMonths: 18,
  procurementAllowsCommitmentReductionDuringPayback: false,
  procurementMaximumPaybackMonths: 12,
  quickLoanAllocationPercentage: 30,
  quickLoanTermMonths: 3,
  requiresDualLoanApproval: false,
  reserveBufferAmount: 0,
  specialSavingsCountsForEligibility: true,
  strictCommitmentDuringFinancing: true,
}

export async function getTenantFinancingPolicySnapshot(
  tenantId: string,
  prismaOverride?: PrismaClient
): Promise<FinancingPolicySnapshot> {
  const prisma = getPrisma(prismaOverride)
  const policy = await prisma.tenantPolicy.findUnique({ where: { tenantId } })

  return normalizePolicy(policy)
}

const REQUEST_RESERVED_STATUSES: LoanRequestStatus[] = [
  "submitted",
  "under_review",
  "approved",
]
const ACTIVE_FINANCING_STATUSES = ["active", "disbursed"] as const

function getPrisma(prismaOverride?: PrismaClient) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma
}

function roundMoney(value: number) {
  return Number(value.toFixed(2))
}

function assertPercentage(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw ExpectedQueryError.validation(`${label} must be between 0 and 100.`)
  }
}

function assertAllocationPercentages(quick: number, normal: number) {
  assertPercentage(quick, "Quick loan allocation percentage")
  assertPercentage(normal, "Normal loan allocation percentage")

  if (roundMoney(quick + normal) !== 100) {
    throw ExpectedQueryError.validation(
      "Quick and normal loan allocation percentages must total 100."
    )
  }
}

function assertPositiveInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw ExpectedQueryError.validation(
      `${label} must be a positive whole number.`
    )
  }
}

function assertPositiveNumber(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw ExpectedQueryError.validation(`${label} must be greater than 0.`)
  }
}

function assertNonNegativeAmount(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw ExpectedQueryError.validation(`${label} must be 0 or greater.`)
  }
}

function normalizePolicy(policy: unknown): FinancingPolicySnapshot {
  const candidate = policy as Partial<{
    activeFinancingBlocksEmergency: boolean
    activeFinancingBlocksProcurement: boolean
    disbursementRequiresDeployableFunds: boolean
    financingCapacityBasis: FinancingCapacityBasis
    foodPurchaseAllowsCommitmentReductionDuringPayback: boolean
    foodPurchaseMaximumPaybackMonths: unknown
    loanIntakeReservationMode: LoanIntakeReservationMode
    loanEligibilityMultiple: unknown
    normalLoanAllocationPercentage: unknown
    normalLoanTermMonths: unknown
    procurementAllowsCommitmentReductionDuringPayback: boolean
    procurementMaximumPaybackMonths: unknown
    quickLoanAllocationPercentage: unknown
    quickLoanTermMonths: unknown
    requiresDualLoanApproval: boolean
    reserveBufferAmount: unknown
    specialSavingsCountsForEligibility: boolean
    strictCommitmentDuringFinancing: boolean
  }> | null

  const normalized = {
    ...DEFAULT_FINANCING_POLICY,
    ...(candidate
      ? {
          activeFinancingBlocksEmergency:
            candidate.activeFinancingBlocksEmergency ??
            DEFAULT_FINANCING_POLICY.activeFinancingBlocksEmergency,
          activeFinancingBlocksProcurement:
            candidate.activeFinancingBlocksProcurement ??
            DEFAULT_FINANCING_POLICY.activeFinancingBlocksProcurement,
          disbursementRequiresDeployableFunds:
            candidate.disbursementRequiresDeployableFunds ??
            DEFAULT_FINANCING_POLICY.disbursementRequiresDeployableFunds,
          financingCapacityBasis:
            candidate.financingCapacityBasis ??
            DEFAULT_FINANCING_POLICY.financingCapacityBasis,
          foodPurchaseAllowsCommitmentReductionDuringPayback:
            candidate.foodPurchaseAllowsCommitmentReductionDuringPayback ??
            DEFAULT_FINANCING_POLICY.foodPurchaseAllowsCommitmentReductionDuringPayback,
          foodPurchaseMaximumPaybackMonths: Number(
            candidate.foodPurchaseMaximumPaybackMonths ??
              DEFAULT_FINANCING_POLICY.foodPurchaseMaximumPaybackMonths
          ),
          loanIntakeReservationMode:
            candidate.loanIntakeReservationMode ??
            DEFAULT_FINANCING_POLICY.loanIntakeReservationMode,
          loanEligibilityMultiple: Number(
            candidate.loanEligibilityMultiple ??
              DEFAULT_FINANCING_POLICY.loanEligibilityMultiple
          ),
          normalLoanAllocationPercentage: Number(
            candidate.normalLoanAllocationPercentage ??
              DEFAULT_FINANCING_POLICY.normalLoanAllocationPercentage
          ),
          normalLoanTermMonths: Number(
            candidate.normalLoanTermMonths ??
              DEFAULT_FINANCING_POLICY.normalLoanTermMonths
          ),
          procurementAllowsCommitmentReductionDuringPayback:
            candidate.procurementAllowsCommitmentReductionDuringPayback ??
            DEFAULT_FINANCING_POLICY.procurementAllowsCommitmentReductionDuringPayback,
          procurementMaximumPaybackMonths: Number(
            candidate.procurementMaximumPaybackMonths ??
              DEFAULT_FINANCING_POLICY.procurementMaximumPaybackMonths
          ),
          quickLoanAllocationPercentage: Number(
            candidate.quickLoanAllocationPercentage ??
              DEFAULT_FINANCING_POLICY.quickLoanAllocationPercentage
          ),
          quickLoanTermMonths: Number(
            candidate.quickLoanTermMonths ??
              DEFAULT_FINANCING_POLICY.quickLoanTermMonths
          ),
          requiresDualLoanApproval:
            candidate.requiresDualLoanApproval ??
            DEFAULT_FINANCING_POLICY.requiresDualLoanApproval,
          reserveBufferAmount: Number(
            candidate.reserveBufferAmount ??
              DEFAULT_FINANCING_POLICY.reserveBufferAmount
          ),
          specialSavingsCountsForEligibility:
            candidate.specialSavingsCountsForEligibility ??
            DEFAULT_FINANCING_POLICY.specialSavingsCountsForEligibility,
          strictCommitmentDuringFinancing:
            candidate.strictCommitmentDuringFinancing ??
            DEFAULT_FINANCING_POLICY.strictCommitmentDuringFinancing,
        }
      : {}),
  }

  assertAllocationPercentages(
    normalized.quickLoanAllocationPercentage,
    normalized.normalLoanAllocationPercentage
  )
  assertPositiveNumber(
    normalized.loanEligibilityMultiple,
    "Loan eligibility multiple"
  )
  assertPositiveInteger(
    normalized.quickLoanTermMonths,
    "Quick loan term months"
  )
  assertPositiveInteger(
    normalized.normalLoanTermMonths,
    "Normal loan term months"
  )
  assertPositiveInteger(
    normalized.procurementMaximumPaybackMonths,
    "Procurement maximum payback months"
  )
  assertPositiveInteger(
    normalized.foodPurchaseMaximumPaybackMonths,
    "Foodstuff purchase maximum payback months"
  )
  assertNonNegativeAmount(normalized.reserveBufferAmount, "Reserve buffer")

  return normalized
}

function resolveMonthlyPeriod(periodStart?: Date): FinancingCyclePeriod {
  const source = periodStart ?? new Date()
  const start = new Date(
    Date.UTC(source.getUTCFullYear(), source.getUTCMonth(), 1)
  )
  const end = new Date(
    Date.UTC(source.getUTCFullYear(), source.getUTCMonth() + 1, 0)
  )

  return { periodEnd: end, periodStart: start }
}

function getExclusivePeriodEnd(periodEnd: Date) {
  return new Date(
    Date.UTC(
      periodEnd.getUTCFullYear(),
      periodEnd.getUTCMonth(),
      periodEnd.getUTCDate() + 1
    )
  )
}

function defaultLoanProductSettingsRow(
  loanType: LoanType,
  policy: FinancingPolicySnapshot
): LoanProductSettingsRow {
  return {
    code: null,
    id: null,
    // No row yet: the card shows "Not set up", never a synthetic active product.
    isActive: false,
    loanType,
    maxSavingsMultiple: policy.loanEligibilityMultiple,
    name: loanType === "quick" ? "Quick financing" : "Normal financing",
    termMonths:
      loanType === "quick"
        ? policy.quickLoanTermMonths
        : policy.normalLoanTermMonths,
  }
}

function toLoanProductSettingsRow(
  product: {
    code: string | null
    id: string
    isActive: boolean
    loanType: LoanType
    maxSavingsMultiple: unknown
    name: string
    termMonths: number
  } | null,
  loanType: LoanType,
  policy: FinancingPolicySnapshot
): LoanProductSettingsRow {
  if (!product) return defaultLoanProductSettingsRow(loanType, policy)

  return {
    code: product.code,
    id: product.id,
    isActive: product.isActive,
    loanType: product.loanType,
    maxSavingsMultiple: Number(product.maxSavingsMultiple),
    name: product.name,
    termMonths: product.termMonths,
  }
}

function byLoanType<T extends { loanType: LoanType }>(items: T[]) {
  return {
    normal: items.filter((item) => item.loanType === "normal"),
    quick: items.filter((item) => item.loanType === "quick"),
  }
}

type FinancingCycleUsageSums = Record<
  LoanType,
  { approved: number; disbursed: number; requestedReserved: number }
>

function emptyUsageSums(): FinancingCycleUsageSums {
  return {
    normal: { approved: 0, disbursed: 0, requestedReserved: 0 },
    quick: { approved: 0, disbursed: 0, requestedReserved: 0 },
  }
}

/**
 * Loan request and paid-out loan totals per loan type for one period: one
 * grouped SQL statement. Clients without `$queryRaw` (narrow test doubles)
 * read the rows through Prisma and sum them in JS, as before.
 */
async function readFinancingCycleUsageSums(
  input: FinancingCyclePeriod & { tenantId: string },
  prisma: PrismaClient
): Promise<FinancingCycleUsageSums> {
  const exclusivePeriodEnd = getExclusivePeriodEnd(input.periodEnd)
  const sums = emptyUsageSums()
  const raw = prisma as unknown as { $queryRaw?: unknown }

  if (typeof raw.$queryRaw === "function") {
    const reservedStatuses = [...REQUEST_RESERVED_STATUSES]
    const rows = (await prisma.$queryRaw`
      SELECT
        p.loan_type::text AS "loanType",
        COALESCE(SUM(r.requested_amount) FILTER (
          WHERE r.status::text = ANY(${reservedStatuses}::text[])
        ), 0) AS "requestedReserved",
        COALESCE(SUM(r.requested_amount) FILTER (
          WHERE r.status::text = 'approved'
        ), 0) AS "approved",
        0 AS "disbursed"
      FROM loan_requests r
      JOIN loan_products p ON p.id = r.loan_product_id
      WHERE r.tenant_id = ${input.tenantId}::uuid
        AND r.requested_at >= ${input.periodStart}
        AND r.requested_at < ${exclusivePeriodEnd}
      GROUP BY p.loan_type
      UNION ALL
      SELECT
        p.loan_type::text,
        0,
        0,
        COALESCE(SUM(l.principal_amount), 0)
      FROM loans l
      JOIN loan_requests r ON r.id = l.loan_request_id
      JOIN loan_products p ON p.id = l.loan_product_id
      WHERE l.tenant_id = ${input.tenantId}::uuid
        AND l.disbursed_at IS NOT NULL
        AND r.requested_at >= ${input.periodStart}
        AND r.requested_at < ${exclusivePeriodEnd}
      GROUP BY p.loan_type
    `) as Array<{
      approved: unknown
      disbursed: unknown
      loanType: string
      requestedReserved: unknown
    }>

    for (const row of rows) {
      const target = sums[row.loanType as LoanType]
      if (!target) continue
      target.requestedReserved += sumOrZero(row.requestedReserved)
      target.approved += sumOrZero(row.approved)
      target.disbursed += sumOrZero(row.disbursed)
    }

    return sums
  }

  const [requests, loans] = await Promise.all([
    prisma.loanRequest.findMany({
      select: {
        requestedAmount: true,
        status: true,
        loanProduct: {
          select: {
            loanType: true,
          },
        },
      },
      where: {
        tenantId: input.tenantId,
        requestedAt: {
          gte: input.periodStart,
          lt: exclusivePeriodEnd,
        },
      },
    }),
    prisma.loan.findMany({
      select: {
        principalAmount: true,
        loanProduct: {
          select: {
            loanType: true,
          },
        },
      },
      where: {
        tenantId: input.tenantId,
        disbursedAt: {
          not: null,
        },
        loanRequest: {
          requestedAt: {
            gte: input.periodStart,
            lt: exclusivePeriodEnd,
          },
        },
      },
    }),
  ])

  for (const request of requests) {
    const target = sums[request.loanProduct.loanType]
    const amount = Number(request.requestedAmount)
    if (REQUEST_RESERVED_STATUSES.includes(request.status)) {
      target.requestedReserved += amount
    }
    if (request.status === "approved") target.approved += amount
  }
  for (const loan of loans) {
    sums[loan.loanProduct.loanType].disbursed += Number(loan.principalAmount)
  }

  return sums
}

function summarizeFinancingCycleUsage(
  sums: FinancingCycleUsageSums,
  budgets: { normalBudgetAmount: number; quickBudgetAmount: number }
): {
  normal: FinancingCycleUsageByType
  quick: FinancingCycleUsageByType
} {
  function summarize(
    loanType: LoanType,
    budgetAmount: number
  ): FinancingCycleUsageByType {
    const typeSums = sums[loanType]
    const requestedReservedAmount = roundMoney(typeSums.requestedReserved)
    const approvedAmount = roundMoney(typeSums.approved)
    const disbursedAmount = roundMoney(typeSums.disbursed)
    const heldAmount = roundMoney(Math.max(0, approvedAmount - disbursedAmount))
    const remainingAmount = roundMoney(
      Math.max(0, budgetAmount - requestedReservedAmount)
    )

    return {
      approvedAmount,
      budgetAmount,
      disbursedAmount,
      heldAmount,
      remainingAmount,
      requestedReservedAmount,
    }
  }

  return {
    normal: summarize("normal", budgets.normalBudgetAmount),
    quick: summarize("quick", budgets.quickBudgetAmount),
  }
}

async function getFinancingCycleUsage(
  input: FinancingCyclePeriod & {
    normalBudgetAmount: number
    quickBudgetAmount: number
    tenantId: string
  },
  prisma: PrismaClient
): Promise<{
  normal: FinancingCycleUsageByType
  quick: FinancingCycleUsageByType
}> {
  return summarizeFinancingCycleUsage(
    await readFinancingCycleUsageSums(input, prisma),
    input
  )
}

async function getFinancingCycleSnapshotForPeriod(
  input: MonthlyFinancingCycleInput,
  prisma: PrismaClient
) {
  const period = resolveMonthlyPeriod(input.periodStart)
  const cycle = await prisma.financingCycle.findUnique({
    where: {
      tenantId_periodStart_periodEnd: {
        tenantId: input.tenantId,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
      },
    },
  })

  return { cycle, ...period }
}

function getIntakeStatus(cycle: { status: FinancingCycleStatus } | null) {
  if (!cycle) return "missing" as const
  if (cycle.status === "paused") return "paused" as const
  if (cycle.status === "closed") return "closed" as const
  if (cycle.status === "open") return "open" as const

  return "missing" as const
}

/**
 * Whether this month's financing takes requests: one cycle-row read. For a
 * member's loan page, which needs only this, not capacity or funds.
 */
export async function getFinancingIntakeStatus(
  input: MonthlyFinancingCycleInput,
  prismaOverride?: PrismaClient
) {
  const { cycle } = await getFinancingCycleSnapshotForPeriod(
    input,
    getPrisma(prismaOverride)
  )

  return getIntakeStatus(cycle)
}

function buildFinancingCycleWarnings(input: {
  cycle: { status: FinancingCycleStatus } | null
  normal: FinancingCycleUsageByType
  projectedCommitmentAmount: number
  quick: FinancingCycleUsageByType
  receivedContributionAmount: number
}) {
  const warnings: FinancingCycleHealthWarning[] = []

  if (!input.cycle || input.cycle.status === "draft") {
    warnings.push({
      key: "missing_cycle",
      label: "Current monthly financing cycle is not open",
      severity: "critical",
    })
  } else if (input.cycle.status === "paused") {
    warnings.push({
      key: "paused_cycle",
      label: "Current monthly financing cycle is paused",
      severity: "critical",
    })
  } else if (input.cycle.status === "closed") {
    warnings.push({
      key: "closed_cycle",
      label: "Current monthly financing cycle is closed",
      severity: "critical",
    })
  }

  if (input.quick.remainingAmount <= 0) {
    warnings.push({
      key: "quick_quota_closed",
      label: "Quick financing allocation is fully reserved",
      severity: "warning",
    })
  }

  if (input.normal.remainingAmount <= 0) {
    warnings.push({
      key: "normal_quota_closed",
      label: "Normal financing allocation is fully reserved",
      severity: "warning",
    })
  }

  if (
    input.projectedCommitmentAmount > 0 &&
    input.receivedContributionAmount < input.projectedCommitmentAmount
  ) {
    warnings.push({
      key: "collections_below_projected",
      label: "Actual collections are below projected commitments",
      severity: "warning",
    })
  }

  return warnings
}

function sumOrZero(value: unknown) {
  const amount = Number(value ?? 0)

  return Number.isFinite(amount) ? amount : 0
}

/** Raw tenant-wide sums behind the funds-held and deployable-funds figures. */
type DeployableFundsSums = {
  approvedHold: unknown
  contribution: unknown
  historicalShare: unknown
  openingCommitmentSavings: unknown
  openingFinancing: unknown
  openingShareCapital: unknown
  openingSpecialSavings: unknown
  outstandingFinancing: unknown
  receiptShare: unknown
  reserveBuffer: unknown
  separateShareCharge: unknown
  withdrawal: unknown
}

/**
 * Reads every sum the funds snapshot needs in one SQL statement. Clients
 * without `$queryRaw` (narrow test doubles) read them through Prisma
 * aggregates, as before; a missing optional delegate counts as zero.
 */
async function readDeployableFundsSums(
  input: DeployableFundsInput,
  prismaClient: PrismaClient
): Promise<DeployableFundsSums> {
  const prisma = prismaClient as any
  const { tenantId } = input
  const excludeLoanId = input.excludeLoanId ?? null

  if (typeof prisma.$queryRaw === "function") {
    const activeStatuses = [...ACTIVE_FINANCING_STATUSES]
    const [row] = (await prisma.$queryRaw`
      SELECT
        (SELECT COALESCE(SUM(amount), 0) FROM contributions
          WHERE tenant_id = ${tenantId}::uuid AND status = 'posted') AS "contribution",
        opening."openingCommitmentSavings",
        opening."openingSpecialSavings",
        opening."openingShareCapital",
        opening."openingFinancing",
        (SELECT COALESCE(SUM(amount), 0) FROM member_special_savings_withdrawals
          WHERE tenant_id = ${tenantId}::uuid) AS "withdrawal",
        (SELECT COALESCE(SUM(amount), 0) FROM member_share_ledger_entries
          WHERE tenant_id = ${tenantId}::uuid
            AND source_type = 'payment_receipt') AS "receiptShare",
        (SELECT COALESCE(SUM(a.amount), 0)
          FROM charge_applications a
          JOIN charge_definitions d ON d.id = a.charge_definition_id
          WHERE a.tenant_id = ${tenantId}::uuid
            AND d.purpose = 'member_share'
            AND a.collection_mode = 'pay_separately'
            AND a.status = 'posted') AS "separateShareCharge",
        (SELECT COALESCE(SUM(share_capital_amount), 0)
          FROM historical_member_share_purchases
          WHERE tenant_id = ${tenantId}::uuid) AS "historicalShare",
        (SELECT COALESCE(SUM(outstanding_principal), 0) FROM loans
          WHERE tenant_id = ${tenantId}::uuid
            AND status::text = ANY(${activeStatuses}::text[])) AS "outstandingFinancing",
        (SELECT COALESCE(SUM(principal_amount), 0) FROM loans
          WHERE tenant_id = ${tenantId}::uuid
            AND status = 'approved'
            AND (${excludeLoanId}::uuid IS NULL OR id <> ${excludeLoanId}::uuid)) AS "approvedHold",
        (SELECT reserve_buffer_amount FROM tenant_policies
          WHERE tenant_id = ${tenantId}::uuid) AS "reserveBuffer"
      FROM (
        SELECT
          COALESCE(SUM(commitment_savings_balance), 0) AS "openingCommitmentSavings",
          COALESCE(SUM(special_savings_balance), 0) AS "openingSpecialSavings",
          COALESCE(SUM(share_capital_balance), 0) AS "openingShareCapital",
          COALESCE(SUM(active_financing_outstanding), 0) AS "openingFinancing"
        FROM member_opening_balances
        WHERE tenant_id = ${tenantId}::uuid AND status = 'applied'
      ) opening
    `) as DeployableFundsSums[]

    // An aggregate-only SELECT always returns one row.
    return row ?? ({} as DeployableFundsSums)
  }

  const optionalAggregate = (delegate: any, args: unknown) =>
    typeof delegate?.aggregate === "function"
      ? delegate.aggregate(args)
      : Promise.resolve({ _sum: {} })
  const [
    contributionSum,
    openingSum,
    withdrawalSum,
    receiptShareSum,
    separateShareChargeSum,
    historicalShareSum,
    outstandingLoanSum,
    approvedHoldSum,
    policy,
  ] = await Promise.all([
    prisma.contribution.aggregate({
      _sum: { amount: true },
      where: { tenantId, status: "posted" },
    }),
    optionalAggregate(prisma.memberOpeningBalance, {
      _sum: {
        activeFinancingOutstanding: true,
        commitmentSavingsBalance: true,
        shareCapitalBalance: true,
        specialSavingsBalance: true,
      },
      where: { status: "applied", tenantId },
    }),
    optionalAggregate(prisma.memberSpecialSavingsWithdrawal, {
      _sum: { amount: true },
      where: { tenantId },
    }),
    optionalAggregate(prisma.memberShareLedgerEntry, {
      _sum: { amount: true },
      where: { sourceType: "payment_receipt", tenantId },
    }),
    optionalAggregate(prisma.chargeApplication, {
      _sum: { amount: true },
      where: {
        chargeDefinition: { purpose: "member_share" },
        collectionMode: "pay_separately",
        status: "posted",
        tenantId,
      },
    }),
    optionalAggregate(prisma.historicalMemberSharePurchase, {
      _sum: { shareCapitalAmount: true },
      where: { tenantId },
    }),
    optionalAggregate(prisma.loan, {
      _sum: { outstandingPrincipal: true },
      where: {
        tenantId,
        status: { in: [...ACTIVE_FINANCING_STATUSES] },
      },
    }),
    optionalAggregate(prisma.loan, {
      _sum: { principalAmount: true },
      where: {
        tenantId,
        status: "approved",
        ...(excludeLoanId ? { id: { not: excludeLoanId } } : {}),
      },
    }),
    typeof prisma.tenantPolicy?.findUnique === "function"
      ? prisma.tenantPolicy.findUnique({ where: { tenantId } })
      : null,
  ])

  return {
    approvedHold: approvedHoldSum._sum.principalAmount,
    contribution: contributionSum._sum.amount,
    historicalShare: historicalShareSum._sum.shareCapitalAmount,
    openingCommitmentSavings: openingSum._sum.commitmentSavingsBalance,
    openingFinancing: openingSum._sum.activeFinancingOutstanding,
    openingShareCapital: openingSum._sum.shareCapitalBalance,
    openingSpecialSavings: openingSum._sum.specialSavingsBalance,
    outstandingFinancing: outstandingLoanSum._sum.outstandingPrincipal,
    receiptShare: receiptShareSum._sum.amount,
    reserveBuffer: policy?.reserveBufferAmount,
    separateShareCharge: separateShareChargeSum._sum.amount,
    withdrawal: withdrawalSum._sum.amount,
  }
}

function summarizeMemberFundsHeld(
  sums: DeployableFundsSums
): MemberFundsHeldBreakdown {
  const totalContributionAmount = roundMoney(sumOrZero(sums.contribution))
  const openingSavingsAmount = roundMoney(
    sumOrZero(sums.openingCommitmentSavings) +
      sumOrZero(sums.openingSpecialSavings)
  )
  const openingShareCapitalAmount = roundMoney(
    sumOrZero(sums.openingShareCapital)
  )
  const openingFinancingAmount = roundMoney(sumOrZero(sums.openingFinancing))
  const specialSavingsWithdrawalAmount = roundMoney(sumOrZero(sums.withdrawal))
  const separateSharePurchaseAmount = roundMoney(
    Math.max(
      0,
      sumOrZero(sums.receiptShare) +
        sumOrZero(sums.separateShareCharge) +
        sumOrZero(sums.historicalShare)
    )
  )
  const memberSavingsHeldAmount = roundMoney(
    Math.max(
      0,
      totalContributionAmount +
        openingSavingsAmount -
        specialSavingsWithdrawalAmount
    )
  )
  const memberShareCapitalHeldAmount = roundMoney(
    openingShareCapitalAmount + separateSharePurchaseAmount
  )
  const cooperativeOpeningEquityAmount = roundMoney(
    Math.max(
      0,
      openingFinancingAmount - openingSavingsAmount - openingShareCapitalAmount
    )
  )

  return {
    cooperativeOpeningEquityAmount,
    memberFundsHeldAmount: roundMoney(
      memberSavingsHeldAmount +
        memberShareCapitalHeldAmount +
        cooperativeOpeningEquityAmount
    ),
    memberSavingsHeldAmount,
    memberShareCapitalHeldAmount,
    openingSavingsAmount,
    openingShareCapitalAmount,
    separateSharePurchaseAmount,
    specialSavingsWithdrawalAmount,
    totalContributionAmount,
  }
}

/**
 * Money members (and, at go-live, the cooperative itself) have put into the
 * pool. Sources are counted once each:
 * - posted contributions (savings, including the share portion deducted from
 *   savings, so monthly share charges are not added again);
 * - applied brought-forward opening savings and share capital;
 * - share capital paid outside contributions: approved receipt share
 *   allocations, settled pay-separately share charges, historical unit-share
 *   purchases;
 * - cooperative opening equity: the part of applied opening financing that
 *   opening member funds cannot cover. Opening financing is subtracted as
 *   outstanding financing, so without it a migrated cooperative whose loan
 *   book exceeds member balances would never show its own funds.
 * Special-savings refunds paid out are subtracted.
 */
export async function getMemberFundsHeldBreakdown(
  tenantId: string,
  prismaOverride?: PrismaClient
): Promise<MemberFundsHeldBreakdown> {
  return summarizeMemberFundsHeld(
    await readDeployableFundsSums({ tenantId }, getPrisma(prismaOverride))
  )
}

/**
 * deployable = max(0, member funds held − outstanding financing − approved
 * holds − reserve buffer − mobile billing commitment). Every staff and mobile
 * surface reads this snapshot so they agree. Three statements: the sums
 * (`readDeployableFundsSums`) and the two mobile billing totals.
 */
export async function getDeployableFundsSnapshot(
  input: DeployableFundsInput,
  prismaOverride?: PrismaClient
): Promise<DeployableFundsSnapshot> {
  const prisma = getPrisma(prismaOverride)
  const [sums, mobileBillingCommitmentAmount] = await Promise.all([
    readDeployableFundsSums(input, prisma),
    getMobileBillingCommitmentAmount(input.tenantId, prisma),
  ])
  const fundsHeld = summarizeMemberFundsHeld(sums)
  const outstandingFinancingAmount = roundMoney(
    sumOrZero(sums.outstandingFinancing)
  )
  const approvedHoldAmount = roundMoney(sumOrZero(sums.approvedHold))
  const reserveBufferAmount = roundMoney(sumOrZero(sums.reserveBuffer))
  const billingAmount = roundMoney(sumOrZero(mobileBillingCommitmentAmount))
  const unclampedPool =
    fundsHeld.memberFundsHeldAmount -
    outstandingFinancingAmount -
    reserveBufferAmount -
    billingAmount

  return {
    ...fundsHeld,
    approvedHoldAmount,
    availablePoolAmount: roundMoney(Math.max(0, unclampedPool)),
    deployableFunds: roundMoney(
      Math.max(0, unclampedPool - approvedHoldAmount)
    ),
    mobileBillingCommitmentAmount: billingAmount,
    outstandingFinancingAmount,
    reserveBufferAmount,
  }
}

export async function getMonthlyFinancingCycleHealth(
  input: MonthlyFinancingCycleInput,
  prismaOverride?: PrismaClient,
  options: {
    /** Reuse a snapshot the caller already started, to avoid a second read. */
    deployableFunds?: Promise<DeployableFundsSnapshot>
  } = {}
): Promise<MonthlyFinancingCycleHealth> {
  const prisma = getPrisma(prismaOverride)
  const period = resolveMonthlyPeriod(input.periodStart)
  // The cycle row, the funds snapshot and the period's usage sums are read
  // once each; the usage sums serve both the preview and the open cycle.
  const [{ cycle, periodEnd, periodStart }, deployableFunds, usageSums] =
    await Promise.all([
      getFinancingCycleSnapshotForPeriod(input, prisma),
      options.deployableFunds ??
        getDeployableFundsSnapshot({ tenantId: input.tenantId }, prisma),
      readFinancingCycleUsageSums(
        { ...period, tenantId: input.tenantId },
        prisma
      ),
    ])

  if (!cycle) {
    const preview = await buildMonthlyFinancingCyclePreview(input, prisma, {
      existingCycle: null,
      usageSums,
    })
    const warnings = buildFinancingCycleWarnings({
      cycle,
      normal: preview.normal,
      projectedCommitmentAmount: preview.projectedCommitmentAmount,
      quick: preview.quick,
      receivedContributionAmount: preview.receivedContributionAmount,
    })

    return {
      ...preview,
      cycle: null,
      deployableFunds,
      intakeStatus: "missing",
      warnings,
    }
  }

  const usage = summarizeFinancingCycleUsage(usageSums, {
    normalBudgetAmount: Number(cycle.normalBudgetAmount),
    quickBudgetAmount: Number(cycle.quickBudgetAmount),
  })
  const projectedCommitmentAmount = roundMoney(
    Number(cycle.projectedCommitmentAmount)
  )
  const receivedContributionAmount = roundMoney(
    Number(cycle.receivedContributionAmount)
  )
  const warnings = buildFinancingCycleWarnings({
    cycle,
    normal: usage.normal,
    projectedCommitmentAmount,
    quick: usage.quick,
    receivedContributionAmount,
  })

  return {
    periodEnd,
    periodStart,
    collectionCoverage:
      projectedCommitmentAmount > 0
        ? roundMoney(receivedContributionAmount / projectedCommitmentAmount)
        : 0,
    cycle: {
      id: cycle.id,
      status: cycle.status,
    },
    deployableFunds,
    intakeStatus: getIntakeStatus(cycle),
    normal: usage.normal,
    normalAllocationPercentage: Number(cycle.normalAllocationPercentage),
    projectedCommitmentAmount,
    quick: usage.quick,
    quickAllocationPercentage: Number(cycle.quickAllocationPercentage),
    receivedContributionAmount,
    reserveBufferAmount: Number(cycle.reserveBufferAmount),
    totalCapacityAmount: Number(cycle.totalCapacityAmount),
    warnings,
  }
}

export async function assertLoanRequestIntakeCapacity(
  input: LoanRequestCapacityInput,
  prismaOverride?: PrismaClient
): Promise<LoanRequestCapacityCheck> {
  const prisma = getPrisma(prismaOverride)
  const { cycle, periodEnd, periodStart } =
    await getFinancingCycleSnapshotForPeriod(
      {
        periodStart: input.requestedAt,
        tenantId: input.tenantId,
      },
      prisma
    )

  if (!cycle) {
    throw ExpectedQueryError.precondition(
      "Current monthly financing cycle is not open. Open the cycle before accepting loan requests."
    )
  }

  if (cycle.status !== "open") {
    throw ExpectedQueryError.precondition(
      `Current monthly financing cycle is ${cycle.status}; loan request intake is closed.`
    )
  }

  const usage = await getFinancingCycleUsage(
    {
      normalBudgetAmount: Number(cycle.normalBudgetAmount),
      periodEnd,
      periodStart,
      quickBudgetAmount: Number(cycle.quickBudgetAmount),
      tenantId: input.tenantId,
    },
    prisma
  )
  const selectedUsage = usage[input.loanProduct.loanType]

  if (input.requestedAmount > selectedUsage.remainingAmount) {
    throw ExpectedQueryError.precondition(
      `${input.loanProduct.loanType === "quick" ? "Quick" : "Normal"} financing allocation has ${selectedUsage.remainingAmount.toLocaleString("en-NG")} remaining for this cycle.`
    )
  }

  return {
    budgetAmount: selectedUsage.budgetAmount,
    disbursedAmount: selectedUsage.disbursedAmount,
    financingCycleId: cycle.id,
    heldAmount: selectedUsage.heldAmount,
    loanType: input.loanProduct.loanType,
    remainingAmount: selectedUsage.remainingAmount,
    requestedAmount: input.requestedAmount,
    requestedReservedAmount: selectedUsage.requestedReservedAmount,
  }
}

export async function previewMonthlyFinancingCycle(
  input: MonthlyFinancingCycleInput,
  prismaOverride?: PrismaClient
): Promise<MonthlyFinancingCyclePreview> {
  return buildMonthlyFinancingCyclePreview(input, getPrisma(prismaOverride))
}

/**
 * The preview, optionally reusing reads the caller already has: the cycle row
 * (`null` when the caller knows there is none) and the period's usage sums.
 */
async function buildMonthlyFinancingCyclePreview(
  input: MonthlyFinancingCycleInput,
  prisma: PrismaClient,
  known: {
    existingCycle?: MonthlyFinancingCyclePreview["existingCycle"]
    usageSums?: FinancingCycleUsageSums
  } = {}
): Promise<MonthlyFinancingCyclePreview> {
  const period = resolveMonthlyPeriod(input.periodStart)
  const exclusivePeriodEnd = getExclusivePeriodEnd(period.periodEnd)

  const [
    policyRow,
    projectedCommitments,
    receivedContributions,
    existingCycle,
  ] = await Promise.all([
    prisma.tenantPolicy.findUnique({ where: { tenantId: input.tenantId } }),
    prisma.contributionPlan.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        tenantId: input.tenantId,
        interval: "monthly",
        isActive: true,
        startsAt: {
          lt: exclusivePeriodEnd,
        },
        OR: [
          {
            endsAt: null,
          },
          {
            endsAt: {
              gte: period.periodStart,
            },
          },
        ],
      },
    }),
    prisma.contribution.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        tenantId: input.tenantId,
        postedAt: {
          gte: period.periodStart,
          lt: exclusivePeriodEnd,
        },
        status: "posted",
      },
    }),
    known.existingCycle !== undefined
      ? known.existingCycle
      : prisma.financingCycle.findUnique({
          select: {
            id: true,
            status: true,
          },
          where: {
            tenantId_periodStart_periodEnd: {
              tenantId: input.tenantId,
              periodStart: period.periodStart,
              periodEnd: period.periodEnd,
            },
          },
        }),
  ])

  const policy = normalizePolicy(policyRow)
  const projectedCommitmentAmount = roundMoney(
    Number(projectedCommitments._sum.amount ?? 0)
  )
  const receivedContributionAmount = roundMoney(
    Number(receivedContributions._sum.amount ?? 0)
  )
  const totalCapacityAmount = roundMoney(
    Math.max(0, projectedCommitmentAmount - policy.reserveBufferAmount)
  )
  const quickBudgetAmount = roundMoney(
    (totalCapacityAmount * policy.quickLoanAllocationPercentage) / 100
  )
  const normalBudgetAmount = roundMoney(totalCapacityAmount - quickBudgetAmount)
  const usage = summarizeFinancingCycleUsage(
    known.usageSums ??
      (await readFinancingCycleUsageSums(
        { ...period, tenantId: input.tenantId },
        prisma
      )),
    { normalBudgetAmount, quickBudgetAmount }
  )

  return {
    ...period,
    capacityBasis: policy.financingCapacityBasis,
    collectionCoverage:
      projectedCommitmentAmount > 0
        ? roundMoney(receivedContributionAmount / projectedCommitmentAmount)
        : 0,
    existingCycle,
    intakeReservationMode: policy.loanIntakeReservationMode,
    normal: usage.normal,
    normalAllocationPercentage: policy.normalLoanAllocationPercentage,
    projectedCommitmentAmount,
    quick: usage.quick,
    quickAllocationPercentage: policy.quickLoanAllocationPercentage,
    receivedContributionAmount,
    reserveBufferAmount: policy.reserveBufferAmount,
    totalCapacityAmount,
  }
}

export async function getTenantFinancingSettingsWorkspace(
  input: MonthlyFinancingCycleInput,
  prismaOverride?: PrismaClient
): Promise<TenantFinancingSettingsWorkspace> {
  const prisma = getPrisma(prismaOverride)
  const [policyRow, loanProducts, currentCyclePreview] = await Promise.all([
    prisma.tenantPolicy.findUnique({ where: { tenantId: input.tenantId } }),
    prisma.loanProduct.findMany({
      orderBy: [{ loanType: "asc" }, { termMonths: "asc" }, { name: "asc" }],
      where: {
        // The brought-forward product is for migrated opening loans only.
        ...excludeBroughtForwardLoanProductWhere,
        tenantId: input.tenantId,
      },
    }),
    previewMonthlyFinancingCycle(input, prisma),
  ])
  const policy = normalizePolicy(policyRow)
  const productsByType = byLoanType(
    loanProducts.map((product) => ({
      id: product.id,
      code: product.code,
      isActive: product.isActive,
      loanType: product.loanType,
      maxSavingsMultiple: product.maxSavingsMultiple,
      name: product.name,
      termMonths: product.termMonths,
    }))
  )
  const quickProduct =
    productsByType.quick.find((product) => product.isActive) ??
    productsByType.quick[0] ??
    null
  const normalProduct =
    productsByType.normal.find((product) => product.isActive) ??
    productsByType.normal[0] ??
    null

  return {
    currentCyclePreview,
    policy: {
      ...policy,
      id: (policyRow as { id?: string } | null)?.id ?? null,
    },
    products: {
      normal: toLoanProductSettingsRow(normalProduct, "normal", policy),
      quick: toLoanProductSettingsRow(quickProduct, "quick", policy),
    },
  }
}

export async function openMonthlyFinancingCycle(
  input: MonthlyFinancingCycleInput & {
    actorUserId: string
    /** Server-owned clock override for deterministic internal workflows. */
    openedAt?: Date
    statusNote?: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = getPrisma(prismaOverride)
  const preview = await previewMonthlyFinancingCycle(input, prisma)

  return prisma.$transaction(async (tx) => {
    const now = input.openedAt ?? new Date()
    const existingCycle = await tx.financingCycle.findUnique({
      where: {
        tenantId_periodStart_periodEnd: {
          tenantId: input.tenantId,
          periodStart: preview.periodStart,
          periodEnd: preview.periodEnd,
        },
      },
    })

    if (existingCycle?.status === "closed") {
      throw ExpectedQueryError.conflict(
        "Closed financing cycles are final and cannot be reopened."
      )
    }

    if (existingCycle?.status === "open") {
      throw ExpectedQueryError.conflict(
        "This financing cycle is already open. Refresh before continuing."
      )
    }

    const cycle = existingCycle
      ? await tx.financingCycle.update({
          data:
            existingCycle.status === "draft"
              ? {
                  status: "open",
                  capacityBasis: preview.capacityBasis,
                  intakeReservationMode: preview.intakeReservationMode,
                  projectedCommitmentAmount: preview.projectedCommitmentAmount,
                  receivedContributionAmount:
                    preview.receivedContributionAmount,
                  reserveBufferAmount: preview.reserveBufferAmount,
                  totalCapacityAmount: preview.totalCapacityAmount,
                  quickAllocationPercentage: preview.quickAllocationPercentage,
                  normalAllocationPercentage:
                    preview.normalAllocationPercentage,
                  quickBudgetAmount: preview.quick.budgetAmount,
                  normalBudgetAmount: preview.normal.budgetAmount,
                  openedAt: now,
                  pausedAt: null,
                  closedAt: null,
                  statusNote: input.statusNote ?? null,
                }
              : {
                  status: "open",
                  openedAt: now,
                  pausedAt: null,
                  closedAt: null,
                  statusNote: input.statusNote ?? null,
                },
          where: {
            id: existingCycle.id,
            tenantId: input.tenantId,
          },
        })
      : await tx.financingCycle.create({
          data: {
            tenantId: input.tenantId,
            periodStart: preview.periodStart,
            periodEnd: preview.periodEnd,
            status: "open",
            capacityBasis: preview.capacityBasis,
            intakeReservationMode: preview.intakeReservationMode,
            projectedCommitmentAmount: preview.projectedCommitmentAmount,
            receivedContributionAmount: preview.receivedContributionAmount,
            reserveBufferAmount: preview.reserveBufferAmount,
            totalCapacityAmount: preview.totalCapacityAmount,
            quickAllocationPercentage: preview.quickAllocationPercentage,
            normalAllocationPercentage: preview.normalAllocationPercentage,
            quickBudgetAmount: preview.quick.budgetAmount,
            normalBudgetAmount: preview.normal.budgetAmount,
            openedAt: now,
            statusNote: input.statusNote ?? null,
          },
        })

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        actorType: "user",
        action: "financing_cycle.opened",
        entityType: "FinancingCycle",
        entityId: cycle.id,
        metadata: {
          normalBudgetAmount: preview.normal.budgetAmount,
          periodEnd: preview.periodEnd.toISOString().slice(0, 10),
          periodStart: preview.periodStart.toISOString().slice(0, 10),
          projectedCommitmentAmount: preview.projectedCommitmentAmount,
          quickBudgetAmount: preview.quick.budgetAmount,
          receivedContributionAmount: preview.receivedContributionAmount,
          reserveBufferAmount: preview.reserveBufferAmount,
          resumedWithoutSnapshotRewrite: existingCycle?.status === "paused",
          statusNote: input.statusNote ?? null,
          totalCapacityAmount: preview.totalCapacityAmount,
        },
        occurredAt: now,
      },
    })

    return cycle
  })
}

export async function updateMonthlyFinancingCycleStatus(
  input: MonthlyFinancingCycleStatusInput,
  prismaOverride?: PrismaClient
) {
  const prisma = getPrisma(prismaOverride)
  return prisma.$transaction(async (tx) => {
    const existingCycle = await tx.financingCycle.findFirst({
      where: {
        id: input.financingCycleId,
        tenantId: input.tenantId,
      },
    })
    if (!existingCycle) {
      throw ExpectedQueryError.notFound("Financing cycle not found.")
    }
    if (input.expectedStatus && existingCycle.status !== input.expectedStatus) {
      throw ExpectedQueryError.conflict(
        `Financing cycle changed from ${input.expectedStatus} to ${existingCycle.status}. Refresh before continuing.`
      )
    }

    const allowedTransitions: Record<
      FinancingCycleStatus,
      FinancingCycleStatus[]
    > = {
      draft: ["open"],
      open: ["paused", "closed"],
      paused: ["open", "closed"],
      closed: [],
    }
    if (!allowedTransitions[existingCycle.status].includes(input.status)) {
      throw ExpectedQueryError.conflict(
        `Financing cycle cannot transition from ${existingCycle.status} to ${input.status}.`
      )
    }

    const now = new Date()
    const timestampField =
      input.status === "paused"
        ? { pausedAt: now }
        : input.status === "closed"
          ? { closedAt: now }
          : { openedAt: now, pausedAt: null, closedAt: null }
    const claimed = await tx.financingCycle.updateMany({
      data: {
        ...timestampField,
        status: input.status,
        statusNote: input.statusNote ?? null,
      },
      where: {
        id: input.financingCycleId,
        tenantId: input.tenantId,
        status: existingCycle.status,
      },
    })
    if (claimed.count !== 1) {
      throw ExpectedQueryError.conflict(
        "Financing cycle changed while this command was processing. Refresh before continuing."
      )
    }
    const cycle = await tx.financingCycle.findFirst({
      where: { id: input.financingCycleId, tenantId: input.tenantId },
    })
    if (!cycle) throw ExpectedQueryError.notFound("Financing cycle not found.")

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        actorType: "user",
        action: `financing_cycle.${input.status}`,
        entityType: "FinancingCycle",
        entityId: cycle.id,
        metadata: {
          previousStatus: existingCycle.status,
          status: input.status,
          statusNote: input.statusNote ?? null,
        },
        occurredAt: new Date(),
      },
    })

    return cycle
  })
}

export async function updateTenantFinancingCyclePolicy(
  input: TenantFinancingCyclePolicyInput,
  prismaOverride?: PrismaClient
) {
  const prisma = getPrisma(prismaOverride)
  const existingPolicy = await prisma.tenantPolicy.findUnique({
    where: { tenantId: input.tenantId },
  })
  const current = normalizePolicy(existingPolicy)
  const quickLoanAllocationPercentage =
    input.quickLoanAllocationPercentage ?? current.quickLoanAllocationPercentage
  const normalLoanAllocationPercentage =
    input.normalLoanAllocationPercentage ??
    current.normalLoanAllocationPercentage
  const loanEligibilityMultiple =
    input.loanEligibilityMultiple ?? current.loanEligibilityMultiple
  const quickLoanTermMonths =
    input.quickLoanTermMonths ?? current.quickLoanTermMonths
  const normalLoanTermMonths =
    input.normalLoanTermMonths ?? current.normalLoanTermMonths
  const reserveBufferAmount =
    input.reserveBufferAmount ?? current.reserveBufferAmount
  const procurementMaximumPaybackMonths =
    input.procurementMaximumPaybackMonths ??
    current.procurementMaximumPaybackMonths
  const foodPurchaseMaximumPaybackMonths =
    input.foodPurchaseMaximumPaybackMonths ??
    current.foodPurchaseMaximumPaybackMonths

  assertAllocationPercentages(
    quickLoanAllocationPercentage,
    normalLoanAllocationPercentage
  )
  assertPositiveNumber(loanEligibilityMultiple, "Loan eligibility multiple")
  assertPositiveInteger(quickLoanTermMonths, "Quick loan term months")
  assertPositiveInteger(normalLoanTermMonths, "Normal loan term months")
  assertPositiveInteger(
    procurementMaximumPaybackMonths,
    "Procurement maximum payback months"
  )
  assertPositiveInteger(
    foodPurchaseMaximumPaybackMonths,
    "Foodstuff purchase maximum payback months"
  )
  assertNonNegativeAmount(reserveBufferAmount, "Reserve buffer")

  return prisma.$transaction(async (tx) => {
    const policy = await tx.tenantPolicy.upsert({
      create: {
        tenantId: input.tenantId,
        loanEligibilityMultiple,
        quickLoanTermMonths,
        normalLoanTermMonths,
        reserveBufferAmount,
        financingCapacityBasis:
          input.financingCapacityBasis ?? current.financingCapacityBasis,
        quickLoanAllocationPercentage,
        normalLoanAllocationPercentage,
        loanIntakeReservationMode:
          input.loanIntakeReservationMode ?? current.loanIntakeReservationMode,
        disbursementRequiresDeployableFunds:
          input.disbursementRequiresDeployableFunds ??
          current.disbursementRequiresDeployableFunds,
        specialSavingsCountsForEligibility:
          input.specialSavingsCountsForEligibility ??
          current.specialSavingsCountsForEligibility,
        strictCommitmentDuringFinancing:
          input.strictCommitmentDuringFinancing ??
          current.strictCommitmentDuringFinancing,
        activeFinancingBlocksEmergency:
          input.activeFinancingBlocksEmergency ??
          current.activeFinancingBlocksEmergency,
        activeFinancingBlocksProcurement:
          input.activeFinancingBlocksProcurement ??
          current.activeFinancingBlocksProcurement,
        procurementMaximumPaybackMonths,
        procurementAllowsCommitmentReductionDuringPayback:
          input.procurementAllowsCommitmentReductionDuringPayback ??
          current.procurementAllowsCommitmentReductionDuringPayback,
        foodPurchaseMaximumPaybackMonths,
        foodPurchaseAllowsCommitmentReductionDuringPayback:
          input.foodPurchaseAllowsCommitmentReductionDuringPayback ??
          current.foodPurchaseAllowsCommitmentReductionDuringPayback,
        requiresDualLoanApproval:
          input.requiresDualLoanApproval ?? current.requiresDualLoanApproval,
      },
      update: {
        loanEligibilityMultiple,
        quickLoanTermMonths,
        normalLoanTermMonths,
        reserveBufferAmount,
        ...(input.financingCapacityBasis
          ? { financingCapacityBasis: input.financingCapacityBasis }
          : {}),
        quickLoanAllocationPercentage,
        normalLoanAllocationPercentage,
        ...(input.loanIntakeReservationMode
          ? { loanIntakeReservationMode: input.loanIntakeReservationMode }
          : {}),
        ...(input.disbursementRequiresDeployableFunds !== undefined
          ? {
              disbursementRequiresDeployableFunds:
                input.disbursementRequiresDeployableFunds,
            }
          : {}),
        ...(input.specialSavingsCountsForEligibility !== undefined
          ? {
              specialSavingsCountsForEligibility:
                input.specialSavingsCountsForEligibility,
            }
          : {}),
        ...(input.strictCommitmentDuringFinancing !== undefined
          ? {
              strictCommitmentDuringFinancing:
                input.strictCommitmentDuringFinancing,
            }
          : {}),
        ...(input.activeFinancingBlocksEmergency !== undefined
          ? {
              activeFinancingBlocksEmergency:
                input.activeFinancingBlocksEmergency,
            }
          : {}),
        ...(input.activeFinancingBlocksProcurement !== undefined
          ? {
              activeFinancingBlocksProcurement:
                input.activeFinancingBlocksProcurement,
            }
          : {}),
        procurementMaximumPaybackMonths,
        ...(input.procurementAllowsCommitmentReductionDuringPayback !==
        undefined
          ? {
              procurementAllowsCommitmentReductionDuringPayback:
                input.procurementAllowsCommitmentReductionDuringPayback,
            }
          : {}),
        foodPurchaseMaximumPaybackMonths,
        ...(input.foodPurchaseAllowsCommitmentReductionDuringPayback !==
        undefined
          ? {
              foodPurchaseAllowsCommitmentReductionDuringPayback:
                input.foodPurchaseAllowsCommitmentReductionDuringPayback,
            }
          : {}),
        ...(input.requiresDualLoanApproval !== undefined
          ? { requiresDualLoanApproval: input.requiresDualLoanApproval }
          : {}),
      },
      where: {
        tenantId: input.tenantId,
      },
    })

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        actorType: "user",
        action: "tenant_policy.financing_cycle_updated",
        entityType: "TenantPolicy",
        entityId: policy.id,
        metadata: {
          activeFinancingBlocksEmergency: policy.activeFinancingBlocksEmergency,
          activeFinancingBlocksProcurement:
            policy.activeFinancingBlocksProcurement,
          procurementMaximumPaybackMonths:
            policy.procurementMaximumPaybackMonths,
          procurementAllowsCommitmentReductionDuringPayback:
            policy.procurementAllowsCommitmentReductionDuringPayback,
          foodPurchaseMaximumPaybackMonths:
            policy.foodPurchaseMaximumPaybackMonths,
          foodPurchaseAllowsCommitmentReductionDuringPayback:
            policy.foodPurchaseAllowsCommitmentReductionDuringPayback,
          disbursementRequiresDeployableFunds:
            policy.disbursementRequiresDeployableFunds,
          financingCapacityBasis: policy.financingCapacityBasis,
          loanIntakeReservationMode: policy.loanIntakeReservationMode,
          loanEligibilityMultiple: Number(policy.loanEligibilityMultiple),
          normalLoanAllocationPercentage: Number(
            policy.normalLoanAllocationPercentage
          ),
          normalLoanTermMonths: policy.normalLoanTermMonths,
          quickLoanAllocationPercentage: Number(
            policy.quickLoanAllocationPercentage
          ),
          quickLoanTermMonths: policy.quickLoanTermMonths,
          requiresDualLoanApproval: policy.requiresDualLoanApproval,
          reserveBufferAmount: Number(policy.reserveBufferAmount),
          specialSavingsCountsForEligibility:
            policy.specialSavingsCountsForEligibility,
          strictCommitmentDuringFinancing:
            policy.strictCommitmentDuringFinancing,
        },
        occurredAt: new Date(),
      },
    })

    return policy
  })
}

export async function updateLoanProductSettings(
  input: LoanProductSettingsInput,
  prismaOverride?: PrismaClient
) {
  const prisma = getPrisma(prismaOverride)
  const code = input.code?.trim().toUpperCase() || null
  const name = input.name.trim()

  if (!name) {
    throw ExpectedQueryError.validation("Loan product name is required.")
  }

  if (input.loanType !== "quick" && input.loanType !== "normal") {
    throw ExpectedQueryError.validation("Loan product type is not supported.")
  }

  assertPositiveInteger(input.termMonths, "Loan product term months")
  assertPositiveNumber(
    input.maxSavingsMultiple,
    "Loan product savings multiple"
  )

  const existingProduct = input.loanProductId
    ? await prisma.loanProduct.findFirst({
        where: {
          id: input.loanProductId,
          tenantId: input.tenantId,
        },
      })
    : await prisma.loanProduct.findFirst({
        orderBy: [{ isActive: "desc" }, { termMonths: "asc" }],
        where: {
          ...excludeBroughtForwardLoanProductWhere,
          loanType: input.loanType,
          tenantId: input.tenantId,
        },
      })

  if (existingProduct && isBroughtForwardLoanProduct(existingProduct)) {
    throw ExpectedQueryError.validation(
      "The brought-forward opening financing product belongs to migrated opening loans and cannot be edited here."
    )
  }

  return prisma.$transaction(async (tx) => {
    const product = existingProduct
      ? await tx.loanProduct.update({
          data: {
            code,
            isActive: input.isActive,
            loanType: input.loanType,
            maxSavingsMultiple: input.maxSavingsMultiple,
            name,
            termMonths: input.termMonths,
          },
          where: {
            id: existingProduct.id,
          },
        })
      : await tx.loanProduct.create({
          data: {
            code,
            isActive: input.isActive,
            loanType: input.loanType,
            maxSavingsMultiple: input.maxSavingsMultiple,
            name,
            tenantId: input.tenantId,
            termMonths: input.termMonths,
          },
        })

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        actorType: "user",
        action: existingProduct
          ? "loan_product.settings_updated"
          : "loan_product.settings_created",
        entityType: "LoanProduct",
        entityId: product.id,
        metadata: {
          code: product.code,
          isActive: product.isActive,
          loanType: product.loanType,
          maxSavingsMultiple: Number(product.maxSavingsMultiple),
          name: product.name,
          termMonths: product.termMonths,
        },
        occurredAt: new Date(),
      },
    })

    return product
  })
}
