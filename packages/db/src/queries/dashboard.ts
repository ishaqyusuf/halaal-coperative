import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import {
  type DeployableFundsSnapshot,
  getDeployableFundsSnapshot,
  getMonthlyFinancingCycleHealth,
} from "./financing-cycles"
import {
  buildContributionHealth,
  type ContributionHealth,
  getCommitmentCollection,
  readMonthlyRecordCollection,
} from "./contribution-health"
import {
  BROUGHT_FORWARD_LOAN_PRODUCT_NAME,
  excludeBroughtForwardLoanProductWhere,
} from "./loan-product-rules"
import {
  getTenantOperationProfile,
  type TenantOperationProfileReadModel,
} from "./operation-profile"
import {
  lateScheduleItemWhere,
  startOfUtcDay,
  unpaidScheduleStatuses,
} from "./repayments"

const activeFinancingStatuses = ["disbursed", "active"] as const
const pendingFinancingRequestStatuses = ["submitted", "under_review"] as const
const pendingKycStatuses = ["not_started", "pending", "rejected"] as const

export type DashboardMetrics = {
  memberCount: number
  activeMemberCount: number
  activeLoanCount: number
  totalContributions: number
  outstandingLoans: number
  availablePool: number
  reserveBuffer: number
  delinquencyRate: number
}

export type OverviewSummarySeverity = "neutral" | "warning" | "critical"

export type OverviewSummary = {
  workspace: {
    tenantId: string
    tenantName: string
    currencyCode: string
    generatedAt: string
  }
  primaryMetrics: {
    deployableFunds: number
    collectionCoverage: number
    portfolioAtRiskAmount: number
    portfolioAtRiskRate: number
    actionQueueTotal: number
  }
  actionQueue: Array<{
    key: string
    label: string
    count: number
    href: string
    severity: OverviewSummarySeverity
  }>
  contributionHealth: ContributionHealth
  financingRisk: {
    outstandingPrincipal: number
    overdueAmount: number
    par30Amount: number
    par60Amount: number
    par90Amount: number
    pendingDisbursementCount: number
    financingCycleWarningCount: number
  }
  complianceWatch: Array<{
    key: string
    label: string
    count: number
    href: string
  }>
  shareAndProfitPosition: {
    shareCapitalBalance: number
    profitPendingAllocation: number
    activeInvestmentPoolCount: number
  }
  recentActivity: Array<{
    /** Money moved, or null for a request. */
    amount: number | null
    id: string
    kind: "contribution" | "loan_request" | "repayment"
    memberName: string
    label: string
    detail: string
    occurredAt: string
    href: string
    /** The request status in words ("submitted"), or null for money moved. */
    status: string | null
  }>
  setupWarnings: Array<{
    key: string
    label: string
    href: string
  }>
}

function getCurrentMonth() {
  const now = new Date()

  return {
    month: now.getUTCMonth() + 1,
    year: now.getUTCFullYear(),
  }
}

function getFallbackPeriodLabel() {
  const { month, year } = getCurrentMonth()
  const date = new Date(Date.UTC(year, month - 1, 1))

  return new Intl.DateTimeFormat("en", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(date)
}

const dayMs = 86_400_000

function getDaysOverdue(input: Date, asOf: Date) {
  const diff = asOf.getTime() - input.getTime()

  return Math.max(0, Math.floor(diff / dayMs))
}

/**
 * The home's counts and sums: the action queue, compliance watch, share and
 * profit position, portfolio at risk, and the tenant fields the summary shows.
 */
export type OverviewKpis = {
  tenant: {
    currencyCode: string
    initialMigrationStatus: string | null
    name: string
  } | null
  activeShareBusinesses: number
  draftDividendPeriods: number
  failedImportCount: number
  financingApprovalCount: number
  kycReviewCount: number
  openSupportCases: number
  overdueAmount: number
  overdueItemCount: number
  par30Amount: number
  par60Amount: number
  par90Amount: number
  pendingDisbursementCount: number
  pendingDocumentReviews: number
  pendingFoodPurchaseApplications: number
  pendingMemberApprovals: number
  pendingOpeningBalances: number
  pendingPaymentReceipts: number
  pendingProcurementRequests: number
  pendingProfitEntryAmount: number
  pendingProjectFinancingRequests: number
  pendingShareAllocationAmount: number
  pendingShareApplications: number
  shareCapitalBalance: number
  submittedFoodPurchaseAccounting: number
}

type OverviewKpiRow = {
  active_share_businesses: number
  currency_code: string | null
  draft_dividend_periods: number
  failed_imports: number
  financing_approvals: number
  initial_migration_status: string | null
  kyc_reviews: number
  open_support_cases: number
  overdue_amount: unknown
  overdue_items: number
  par30_amount: unknown
  par60_amount: unknown
  par90_amount: unknown
  pending_disbursements: number
  pending_document_reviews: number
  pending_food_purchase_applications: number
  pending_member_approvals: number
  pending_opening_balances: number
  pending_payment_receipts: number
  pending_procurement_requests: number
  pending_profit_entry_amount: unknown
  pending_project_financing_requests: number
  pending_share_allocation_amount: unknown
  pending_share_applications: number
  share_capital_balance: unknown
  submitted_food_purchase_accounting: number
  tenant_name: string | null
}

/** PAR cut-offs: an item is N+ days late when `dueAt <= asOf − N days`. */
function getParCutoffs(asOf: Date) {
  return {
    par30: new Date(asOf.getTime() - 30 * dayMs),
    par60: new Date(asOf.getTime() - 60 * dayMs),
    par90: new Date(asOf.getTime() - 90 * dayMs),
  }
}

/**
 * Reads every home KPI in one statement (L8, 16 November 2026): scalar
 * subqueries over the tenant's indexed rows, and portfolio at risk summed in
 * Postgres instead of loading each late installment.
 *
 * Clients without `$queryRaw` (test stubs) read the same figures with one
 * Prisma query per KPI. That path is the reference: rule changes must update
 * both, and `dashboard-overview.integration.test.ts` checks they agree.
 *
 * Late installments follow `lateScheduleItemWhere` (unpaid, due before the
 * start of today UTC, on a disbursed or active loan). Money sums are exact
 * numeric sums, so they can differ from adding floats by under a cent.
 */
export async function readOverviewKpis(
  prismaClient: PrismaClient,
  tenantId: string,
  asOf: Date
): Promise<OverviewKpis> {
  const prisma = prismaClient as any
  const lateBefore = startOfUtcDay(asOf)
  const cutoffs = getParCutoffs(asOf)

  if (typeof prisma.$queryRaw !== "function") {
    return readOverviewKpisByModel(prisma, tenantId, asOf)
  }

  const [row] = (await prisma.$queryRaw`
    WITH overdue AS (
      SELECT
        count(*)::int AS items,
        COALESCE(sum(i.total_due), 0) AS amount,
        COALESCE(sum(i.principal_due) FILTER (
          WHERE i.due_at <= ${cutoffs.par30}::timestamptz
        ), 0) AS par30,
        COALESCE(sum(i.principal_due) FILTER (
          WHERE i.due_at <= ${cutoffs.par60}::timestamptz
        ), 0) AS par60,
        COALESCE(sum(i.principal_due) FILTER (
          WHERE i.due_at <= ${cutoffs.par90}::timestamptz
        ), 0) AS par90
      FROM repayment_schedule_items i
      JOIN loans l ON l.id = i.loan_id
      WHERE i.tenant_id = ${tenantId}::uuid
        AND i.due_at < ${lateBefore}::timestamptz
        AND i.status::text = ANY(${[...unpaidScheduleStatuses]}::text[])
        AND l.status IN ('disbursed', 'active')
    )
    SELECT
      t.currency_code,
      t.name AS tenant_name,
      t.initial_migration_status::text AS initial_migration_status,
      (SELECT count(*)::int FROM member_onboarding_requests
        WHERE tenant_id = p.id AND status = 'pending_approval'
      ) AS pending_member_approvals,
      (SELECT count(*)::int FROM members
        WHERE tenant_id = p.id AND status = 'active'
          AND kyc_status IN ('not_started', 'pending', 'rejected')
      ) AS kyc_reviews,
      (SELECT count(*)::int FROM member_documents
        WHERE tenant_id = p.id AND review_status = 'pending'
      ) AS pending_document_reviews,
      (SELECT count(*)::int FROM loan_requests
        WHERE tenant_id = p.id AND status IN ('submitted', 'under_review')
      ) AS financing_approvals,
      (SELECT count(*)::int FROM loans
        WHERE tenant_id = p.id AND status = 'approved'
      ) AS pending_disbursements,
      (SELECT count(*)::int FROM member_share_applications
        WHERE tenant_id = p.id AND status = 'pending'
      ) AS pending_share_applications,
      (SELECT count(*)::int FROM member_opening_balances
        WHERE tenant_id = p.id AND status = 'pending_review'
      ) AS pending_opening_balances,
      (SELECT count(*)::int FROM procurement_requests
        WHERE tenant_id = p.id AND status IN ('submitted', 'under_review')
      ) AS pending_procurement_requests,
      (SELECT count(*)::int FROM project_financing_requests
        WHERE tenant_id = p.id AND status IN ('submitted', 'under_review')
      ) AS pending_project_financing_requests,
      (SELECT count(*)::int FROM food_purchase_applications
        WHERE tenant_id = p.id AND status IN ('submitted', 'under_review')
      ) AS pending_food_purchase_applications,
      (SELECT count(*)::int FROM food_purchase_cycles
        WHERE tenant_id = p.id AND status = 'accounting_submitted'
      ) AS submitted_food_purchase_accounting,
      (SELECT count(*)::int FROM member_payment_receipts
        WHERE tenant_id = p.id AND status IN ('submitted', 'under_review')
      ) AS pending_payment_receipts,
      (SELECT count(*)::int FROM support_cases
        WHERE tenant_id = p.id
          AND status IN ('open', 'in_progress', 'waiting_on_member')
      ) AS open_support_cases,
      (SELECT count(*)::int FROM import_batches
        WHERE tenant_id = p.id AND status = 'failed'
      ) AS failed_imports,
      (SELECT count(*)::int FROM share_businesses
        WHERE tenant_id = p.id AND status = 'active'
      ) AS active_share_businesses,
      (SELECT sum(amount) FROM member_share_ledger_entries
        WHERE tenant_id = p.id
      ) AS share_capital_balance,
      (SELECT sum(allocatable_profit_amount) FROM share_business_profit_entries
        WHERE tenant_id = p.id AND status IN ('draft', 'reviewed')
      ) AS pending_profit_entry_amount,
      (SELECT sum(allocated_profit_amount) FROM share_profit_allocations
        WHERE tenant_id = p.id AND status = 'draft'
      ) AS pending_share_allocation_amount,
      (SELECT count(*)::int FROM dividend_periods
        WHERE tenant_id = p.id AND status = 'draft'
      ) AS draft_dividend_periods,
      o.items AS overdue_items,
      o.amount AS overdue_amount,
      o.par30 AS par30_amount,
      o.par60 AS par60_amount,
      o.par90 AS par90_amount
    FROM (SELECT ${tenantId}::uuid AS id) p
    LEFT JOIN tenants t ON t.id = p.id
    CROSS JOIN overdue o
  `) as [OverviewKpiRow]

  return {
    activeShareBusinesses: row.active_share_businesses,
    draftDividendPeriods: row.draft_dividend_periods,
    failedImportCount: row.failed_imports,
    financingApprovalCount: row.financing_approvals,
    kycReviewCount: row.kyc_reviews,
    openSupportCases: row.open_support_cases,
    overdueAmount: Number(row.overdue_amount),
    overdueItemCount: row.overdue_items,
    par30Amount: Number(row.par30_amount),
    par60Amount: Number(row.par60_amount),
    par90Amount: Number(row.par90_amount),
    pendingDisbursementCount: row.pending_disbursements,
    pendingDocumentReviews: row.pending_document_reviews,
    pendingFoodPurchaseApplications: row.pending_food_purchase_applications,
    pendingMemberApprovals: row.pending_member_approvals,
    pendingOpeningBalances: row.pending_opening_balances,
    pendingPaymentReceipts: row.pending_payment_receipts,
    pendingProcurementRequests: row.pending_procurement_requests,
    pendingProfitEntryAmount: Number(row.pending_profit_entry_amount ?? 0),
    pendingProjectFinancingRequests: row.pending_project_financing_requests,
    pendingShareAllocationAmount: Number(
      row.pending_share_allocation_amount ?? 0
    ),
    pendingShareApplications: row.pending_share_applications,
    shareCapitalBalance: Number(row.share_capital_balance ?? 0),
    submittedFoodPurchaseAccounting: row.submitted_food_purchase_accounting,
    tenant:
      row.tenant_name === null || row.currency_code === null
        ? null
        : {
            currencyCode: row.currency_code,
            initialMigrationStatus: row.initial_migration_status,
            name: row.tenant_name,
          },
  }
}

/** One Prisma query per KPI: the reference for `readOverviewKpis`'s SQL. */
async function readOverviewKpisByModel(
  prisma: any,
  tenantId: string,
  asOf: Date
): Promise<OverviewKpis> {
  const [
    tenant,
    pendingMemberApprovals,
    kycReviewCount,
    pendingDocumentReviews,
    financingApprovalCount,
    pendingDisbursementCount,
    pendingShareApplications,
    pendingOpeningBalances,
    pendingProcurementRequests,
    pendingProjectFinancingRequests,
    pendingFoodPurchaseApplications,
    submittedFoodPurchaseAccounting,
    pendingPaymentReceipts,
    openSupportCases,
    failedImportCount,
    overdueScheduleItems,
    activeShareBusinesses,
    shareLedgerBalance,
    pendingProfitEntries,
    pendingShareAllocations,
    draftDividendPeriods,
  ] = await Promise.all([
    prisma.tenant.findUnique({
      select: {
        currencyCode: true,
        id: true,
        initialMigrationStatus: true,
        name: true,
      },
      where: { id: tenantId },
    }),
    prisma.memberOnboardingRequest.count({
      where: { status: "pending_approval", tenantId },
    }),
    prisma.member.count({
      where: {
        kycStatus: { in: [...pendingKycStatuses] },
        status: "active",
        tenantId,
      },
    }),
    prisma.memberDocument.count({
      where: { reviewStatus: "pending", tenantId },
    }),
    prisma.loanRequest.count({
      where: {
        status: { in: [...pendingFinancingRequestStatuses] },
        tenantId,
      },
    }),
    prisma.loan.count({ where: { status: "approved", tenantId } }),
    prisma.memberShareApplication.count({
      where: { status: "pending", tenantId },
    }),
    typeof prisma.memberOpeningBalance?.count === "function"
      ? prisma.memberOpeningBalance.count({
          where: { status: "pending_review", tenantId },
        })
      : 0,
    prisma.procurementRequest.count({
      where: { status: { in: ["submitted", "under_review"] }, tenantId },
    }),
    typeof prisma.projectFinancingRequest?.count === "function"
      ? prisma.projectFinancingRequest.count({
          where: { status: { in: ["submitted", "under_review"] }, tenantId },
        })
      : 0,
    typeof prisma.foodPurchaseApplication?.count === "function"
      ? prisma.foodPurchaseApplication.count({
          where: { status: { in: ["submitted", "under_review"] }, tenantId },
        })
      : 0,
    typeof prisma.foodPurchaseCycle?.count === "function"
      ? prisma.foodPurchaseCycle.count({
          where: { status: "accounting_submitted", tenantId },
        })
      : 0,
    prisma.memberPaymentReceipt.count({
      where: { status: { in: ["submitted", "under_review"] }, tenantId },
    }),
    prisma.supportCase.count({
      where: {
        status: { in: ["open", "in_progress", "waiting_on_member"] },
        tenantId,
      },
    }),
    prisma.importBatch.count({ where: { status: "failed", tenantId } }),
    prisma.repaymentScheduleItem.findMany({
      select: {
        dueAt: true,
        principalDue: true,
        totalDue: true,
      },
      where: {
        loan: { status: { in: [...activeFinancingStatuses] } },
        ...lateScheduleItemWhere(startOfUtcDay(asOf)),
        tenantId,
      },
    }),
    prisma.shareBusiness.count({
      where: { status: "active", tenantId },
    }),
    prisma.memberShareLedgerEntry.aggregate({
      _sum: { amount: true },
      where: { tenantId },
    }),
    prisma.shareBusinessProfitEntry.aggregate({
      _sum: { allocatableProfitAmount: true },
      where: { status: { in: ["draft", "reviewed"] }, tenantId },
    }),
    prisma.shareProfitAllocation.aggregate({
      _sum: { allocatedProfitAmount: true },
      where: { status: "draft", tenantId },
    }),
    prisma.dividendPeriod.count({
      where: { status: "draft", tenantId },
    }),
  ])
  const overdueItems = overdueScheduleItems as Array<{
    dueAt: Date
    principalDue: unknown
    totalDue: unknown
  }>
  const parAmount = (days: number) =>
    overdueItems.reduce(
      (total, item) =>
        total +
        (getDaysOverdue(item.dueAt, asOf) >= days
          ? Number(item.principalDue)
          : 0),
      0
    )

  return {
    activeShareBusinesses,
    draftDividendPeriods,
    failedImportCount,
    financingApprovalCount,
    kycReviewCount,
    openSupportCases,
    overdueAmount: overdueItems.reduce(
      (total, item) => total + Number(item.totalDue),
      0
    ),
    overdueItemCount: overdueItems.length,
    par30Amount: parAmount(30),
    par60Amount: parAmount(60),
    par90Amount: parAmount(90),
    pendingDisbursementCount,
    pendingDocumentReviews,
    pendingFoodPurchaseApplications,
    pendingMemberApprovals,
    pendingOpeningBalances,
    pendingPaymentReceipts,
    pendingProcurementRequests,
    pendingProfitEntryAmount: Number(
      pendingProfitEntries._sum.allocatableProfitAmount ?? 0
    ),
    pendingProjectFinancingRequests,
    pendingShareAllocationAmount: Number(
      pendingShareAllocations._sum.allocatedProfitAmount ?? 0
    ),
    pendingShareApplications,
    shareCapitalBalance: Number(shareLedgerBalance._sum.amount ?? 0),
    submittedFoodPurchaseAccounting,
    tenant: tenant
      ? {
          currencyCode: tenant.currencyCode,
          initialMigrationStatus: tenant.initialMigrationStatus ?? null,
          name: tenant.name,
        }
      : null,
  }
}

export type OverviewActivityRow = {
  amount: number | null
  id: string
  kind: "contribution" | "loan_request" | "repayment"
  memberName: string | null
  occurredAt: Date
  status: string | null
}

type OverviewActivityRawRow = {
  amount: unknown
  id: string
  kind: OverviewActivityRow["kind"]
  member_name: string | null
  occurred_at: Date
  status: string | null
}

/**
 * The three latest posted contributions, posted repayments and financing
 * requests made in Halaalvest, with member names, in one statement. Rows come back grouped by
 * kind in that order, newest first (ties by id), as the summary merges them.
 * Clients without `$queryRaw` use one Prisma query per kind plus the names.
 */
export async function readOverviewRecentActivity(
  prismaClient: PrismaClient,
  tenantId: string
): Promise<OverviewActivityRow[]> {
  const prisma = prismaClient as any

  if (typeof prisma.$queryRaw !== "function") {
    return readOverviewRecentActivityByModel(prisma, tenantId)
  }

  const rows = (await prisma.$queryRaw`
    SELECT a.kind, a.id::text AS id, a.amount, a.occurred_at, a.status,
      m.full_name AS member_name
    FROM (
      (SELECT 1 AS kind_order, 'contribution' AS kind, c.id, c.amount,
          c.posted_at AS occurred_at, NULL::text AS status, c.member_id
        FROM contributions c
        WHERE c.tenant_id = ${tenantId}::uuid AND c.status = 'posted'
        ORDER BY c.posted_at DESC, c.id DESC
        LIMIT 3)
      UNION ALL
      (SELECT 2, 'repayment', r.id, r.amount, r.paid_at, NULL::text,
          r.member_id
        FROM repayments r
        WHERE r.tenant_id = ${tenantId}::uuid AND r.status = 'posted'
        ORDER BY r.paid_at DESC, r.id DESC
        LIMIT 3)
      UNION ALL
      (SELECT 3, 'loan_request', q.id, NULL::numeric, q.requested_at,
          q.status::text, q.member_id
        FROM loan_requests q
        JOIN loan_products p ON p.id = q.loan_product_id AND p.tenant_id = q.tenant_id
        WHERE q.tenant_id = ${tenantId}::uuid
          AND p.name <> ${BROUGHT_FORWARD_LOAN_PRODUCT_NAME}
        ORDER BY q.requested_at DESC, q.id DESC
        LIMIT 3)
    ) a
    LEFT JOIN members m
      ON m.id = a.member_id AND m.tenant_id = ${tenantId}::uuid
    ORDER BY a.kind_order, a.occurred_at DESC, a.id DESC
  `) as OverviewActivityRawRow[]

  return rows.map((row) => ({
    amount: row.amount === null ? null : Number(row.amount),
    id: row.id,
    kind: row.kind,
    memberName: row.member_name,
    occurredAt: row.occurred_at,
    status: row.status,
  }))
}

async function readOverviewRecentActivityByModel(
  prisma: any,
  tenantId: string
): Promise<OverviewActivityRow[]> {
  const [latestContributions, latestRepayments, latestLoanRequests] =
    (await Promise.all([
      prisma.contribution.findMany({
        orderBy: [{ postedAt: "desc" }, { id: "desc" }],
        select: { amount: true, id: true, memberId: true, postedAt: true },
        take: 3,
        where: { status: "posted", tenantId },
      }),
      prisma.repayment.findMany({
        orderBy: [{ paidAt: "desc" }, { id: "desc" }],
        select: { amount: true, id: true, memberId: true, paidAt: true },
        take: 3,
        where: { status: "posted", tenantId },
      }),
      prisma.loanRequest.findMany({
        orderBy: [{ requestedAt: "desc" }, { id: "desc" }],
        select: { id: true, memberId: true, requestedAt: true, status: true },
        take: 3,
        where: { loanProduct: excludeBroughtForwardLoanProductWhere, tenantId },
      }),
    ])) as [
      Array<{
        amount: unknown
        id: string
        memberId: string | null
        postedAt: Date
      }>,
      Array<{
        amount: unknown
        id: string
        memberId: string | null
        paidAt: Date
      }>,
      Array<{
        id: string
        memberId: string | null
        requestedAt: Date
        status: string
      }>,
    ]
  const memberIds = [
    ...new Set(
      [...latestContributions, ...latestRepayments, ...latestLoanRequests]
        .map((row) => row.memberId)
        .filter((id): id is string => Boolean(id))
    ),
  ]
  const memberNames = new Map<string, string>(
    memberIds.length > 0
      ? (
          await prisma.member.findMany({
            select: { fullName: true, id: true },
            where: { id: { in: memberIds }, tenantId },
          })
        ).map((member: { fullName: string; id: string }) => [
          member.id,
          member.fullName,
        ])
      : []
  )
  const nameOf = (memberId: string | null) =>
    (memberId ? memberNames.get(memberId) : null) ?? null

  return [
    ...latestContributions.map((row) => ({
      amount: Number(row.amount),
      id: row.id,
      kind: "contribution" as const,
      memberName: nameOf(row.memberId),
      occurredAt: row.postedAt,
      status: null,
    })),
    ...latestRepayments.map((row) => ({
      amount: Number(row.amount),
      id: row.id,
      kind: "repayment" as const,
      memberName: nameOf(row.memberId),
      occurredAt: row.paidAt,
      status: null,
    })),
    ...latestLoanRequests.map((row) => ({
      amount: null,
      id: row.id,
      kind: "loan_request" as const,
      memberName: nameOf(row.memberId),
      occurredAt: row.requestedAt,
      status: row.status,
    })),
  ]
}

function getEmptyOverviewSummary(input: {
  tenantId: string
  tenantName: string
  currencyCode: string
}): OverviewSummary {
  return {
    workspace: {
      tenantId: input.tenantId,
      tenantName: input.tenantName,
      currencyCode: input.currencyCode,
      generatedAt: new Date().toISOString(),
    },
    primaryMetrics: {
      deployableFunds: 0,
      collectionCoverage: 0,
      portfolioAtRiskAmount: 0,
      portfolioAtRiskRate: 0,
      actionQueueTotal: 0,
    },
    actionQueue: [],
    contributionHealth: {
      basis: "active_commitments",
      expectedThisMonth: 0,
      receivedThisMonth: 0,
      collectionGap: 0,
      paidMemberCount: 0,
      unpaidMemberCount: 0,
      periodLabel: getFallbackPeriodLabel(),
      state: "no_commitments",
    },
    financingRisk: {
      financingCycleWarningCount: 0,
      outstandingPrincipal: 0,
      overdueAmount: 0,
      par30Amount: 0,
      par60Amount: 0,
      par90Amount: 0,
      pendingDisbursementCount: 0,
    },
    complianceWatch: [],
    shareAndProfitPosition: {
      activeInvestmentPoolCount: 0,
      profitPendingAllocation: 0,
      shareCapitalBalance: 0,
    },
    recentActivity: [],
    setupWarnings: [],
  }
}

export async function getDashboardMetrics(
  tenantId: string,
  prismaOverride?: PrismaClient,
  options: {
    /** Reuse a snapshot the caller already started, to avoid a second read. */
    deployableFunds?: Promise<DeployableFundsSnapshot>
  } = {}
): Promise<DashboardMetrics> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const [memberCount, activeMemberCount, activeLoanCount, deployableFunds] =
    await Promise.all([
      prisma.member.count({ where: { tenantId } }),
      prisma.member.count({ where: { tenantId, status: "active" } }),
      prisma.loan.count({
        where: { tenantId, status: { in: [...activeFinancingStatuses] } },
      }),
      options.deployableFunds ??
        getDeployableFundsSnapshot({ tenantId }, prisma),
    ])

  const totalContributions = deployableFunds.totalContributionAmount
  const outstandingLoans = deployableFunds.outstandingFinancingAmount
  const reserveBuffer = deployableFunds.reserveBufferAmount
  // Same funding model as disbursement (member funds held − outstanding −
  // reserve − billing); approved holds are subtracted by the caller.
  const availablePool = deployableFunds.availablePoolAmount

  // Delinquency: late schedule items (unpaid, due before today; read from
  // the due date, not a stored status) / all schedule items, active loans.
  const overdueScheduleCount = await prisma.repaymentScheduleItem.count({
    where: {
      tenantId,
      ...lateScheduleItemWhere(),
      loan: { status: { in: [...activeFinancingStatuses] } },
    },
  })

  const totalScheduleItems = await prisma.repaymentScheduleItem.count({
    where: {
      tenantId,
      loan: { status: { in: [...activeFinancingStatuses] } },
    },
  })

  const delinquencyRate =
    totalScheduleItems > 0 ? overdueScheduleCount / totalScheduleItems : 0

  return {
    memberCount,
    activeMemberCount,
    activeLoanCount,
    totalContributions,
    outstandingLoans,
    availablePool,
    reserveBuffer,
    delinquencyRate,
  }
}

export async function getOverviewSummary(
  tenantId: string,
  prismaOverride?: PrismaClient,
  options: {
    /** Reuse a deployable-funds snapshot the caller already started (one read, not two). */
    deployableFunds?: Promise<DeployableFundsSnapshot>
    /**
     * The tenant's operation profile when the caller already has it (the
     * dashboard's request-cached copy), to avoid a second read.
     */
    operationProfile?: Promise<TenantOperationProfileReadModel>
    /**
     * "open-items" (mobile): the caller drops rows with a zero count, so the
     * operation profile, which only keeps zero-count service rows visible in
     * the staff nav, is not read (three queries, and no default-row writes).
     * The default "staff-nav" is the dashboard behaviour.
     */
    queueRows?: "open-items" | "staff-nav"
  } = {}
): Promise<OverviewSummary> {
  const prisma = prismaOverride ?? createPrismaClient()

  if (!prisma) {
    return getEmptyOverviewSummary({
      currencyCode: "NGN",
      tenantId,
      tenantName: "Workspace",
    })
  }

  const asOf = new Date()
  const { month, year } = getCurrentMonth()
  // Start independent reads alongside the KPIs and the monthly collection.
  const deployableFundsSnapshot =
    options.deployableFunds ?? getDeployableFundsSnapshot({ tenantId }, prisma)
  const activityRowsRead = readOverviewRecentActivity(prisma, tenantId)
  const financingCycleHealthRead = getMonthlyFinancingCycleHealth(
    { tenantId },
    prisma,
    { deployableFunds: deployableFundsSnapshot }
  )
  const operationProfileRead: Promise<TenantOperationProfileReadModel | null> =
    options.queueRows === "open-items"
      ? Promise.resolve(null)
      : (options.operationProfile ?? getTenantOperationProfile(tenantId, prisma))
  const [kpis, monthlyCollection] = await Promise.all([
    readOverviewKpis(prisma, tenantId, asOf),
    readMonthlyRecordCollection(tenantId, { month, year }, prisma),
  ])
  const tenant = kpis.tenant

  if (!tenant) {
    // The early reads are not needed; keep their failures handled.
    for (const read of [
      deployableFundsSnapshot,
      activityRowsRead,
      financingCycleHealthRead,
      operationProfileRead,
    ]) {
      read.catch(() => undefined)
    }
    return getEmptyOverviewSummary({
      currencyCode: "NGN",
      tenantId,
      tenantName: "Workspace",
    })
  }

  const [
    deployableFundsForOverview,
    activityRows,
    financingCycleHealth,
    operationProfile,
    commitments,
  ] = await Promise.all([
    deployableFundsSnapshot,
    activityRowsRead,
    financingCycleHealthRead,
    operationProfileRead,
    monthlyCollection && monthlyCollection.rowCount > 0n
      ? null
      : getCommitmentCollection(tenantId, { month, year }, prisma),
  ])
  const {
    activeShareBusinesses,
    draftDividendPeriods,
    failedImportCount,
    financingApprovalCount,
    kycReviewCount,
    openSupportCases,
    overdueAmount,
    par30Amount,
    par60Amount,
    par90Amount,
    pendingDisbursementCount,
    pendingDocumentReviews,
    pendingFoodPurchaseApplications,
    pendingMemberApprovals,
    pendingOpeningBalances,
    pendingPaymentReceipts,
    pendingProcurementRequests,
    pendingProjectFinancingRequests,
    pendingShareApplications,
    submittedFoodPurchaseAccounting,
  } = kpis

  const contributionHealth = buildContributionHealth({
    commitments,
    monthlyCollection,
    periodLabel: getFallbackPeriodLabel(),
  })
  const { expectedThisMonth, receivedThisMonth } = contributionHealth
  const collectionCoverage =
    expectedThisMonth > 0 ? receivedThisMonth / expectedThisMonth : 0
  // One snapshot feeds disbursement, Loans, mobile and this overview.
  const deployableFunds = financingCycleHealth.deployableFunds.deployableFunds
  const portfolioAtRiskRate =
    deployableFundsForOverview.outstandingFinancingAmount > 0
      ? overdueAmount / deployableFundsForOverview.outstandingFinancingAmount
      : 0
  const pendingProfitAmount =
    kpis.pendingProfitEntryAmount + kpis.pendingShareAllocationAmount
  const setupWarnings =
    tenant.initialMigrationStatus === "finalized" ||
    tenant.initialMigrationStatus === "live_operations"
      ? []
      : [
          {
            href: "/getting-started",
            key: "initial-migration",
            label: "Initial migration is not finalized",
          },
        ]
  const actionQueue = [
    {
      count: pendingMemberApprovals,
      href: "/membership-approvals?status=pending_approval",
      key: "membership-approvals",
      label: "Membership approvals",
      severity: "warning" as const,
    },
    {
      count: kycReviewCount + pendingDocumentReviews,
      href: "/members?kycStatus=pending",
      key: "kyc-documents",
      label: "KYC and document reviews",
      severity: "warning" as const,
    },
    {
      count: financingApprovalCount,
      href: "/loans",
      key: "financing-approvals",
      label: "Financing approvals",
      severity: "warning" as const,
    },
    {
      count: pendingDisbursementCount,
      href: "/loans",
      key: "disbursement-holds",
      label: "Disbursement holds",
      severity: "critical" as const,
    },
    {
      count: pendingShareApplications,
      href: "/settings/finance/shares",
      key: "share-applications",
      label: "Share applications",
      severity: "warning" as const,
    },
    {
      count: pendingOpeningBalances,
      href: "/members",
      key: "opening-balances",
      label: "Opening balance reviews",
      severity: "warning" as const,
    },
    {
      count: pendingProcurementRequests,
      href: "/procurement",
      key: "procurement-requests",
      label: "Procurement requests",
      severity: "warning" as const,
    },
    {
      count: pendingProjectFinancingRequests,
      href: "/project-financing",
      key: "project-financing-requests",
      label: "Project financing requests",
      severity: "warning" as const,
    },
    {
      count: pendingFoodPurchaseApplications,
      href: "/food-purchase",
      key: "food-purchase-applications",
      label: "Foodstuff Purchase applications",
      severity: "warning" as const,
    },
    {
      count: submittedFoodPurchaseAccounting,
      href: "/food-purchase",
      key: "food-purchase-accounting",
      label: "Foodstuff Purchase accounting",
      severity: "warning" as const,
    },
    {
      count: pendingPaymentReceipts,
      href: "/payment-receipts",
      key: "payment-receipts",
      label: "Payment receipts",
      severity: "warning" as const,
    },
    {
      count: openSupportCases,
      href: "/support",
      key: "support-cases",
      label: "Support cases",
      severity: "warning" as const,
    },
    {
      count: financingCycleHealth.warnings.length,
      href: "/loans",
      key: "financing-cycle-warnings",
      label: "Financing cycle warnings",
      severity: financingCycleHealth.warnings.some(
        (warning) => warning.severity === "critical"
      )
        ? ("critical" as const)
        : ("warning" as const),
    },
    {
      count: kpis.overdueItemCount,
      href: "/repayments?view=schedule&scheduleStatus=overdue",
      key: "overdue-follow-ups",
      label: "Overdue follow-ups",
      severity: "critical" as const,
    },
    {
      count: failedImportCount,
      href: "/settings/imports/batches",
      key: "failed-imports",
      label: "Failed imports",
      severity: "critical" as const,
    },
    {
      count: draftDividendPeriods + Number(pendingProfitAmount > 0),
      href: "/settings/finance/business",
      key: "profit-review",
      label: "Profit or dividend items pending review",
      severity: "warning" as const,
    },
    {
      count: setupWarnings.length,
      href: "/getting-started",
      key: "setup-warnings",
      label: "Setup warnings",
      severity: "neutral" as const,
    },
  ].filter((item) => {
    if (item.key === "procurement-requests") {
      return (
        operationProfile?.services.procurement.shouldShowInStaffNav ||
        item.count > 0
      )
    }

    if (
      item.key === "food-purchase-applications" ||
      item.key === "food-purchase-accounting"
    ) {
      return (
        operationProfile?.services.food_purchase.shouldShowInStaffNav ||
        item.count > 0
      )
    }

    if (item.key === "payment-receipts") {
      return (
        operationProfile?.services.payment_receipts.shouldShowInStaffNav ||
        item.count > 0
      )
    }

    if (item.key === "support-cases") {
      return (
        operationProfile?.services.support_cases.shouldShowInStaffNav ||
        item.count > 0
      )
    }

    return true
  })

  const recentActivity = activityRows
    .map((row) => {
      const memberName = row.memberName ?? "A member"

      if (row.kind === "loan_request") {
        const status = (row.status ?? "").replace(/_/g, " ")
        return {
          amount: null,
          detail: `${memberName} · ${status}`,
          kind: row.kind,
          memberName,
          href: "/loans",
          id: `loan-request-${row.id}`,
          label: "Financing request updated",
          occurredAt: row.occurredAt.toISOString(),
          status: status || null,
        }
      }

      const amount = Number(row.amount)

      return row.kind === "contribution"
        ? {
            amount,
            detail: `${memberName} paid ${amount.toLocaleString("en-NG")}`,
            kind: row.kind,
            memberName,
            href: "/contributions",
            id: `contribution-${row.id}`,
            label: "Contribution posted",
            occurredAt: row.occurredAt.toISOString(),
            status: null,
          }
        : {
            amount,
            detail: `${memberName} repaid ${amount.toLocaleString("en-NG")}`,
            kind: row.kind,
            memberName,
            href: "/repayments",
            id: `repayment-${row.id}`,
            label: "Repayment posted",
            occurredAt: row.occurredAt.toISOString(),
            status: null,
          }
    })
    .sort((first, second) => second.occurredAt.localeCompare(first.occurredAt))
    .slice(0, 6)

  return {
    workspace: {
      currencyCode: tenant.currencyCode,
      generatedAt: new Date().toISOString(),
      tenantId,
      tenantName: tenant.name,
    },
    primaryMetrics: {
      actionQueueTotal: actionQueue.reduce(
        (total, item) => total + item.count,
        0
      ),
      collectionCoverage,
      deployableFunds,
      portfolioAtRiskAmount: overdueAmount,
      portfolioAtRiskRate,
    },
    actionQueue,
    contributionHealth,
    financingRisk: {
      financingCycleWarningCount: financingCycleHealth.warnings.length,
      outstandingPrincipal:
        deployableFundsForOverview.outstandingFinancingAmount,
      overdueAmount,
      par30Amount,
      par60Amount,
      par90Amount,
      pendingDisbursementCount,
    },
    complianceWatch: [
      {
        count: kycReviewCount,
        href: "/members?kycStatus=pending",
        key: "kyc-incomplete",
        label: "Members with incomplete KYC",
      },
      {
        count: pendingDocumentReviews,
        href: "/members",
        key: "document-review",
        label: "Documents pending review",
      },
      {
        count: draftDividendPeriods + Number(pendingProfitAmount > 0),
        href: "/settings/finance/business",
        key: "profit-review",
        label: "Profit or dividend items pending review",
      },
    ],
    recentActivity,
    setupWarnings,
    shareAndProfitPosition: {
      activeInvestmentPoolCount: activeShareBusinesses,
      profitPendingAllocation: pendingProfitAmount,
      shareCapitalBalance: kpis.shareCapitalBalance,
    },
  }
}
