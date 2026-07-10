import type {
  FinancingCapacityBasis,
  FinancingCycleStatus,
  LoanIntakeReservationMode,
  LoanRequestStatus,
  LoanType,
  PrismaClient,
} from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"

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

export type DeployableFundsSnapshot = {
  approvedHoldAmount: number
  deployableFunds: number
  outstandingFinancingAmount: number
  reserveBufferAmount: number
  totalContributionAmount: number
}

export type MonthlyFinancingCycleInput = {
  periodStart?: Date
  tenantId: string
}

export type MonthlyFinancingCycleStatusInput = {
  actorUserId: string
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

const DEFAULT_FINANCING_POLICY: FinancingPolicySnapshot = {
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
    throw new Error(`${label} must be between 0 and 100.`)
  }
}

function assertAllocationPercentages(quick: number, normal: number) {
  assertPercentage(quick, "Quick loan allocation percentage")
  assertPercentage(normal, "Normal loan allocation percentage")

  if (roundMoney(quick + normal) !== 100) {
    throw new Error("Quick and normal loan allocation percentages must total 100.")
  }
}

function assertPositiveInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive whole number.`)
  }
}

function assertPositiveNumber(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be greater than 0.`)
  }
}

function assertNonNegativeAmount(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be 0 or greater.`)
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
              DEFAULT_FINANCING_POLICY.foodPurchaseMaximumPaybackMonths,
          ),
          loanIntakeReservationMode:
            candidate.loanIntakeReservationMode ??
            DEFAULT_FINANCING_POLICY.loanIntakeReservationMode,
          loanEligibilityMultiple: Number(
            candidate.loanEligibilityMultiple ??
              DEFAULT_FINANCING_POLICY.loanEligibilityMultiple,
          ),
          normalLoanAllocationPercentage: Number(
            candidate.normalLoanAllocationPercentage ??
              DEFAULT_FINANCING_POLICY.normalLoanAllocationPercentage,
          ),
          normalLoanTermMonths: Number(
            candidate.normalLoanTermMonths ??
              DEFAULT_FINANCING_POLICY.normalLoanTermMonths,
          ),
          procurementAllowsCommitmentReductionDuringPayback:
            candidate.procurementAllowsCommitmentReductionDuringPayback ??
            DEFAULT_FINANCING_POLICY.procurementAllowsCommitmentReductionDuringPayback,
          procurementMaximumPaybackMonths: Number(
            candidate.procurementMaximumPaybackMonths ??
              DEFAULT_FINANCING_POLICY.procurementMaximumPaybackMonths,
          ),
          quickLoanAllocationPercentage: Number(
            candidate.quickLoanAllocationPercentage ??
              DEFAULT_FINANCING_POLICY.quickLoanAllocationPercentage,
          ),
          quickLoanTermMonths: Number(
            candidate.quickLoanTermMonths ??
              DEFAULT_FINANCING_POLICY.quickLoanTermMonths,
          ),
          requiresDualLoanApproval:
            candidate.requiresDualLoanApproval ??
            DEFAULT_FINANCING_POLICY.requiresDualLoanApproval,
          reserveBufferAmount: Number(
            candidate.reserveBufferAmount ??
              DEFAULT_FINANCING_POLICY.reserveBufferAmount,
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
    normalized.normalLoanAllocationPercentage,
  )
  assertPositiveNumber(
    normalized.loanEligibilityMultiple,
    "Loan eligibility multiple",
  )
  assertPositiveInteger(
    normalized.quickLoanTermMonths,
    "Quick loan term months",
  )
  assertPositiveInteger(
    normalized.normalLoanTermMonths,
    "Normal loan term months",
  )
  assertPositiveInteger(
    normalized.procurementMaximumPaybackMonths,
    "Procurement maximum payback months",
  )
  assertPositiveInteger(
    normalized.foodPurchaseMaximumPaybackMonths,
    "Foodstuff purchase maximum payback months",
  )
  assertNonNegativeAmount(normalized.reserveBufferAmount, "Reserve buffer")

  return normalized
}

function resolveMonthlyPeriod(periodStart?: Date): FinancingCyclePeriod {
  const source = periodStart ?? new Date()
  const start = new Date(
    Date.UTC(source.getUTCFullYear(), source.getUTCMonth(), 1),
  )
  const end = new Date(
    Date.UTC(source.getUTCFullYear(), source.getUTCMonth() + 1, 0),
  )

  return { periodEnd: end, periodStart: start }
}

function getExclusivePeriodEnd(periodEnd: Date) {
  return new Date(
    Date.UTC(
      periodEnd.getUTCFullYear(),
      periodEnd.getUTCMonth(),
      periodEnd.getUTCDate() + 1,
    ),
  )
}

function defaultLoanProductSettingsRow(
  loanType: LoanType,
  policy: FinancingPolicySnapshot,
): LoanProductSettingsRow {
  return {
    code: null,
    id: null,
    isActive: true,
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
  policy: FinancingPolicySnapshot,
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

async function getFinancingCycleUsage(
  input: FinancingCyclePeriod & {
    normalBudgetAmount: number
    quickBudgetAmount: number
    tenantId: string
  },
  prisma: PrismaClient,
): Promise<{
  normal: FinancingCycleUsageByType
  quick: FinancingCycleUsageByType
}> {
  const exclusivePeriodEnd = getExclusivePeriodEnd(input.periodEnd)
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

  const typedRequests = requests.map((request) => ({
    amount: Number(request.requestedAmount),
    loanType: request.loanProduct.loanType,
    status: request.status,
  }))
  const typedLoans = loans.map((loan) => ({
    amount: Number(loan.principalAmount),
    loanType: loan.loanProduct.loanType,
  }))
  const requestGroups = byLoanType(typedRequests)
  const loanGroups = byLoanType(typedLoans)

  function summarize(
    loanType: LoanType,
    budgetAmount: number,
  ): FinancingCycleUsageByType {
    const productRequests = requestGroups[loanType]
    const requestedReservedAmount = roundMoney(
      productRequests
        .filter((request) => REQUEST_RESERVED_STATUSES.includes(request.status))
        .reduce((sum, request) => sum + request.amount, 0),
    )
    const approvedAmount = roundMoney(
      productRequests
        .filter((request) => request.status === "approved")
        .reduce((sum, request) => sum + request.amount, 0),
    )
    const disbursedAmount = roundMoney(
      loanGroups[loanType].reduce((sum, loan) => sum + loan.amount, 0),
    )
    const heldAmount = roundMoney(Math.max(0, approvedAmount - disbursedAmount))
    const remainingAmount = roundMoney(
      Math.max(0, budgetAmount - requestedReservedAmount),
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
    normal: summarize("normal", input.normalBudgetAmount),
    quick: summarize("quick", input.quickBudgetAmount),
  }
}

async function getFinancingCycleSnapshotForPeriod(
  input: MonthlyFinancingCycleInput,
  prisma: PrismaClient,
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

export async function getDeployableFundsSnapshot(
  input: DeployableFundsInput,
  prismaOverride?: PrismaClient,
): Promise<DeployableFundsSnapshot> {
  const prisma = getPrisma(prismaOverride)
  const [contributionSum, outstandingLoanSum, approvedHoldSum, policy] =
    await Promise.all([
      prisma.contribution.aggregate({
        _sum: { amount: true },
        where: { tenantId: input.tenantId, status: "posted" },
      }),
      prisma.loan.aggregate({
        _sum: { outstandingPrincipal: true },
        where: {
          tenantId: input.tenantId,
          status: { in: [...ACTIVE_FINANCING_STATUSES] },
        },
      }),
      prisma.loan.aggregate({
        _sum: { principalAmount: true },
        where: {
          tenantId: input.tenantId,
          status: "approved",
          ...(input.excludeLoanId ? { id: { not: input.excludeLoanId } } : {}),
        },
      }),
      prisma.tenantPolicy.findUnique({
        where: { tenantId: input.tenantId },
      }),
    ])
  const totalContributionAmount = roundMoney(
    Number(contributionSum._sum.amount ?? 0),
  )
  const outstandingFinancingAmount = roundMoney(
    Number(outstandingLoanSum._sum.outstandingPrincipal ?? 0),
  )
  const approvedHoldAmount = roundMoney(
    Number(approvedHoldSum._sum.principalAmount ?? 0),
  )
  const reserveBufferAmount = roundMoney(
    Number(policy?.reserveBufferAmount ?? 0),
  )

  return {
    approvedHoldAmount,
    deployableFunds: roundMoney(
      Math.max(
        0,
        totalContributionAmount -
          outstandingFinancingAmount -
          approvedHoldAmount -
          reserveBufferAmount,
      ),
    ),
    outstandingFinancingAmount,
    reserveBufferAmount,
    totalContributionAmount,
  }
}

export async function getMonthlyFinancingCycleHealth(
  input: MonthlyFinancingCycleInput,
  prismaOverride?: PrismaClient,
): Promise<MonthlyFinancingCycleHealth> {
  const prisma = getPrisma(prismaOverride)
  const [{ cycle, periodEnd, periodStart }, preview, deployableFunds] =
    await Promise.all([
      getFinancingCycleSnapshotForPeriod(input, prisma),
      previewMonthlyFinancingCycle(input, prisma),
      getDeployableFundsSnapshot({ tenantId: input.tenantId }, prisma),
    ])

  if (!cycle) {
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

  const normalBudgetAmount = Number(cycle.normalBudgetAmount)
  const quickBudgetAmount = Number(cycle.quickBudgetAmount)
  const usage = await getFinancingCycleUsage(
    {
      normalBudgetAmount,
      periodEnd,
      periodStart,
      quickBudgetAmount,
      tenantId: input.tenantId,
    },
    prisma,
  )
  const projectedCommitmentAmount = roundMoney(
    Number(cycle.projectedCommitmentAmount),
  )
  const receivedContributionAmount = roundMoney(
    Number(cycle.receivedContributionAmount),
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
  prismaOverride?: PrismaClient,
): Promise<LoanRequestCapacityCheck> {
  const prisma = getPrisma(prismaOverride)
  const { cycle, periodEnd, periodStart } =
    await getFinancingCycleSnapshotForPeriod(
      {
        periodStart: input.requestedAt,
        tenantId: input.tenantId,
      },
      prisma,
    )

  if (!cycle) {
    throw new Error(
      "Current monthly financing cycle is not open. Open the cycle before accepting loan requests.",
    )
  }

  if (cycle.status !== "open") {
    throw new Error(
      `Current monthly financing cycle is ${cycle.status}; loan request intake is closed.`,
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
    prisma,
  )
  const selectedUsage = usage[input.loanProduct.loanType]

  if (input.requestedAmount > selectedUsage.remainingAmount) {
    throw new Error(
      `${input.loanProduct.loanType === "quick" ? "Quick" : "Normal"} financing allocation has ${selectedUsage.remainingAmount.toLocaleString("en-NG")} remaining for this cycle.`,
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
  prismaOverride?: PrismaClient,
): Promise<MonthlyFinancingCyclePreview> {
  const prisma = getPrisma(prismaOverride)
  const period = resolveMonthlyPeriod(input.periodStart)
  const exclusivePeriodEnd = getExclusivePeriodEnd(period.periodEnd)

  const [policyRow, projectedCommitments, receivedContributions, existingCycle] =
    await Promise.all([
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
      prisma.financingCycle.findUnique({
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
    Number(projectedCommitments._sum.amount ?? 0),
  )
  const receivedContributionAmount = roundMoney(
    Number(receivedContributions._sum.amount ?? 0),
  )
  const totalCapacityAmount = roundMoney(
    Math.max(0, projectedCommitmentAmount - policy.reserveBufferAmount),
  )
  const quickBudgetAmount = roundMoney(
    (totalCapacityAmount * policy.quickLoanAllocationPercentage) / 100,
  )
  const normalBudgetAmount = roundMoney(totalCapacityAmount - quickBudgetAmount)
  const usage = await getFinancingCycleUsage(
    {
      ...period,
      normalBudgetAmount,
      quickBudgetAmount,
      tenantId: input.tenantId,
    },
    prisma,
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
  prismaOverride?: PrismaClient,
): Promise<TenantFinancingSettingsWorkspace> {
  const prisma = getPrisma(prismaOverride)
  const [policyRow, loanProducts, currentCyclePreview] = await Promise.all([
    prisma.tenantPolicy.findUnique({ where: { tenantId: input.tenantId } }),
    prisma.loanProduct.findMany({
      orderBy: [{ loanType: "asc" }, { termMonths: "asc" }, { name: "asc" }],
      where: {
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
    })),
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
    statusNote?: string
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = getPrisma(prismaOverride)
  const preview = await previewMonthlyFinancingCycle(input, prisma)

  return prisma.$transaction(async (tx) => {
    const now = new Date()
    const cycle = await tx.financingCycle.upsert({
      create: {
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
      update: {
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
        pausedAt: null,
        closedAt: null,
        statusNote: input.statusNote ?? null,
      },
      where: {
        tenantId_periodStart_periodEnd: {
          tenantId: input.tenantId,
          periodStart: preview.periodStart,
          periodEnd: preview.periodEnd,
        },
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
  prismaOverride?: PrismaClient,
) {
  const prisma = getPrisma(prismaOverride)
  const timestampField =
    input.status === "paused"
      ? { pausedAt: new Date() }
      : input.status === "closed"
        ? { closedAt: new Date() }
        : { openedAt: new Date(), pausedAt: null, closedAt: null }

  return prisma.$transaction(async (tx) => {
    const cycle = await tx.financingCycle.update({
      data: {
        ...timestampField,
        status: input.status,
        statusNote: input.statusNote ?? null,
      },
      where: {
        id: input.financingCycleId,
        tenantId: input.tenantId,
      },
    })

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        actorType: "user",
        action: `financing_cycle.${input.status}`,
        entityType: "FinancingCycle",
        entityId: cycle.id,
        metadata: {
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
  prismaOverride?: PrismaClient,
) {
  const prisma = getPrisma(prismaOverride)
  const existingPolicy = await prisma.tenantPolicy.findUnique({
    where: { tenantId: input.tenantId },
  })
  const current = normalizePolicy(existingPolicy)
  const quickLoanAllocationPercentage =
    input.quickLoanAllocationPercentage ?? current.quickLoanAllocationPercentage
  const normalLoanAllocationPercentage =
    input.normalLoanAllocationPercentage ?? current.normalLoanAllocationPercentage
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
    normalLoanAllocationPercentage,
  )
  assertPositiveNumber(loanEligibilityMultiple, "Loan eligibility multiple")
  assertPositiveInteger(quickLoanTermMonths, "Quick loan term months")
  assertPositiveInteger(normalLoanTermMonths, "Normal loan term months")
  assertPositiveInteger(
    procurementMaximumPaybackMonths,
    "Procurement maximum payback months",
  )
  assertPositiveInteger(
    foodPurchaseMaximumPaybackMonths,
    "Foodstuff purchase maximum payback months",
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
        ...(input.procurementAllowsCommitmentReductionDuringPayback !== undefined
          ? {
              procurementAllowsCommitmentReductionDuringPayback:
                input.procurementAllowsCommitmentReductionDuringPayback,
            }
          : {}),
        foodPurchaseMaximumPaybackMonths,
        ...(input.foodPurchaseAllowsCommitmentReductionDuringPayback !== undefined
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
          activeFinancingBlocksEmergency:
            policy.activeFinancingBlocksEmergency,
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
            policy.normalLoanAllocationPercentage,
          ),
          normalLoanTermMonths: policy.normalLoanTermMonths,
          quickLoanAllocationPercentage: Number(
            policy.quickLoanAllocationPercentage,
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
  prismaOverride?: PrismaClient,
) {
  const prisma = getPrisma(prismaOverride)
  const code = input.code?.trim().toUpperCase() || null
  const name = input.name.trim()

  if (!name) {
    throw new Error("Loan product name is required.")
  }

  if (input.loanType !== "quick" && input.loanType !== "normal") {
    throw new Error("Loan product type is not supported.")
  }

  assertPositiveInteger(input.termMonths, "Loan product term months")
  assertPositiveNumber(
    input.maxSavingsMultiple,
    "Loan product savings multiple",
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
          loanType: input.loanType,
          tenantId: input.tenantId,
        },
      })

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
