import { createPrismaClient } from "../prisma"
import { getOverviewSummary } from "./dashboard"
import {
  getMemberByUserId,
  getMemberStatementDetail,
  listMemberStatementSummaries,
} from "./members"
import {
  getMemberShareBalancesAtDate,
  getMemberUnitSharePosition,
  getTenantSharePolicy,
  listMemberShareApplications,
  listMemberShareLedgerEntries,
} from "./tenant-finance"

export type MobileMetricFormat = "currency" | "percent" | "count"

export const mobileMemberSectionKeys = [
  "commitments",
  "financing",
  "shares",
] as const

export type MobileMemberSectionKey = (typeof mobileMemberSectionKeys)[number]

export type MobileOverviewMetric = {
  detail: string
  format: MobileMetricFormat
  key: string
  label: string
  value: number
}

export type MobileMemberHome = {
  actionItems: Array<{
    detail: string
    key: string
    label: string
    severity: "neutral" | "warning" | "critical"
  }>
  generatedAt: string
  member: {
    id: string
    kycStatus: string
    memberNumber: string
    name: string
    status: string
  } | null
  readiness: {
    detail: string
    percentage: number
    status: "ready" | "needs_attention" | "missing_profile"
  }
  stats: MobileOverviewMetric[]
}

export type MobileAdminOverview = {
  actionQueue: Array<{
    count: number
    detail: string
    key: string
    label: string
    severity: "neutral" | "warning" | "critical"
  }>
  generatedAt: string
  stats: MobileOverviewMetric[]
  warnings: Array<{
    key: string
    label: string
  }>
}

export type MobileMemberSectionRow = {
  detail: string
  format: MobileMetricFormat | null
  key: string
  label: string
  status: string | null
  value: number | null
}

export type MobileMemberSection = {
  emptyState: string
  generatedAt: string
  key: MobileMemberSectionKey
  rows: MobileMemberSectionRow[]
  stats: MobileOverviewMetric[]
  subtitle: string
  title: string
}

const memberSectionCopy: Record<
  MobileMemberSectionKey,
  {
    emptyState: string
    subtitle: string
    title: string
  }
> = {
  commitments: {
    emptyState:
      "No active commitment or contribution history is available yet.",
    subtitle: "Track cooperative commitments and posted savings.",
    title: "Commitments",
  },
  financing: {
    emptyState: "No active cooperative financing is available yet.",
    subtitle:
      "Monitor interest-free cooperative financing, repayment exposure, and posted repayments.",
    title: "Financing",
  },
  shares: {
    emptyState: "No share capital, applications, or dividend allocations yet.",
    subtitle: "Review share holdings, optional share requests, and dividends.",
    title: "Shares",
  },
}

function emptyMemberHome(): MobileMemberHome {
  return {
    actionItems: [
      {
        detail: "No linked member profile was found for this mobile session.",
        key: "member-profile",
        label: "Member profile needs linking",
        severity: "warning",
      },
    ],
    generatedAt: new Date().toISOString(),
    member: null,
    readiness: {
      detail: "Your cooperative profile is not linked to this account yet.",
      percentage: 0,
      status: "missing_profile",
    },
    stats: [
      {
        detail: "No active commitment available",
        format: "currency",
        key: "commitment",
        label: "Commitment",
        value: 0,
      },
      {
        detail: "No posted savings available",
        format: "currency",
        key: "savings",
        label: "Savings",
        value: 0,
      },
      {
        detail: "No active financing available",
        format: "currency",
        key: "financing",
        label: "Financing",
        value: 0,
      },
    ],
  }
}

function getEmptySectionStats(
  section: MobileMemberSectionKey
): MobileOverviewMetric[] {
  if (section === "financing") {
    return [
      {
        detail: "No active financing",
        format: "currency",
        key: "outstanding-principal",
        label: "Outstanding",
        value: 0,
      },
      {
        detail: "No monthly servicing due",
        format: "currency",
        key: "monthly-servicing",
        label: "Monthly servicing",
        value: 0,
      },
      {
        detail: "No active records",
        format: "count",
        key: "active-financing",
        label: "Active records",
        value: 0,
      },
    ]
  }

  if (section === "shares") {
    return [
      {
        detail: "No share balance available",
        format: "currency",
        key: "share-capital",
        label: "Share capital",
        value: 0,
      },
      {
        detail: "No pending applications",
        format: "count",
        key: "pending-shares",
        label: "Pending requests",
        value: 0,
      },
      {
        detail: "No published dividends",
        format: "currency",
        key: "dividends",
        label: "Dividends",
        value: 0,
      },
    ]
  }

  return [
    {
      detail: "No active commitment available",
      format: "currency",
      key: "active-commitment",
      label: "Active commitment",
      value: 0,
    },
    {
      detail: "No posted savings available",
      format: "currency",
      key: "savings",
      label: "Savings",
      value: 0,
    },
    {
      detail: "No posted contributions",
      format: "count",
      key: "contributions",
      label: "Contributions",
      value: 0,
    },
  ]
}

function emptyMemberSection(
  section: MobileMemberSectionKey,
  detail = "No linked member profile was found for this mobile session."
): MobileMemberSection {
  const copy = memberSectionCopy[section]

  return {
    emptyState: copy.emptyState,
    generatedAt: new Date().toISOString(),
    key: section,
    rows: [
      {
        detail,
        format: null,
        key: "member-profile",
        label: "Member profile needs linking",
        status: "Needs setup",
        value: null,
      },
    ],
    stats: getEmptySectionStats(section),
    subtitle: copy.subtitle,
    title: copy.title,
  }
}

function humanizeStatus(value: string | null | undefined) {
  if (!value) {
    return null
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getReadiness(input: {
  kycStatus: string
  memberStatus: string
}): MobileMemberHome["readiness"] {
  if (input.memberStatus !== "active") {
    return {
      detail: "Your membership is not active yet.",
      percentage: 40,
      status: "needs_attention",
    }
  }

  if (input.kycStatus === "verified") {
    return {
      detail: "Member profile and KYC are ready.",
      percentage: 100,
      status: "ready",
    }
  }

  return {
    detail:
      input.kycStatus === "rejected"
        ? "KYC needs correction before full self-service access."
        : "KYC is still pending or not started.",
    percentage: input.kycStatus === "rejected" ? 50 : 72,
    status: "needs_attention",
  }
}

function formatDateLabel(value: Date | null) {
  if (!value) {
    return null
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(value)
}

function emptyRows(section: MobileMemberSectionKey): MobileMemberSectionRow[] {
  return [
    {
      detail: memberSectionCopy[section].emptyState,
      format: null,
      key: "empty",
      label: "Nothing to show yet",
      status: null,
      value: null,
    },
  ]
}

function buildCommitmentSection(
  detail: NonNullable<Awaited<ReturnType<typeof getMemberStatementDetail>>>
): MobileMemberSection {
  const activePlan =
    detail.member.contributionPlans.find((plan) => plan.isActive) ??
    detail.member.contributionPlans[0] ??
    null
  const rows: MobileMemberSectionRow[] = []

  if (activePlan) {
    rows.push({
      detail: activePlan.startsAt
        ? `Started ${formatDateLabel(activePlan.startsAt)}`
        : (humanizeStatus(activePlan.interval) ?? "Contribution plan"),
      format: "currency",
      key: `plan-${activePlan.id}`,
      label: activePlan.name,
      status: activePlan.isActive ? "Active" : "Inactive",
      value: Number(activePlan.amount ?? 0),
    })
  }

  for (const contribution of detail.contributions.slice(0, 4)) {
    rows.push({
      detail: [
        humanizeStatus(contribution.channel),
        contribution.postedAt
          ? `Posted ${formatDateLabel(contribution.postedAt)}`
          : null,
        contribution.reference ? `Ref ${contribution.reference}` : null,
      ]
        .filter(Boolean)
        .join(" - "),
      format: "currency",
      key: `contribution-${contribution.id}`,
      label: contribution.periodLabel ?? "Contribution posted",
      status: humanizeStatus(contribution.status),
      value: Number(contribution.amount ?? 0),
    })
  }

  const summary = detail.summary
  const copy = memberSectionCopy.commitments

  return {
    emptyState: copy.emptyState,
    generatedAt: new Date().toISOString(),
    key: "commitments",
    rows: rows.length > 0 ? rows : emptyRows("commitments"),
    stats: [
      {
        detail: activePlan?.startsAt
          ? `Active since ${formatDateLabel(activePlan.startsAt)}`
          : "No active commitment available",
        format: "currency",
        key: "active-commitment",
        label: "Active commitment",
        value: Number(activePlan?.amount ?? 0),
      },
      {
        detail:
          (summary?.contributionsCount ?? 0) > 0
            ? `${summary?.contributionsCount ?? 0} posted entries`
            : "No posted contribution entries",
        format: "currency",
        key: "savings",
        label: "Savings",
        value: summary?.totalSavingsSnapshot ?? 0,
      },
      {
        detail: "Posted contribution entries",
        format: "count",
        key: "contributions",
        label: "Contributions",
        value: summary?.contributionsCount ?? 0,
      },
    ],
    subtitle: copy.subtitle,
    title: copy.title,
  }
}

function buildFinancingSection(
  detail: NonNullable<Awaited<ReturnType<typeof getMemberStatementDetail>>>
): MobileMemberSection {
  const rows: MobileMemberSectionRow[] = []

  for (const loan of detail.loans.slice(0, 5)) {
    const nextScheduleItem =
      loan.repaymentScheduleItems.find((item) => item.status !== "paid") ??
      loan.repaymentScheduleItems[0] ??
      null

    rows.push({
      detail: [
        `${loan.termMonths} month term`,
        nextScheduleItem?.dueAt
          ? `Next due ${formatDateLabel(nextScheduleItem.dueAt)}`
          : "No open due date",
      ]
        .filter(Boolean)
        .join(" - "),
      format: "currency",
      key: `loan-${loan.id}`,
      label: loan.loanProduct.name,
      status: humanizeStatus(loan.status),
      value: Number(loan.outstandingPrincipal ?? 0),
    })
  }

  for (const repayment of detail.repayments.slice(0, 3)) {
    rows.push({
      detail: [
        repayment.loan.loanProduct.name,
        repayment.paidAt ? `Paid ${formatDateLabel(repayment.paidAt)}` : null,
        repayment.reference ? `Ref ${repayment.reference}` : null,
      ]
        .filter(Boolean)
        .join(" - "),
      format: "currency",
      key: `repayment-${repayment.id}`,
      label: "Repayment posted",
      status: humanizeStatus(repayment.status),
      value: Number(repayment.amount ?? 0),
    })
  }

  const summary = detail.summary
  const copy = memberSectionCopy.financing

  return {
    emptyState: copy.emptyState,
    generatedAt: new Date().toISOString(),
    key: "financing",
    rows: rows.length > 0 ? rows : emptyRows("financing"),
    stats: [
      {
        detail:
          (summary?.activeLoanCount ?? 0) > 0
            ? `${summary?.activeLoanCount ?? 0} active financing record(s)`
            : "No active financing",
        format: "currency",
        key: "outstanding-principal",
        label: "Outstanding",
        value: summary?.totalOutstandingPrincipal ?? 0,
      },
      {
        detail: "Estimated monthly servicing",
        format: "currency",
        key: "monthly-servicing",
        label: "Monthly servicing",
        value: summary?.totalEstimatedMonthlyServicing ?? 0,
      },
      {
        detail: "Active financing records",
        format: "count",
        key: "active-financing",
        label: "Active records",
        value: summary?.activeLoanCount ?? 0,
      },
    ],
    subtitle: copy.subtitle,
    title: copy.title,
  }
}

async function buildSharesSection(
  input: {
    detail: NonNullable<Awaited<ReturnType<typeof getMemberStatementDetail>>>
    memberId: string
    tenantId: string
  },
  prisma: NonNullable<ReturnType<typeof createPrismaClient>>
): Promise<MobileMemberSection> {
  const now = new Date()
  const policy = await getTenantSharePolicy(input.tenantId, prisma)
  const [applications, ledgerEntries, balances, unitPosition] =
    await Promise.all([
      listMemberShareApplications(
        {
          memberId: input.memberId,
          tenantId: input.tenantId,
        },
        prisma
      ),
      listMemberShareLedgerEntries(
        {
          memberId: input.memberId,
          tenantId: input.tenantId,
        },
        prisma
      ),
      getMemberShareBalancesAtDate(input.tenantId, now, prisma),
      policy.configurationMode === "unit_based"
        ? getMemberUnitSharePosition(
            {
              memberId: input.memberId,
              tenantId: input.tenantId,
            },
            prisma
          )
        : Promise.resolve(null),
    ])
  const shareBalance =
    balances.find((balance) => balance.memberId === input.memberId)
      ?.shareBalance ?? 0
  const pendingApplicationCount = applications.filter(
    (application) => application.status === "pending"
  ).length
  const rows: MobileMemberSectionRow[] = []

  if (unitPosition) {
    rows.push({
      detail: `${unitPosition.compulsoryUnits} compulsory + ${unitPosition.approvedOptionalUnits} optional units`,
      format: "count",
      key: "approved-share-units",
      label: "Approved share units",
      status: "Unit model",
      value: unitPosition.totalApprovedUnits,
    })

    if (unitPosition.pendingOptionalUnits > 0) {
      rows.push({
        detail: "Awaiting share review",
        format: "count",
        key: "pending-share-units",
        label: "Pending optional units",
        status: "Pending",
        value: unitPosition.pendingOptionalUnits,
      })
    }
  } else if (shareBalance > 0) {
    rows.push({
      detail: "Ledger balance as of today",
      format: "currency",
      key: "share-capital-balance",
      label: "Share capital balance",
      status: "Current",
      value: shareBalance,
    })
  }

  for (const application of applications.slice(0, 3)) {
    rows.push({
      detail: [
        `${application.requestedUnits} requested unit(s)`,
        application.createdAt
          ? `Requested ${formatDateLabel(application.createdAt)}`
          : null,
      ]
        .filter(Boolean)
        .join(" - "),
      format: "currency",
      key: `share-application-${application.id}`,
      label: "Optional share request",
      status: humanizeStatus(application.status),
      value: application.shareValueSnapshot,
    })
  }

  for (const entry of ledgerEntries.slice(0, 3)) {
    rows.push({
      detail: [
        humanizeStatus(entry.sourceType),
        entry.effectiveDate
          ? `Effective ${formatDateLabel(entry.effectiveDate)}`
          : null,
      ]
        .filter(Boolean)
        .join(" - "),
      format: "currency",
      key: `share-ledger-${entry.id}`,
      label: entry.notes ?? "Share ledger movement",
      status: "Posted",
      value: Number(entry.amount ?? 0),
    })
  }

  for (const allocation of input.detail.dividendAllocations.slice(0, 3)) {
    rows.push({
      detail: [
        allocation.dividendPeriod.periodEnd
          ? `Period ended ${formatDateLabel(allocation.dividendPeriod.periodEnd)}`
          : null,
        allocation.dividendPeriod.publishedAt
          ? `Published ${formatDateLabel(allocation.dividendPeriod.publishedAt)}`
          : null,
      ]
        .filter(Boolean)
        .join(" - "),
      format: "currency",
      key: `dividend-${allocation.id}`,
      label: allocation.dividendPeriod.name,
      status: "Published dividend",
      value: Number(allocation.allocationAmount ?? 0),
    })
  }

  const summary = input.detail.summary
  const copy = memberSectionCopy.shares

  return {
    emptyState: copy.emptyState,
    generatedAt: new Date().toISOString(),
    key: "shares",
    rows: rows.length > 0 ? rows : emptyRows("shares"),
    stats: [
      {
        detail: unitPosition
          ? `${unitPosition.totalApprovedUnits} approved unit(s)`
          : "Ledger balance as of today",
        format: "currency",
        key: "share-capital",
        label: "Share capital",
        value: unitPosition?.totalApprovedValue ?? shareBalance,
      },
      {
        detail: "Awaiting review",
        format: "count",
        key: "pending-shares",
        label: "Pending requests",
        value: pendingApplicationCount,
      },
      {
        detail:
          (summary?.dividendAllocationCount ?? 0) > 0
            ? `${summary?.dividendAllocationCount ?? 0} published allocation(s)`
            : "No published dividends",
        format: "currency",
        key: "dividends",
        label: "Dividends",
        value: summary?.totalDividendAllocations ?? 0,
      },
    ],
    subtitle: copy.subtitle,
    title: copy.title,
  }
}

export async function getMobileMemberHome(input: {
  tenantId: string
  userId: string
}): Promise<MobileMemberHome> {
  const prisma = createPrismaClient()

  if (!prisma) {
    return emptyMemberHome()
  }

  const member = await getMemberByUserId(input, prisma)

  if (!member) {
    return emptyMemberHome()
  }

  const summaries = await listMemberStatementSummaries(input.tenantId, prisma)
  const summary = summaries.find((item) => item.memberId === member.id) ?? null
  const readiness = getReadiness({
    kycStatus: member.kycStatus,
    memberStatus: member.status,
  })
  const actionItems: MobileMemberHome["actionItems"] = []

  if (readiness.status !== "ready") {
    actionItems.push({
      detail: readiness.detail,
      key: "kyc-readiness",
      label: "Profile readiness",
      severity: "warning",
    })
  }

  if (!summary?.activeCommitmentAmount) {
    actionItems.push({
      detail: "No active monthly commitment was found.",
      key: "commitment",
      label: "Commitment setup",
      severity: "neutral",
    })
  }

  if ((summary?.totalOutstandingPrincipal ?? 0) > 0) {
    actionItems.push({
      detail: `${summary?.activeLoanCount ?? 0} active financing record(s).`,
      key: "financing",
      label: "Financing exposure",
      severity: "neutral",
    })
  }

  return {
    actionItems,
    generatedAt: new Date().toISOString(),
    member: {
      id: member.id,
      kycStatus: member.kycStatus,
      memberNumber: member.memberNumber,
      name: member.fullName,
      status: member.status,
    },
    readiness,
    stats: [
      {
        detail: summary?.activeCommitmentStartsAt
          ? `Active since ${formatDateLabel(summary.activeCommitmentStartsAt)}`
          : "No active commitment available",
        format: "currency",
        key: "commitment",
        label: "Commitment",
        value: summary?.activeCommitmentAmount ?? 0,
      },
      {
        detail:
          (summary?.contributionsCount ?? 0) > 0
            ? `${summary?.contributionsCount ?? 0} posted contribution entries`
            : "No posted contribution entries",
        format: "currency",
        key: "savings",
        label: "Savings",
        value: summary?.totalSavingsSnapshot ?? 0,
      },
      {
        detail:
          (summary?.activeLoanCount ?? 0) > 0
            ? `${summary?.activeLoanCount ?? 0} active financing record(s)`
            : "No active financing",
        format: "currency",
        key: "financing",
        label: "Financing",
        value: summary?.totalOutstandingPrincipal ?? 0,
      },
    ],
  }
}

export async function getMobileMemberSection(input: {
  section: MobileMemberSectionKey
  tenantId: string
  userId: string
}): Promise<MobileMemberSection> {
  const prisma = createPrismaClient()

  if (!prisma) {
    return emptyMemberSection(input.section)
  }

  const member = await getMemberByUserId(input, prisma)

  if (!member) {
    return emptyMemberSection(input.section)
  }

  const detail = await getMemberStatementDetail(
    input.tenantId,
    member.id,
    prisma
  )

  if (!detail) {
    return emptyMemberSection(
      input.section,
      "No statement detail was found for this member profile."
    )
  }

  if (input.section === "commitments") {
    return buildCommitmentSection(detail)
  }

  if (input.section === "financing") {
    return buildFinancingSection(detail)
  }

  return buildSharesSection(
    {
      detail,
      memberId: member.id,
      tenantId: input.tenantId,
    },
    prisma
  )
}

export async function getMobileAdminOverview(
  tenantId: string
): Promise<MobileAdminOverview> {
  const summary = await getOverviewSummary(tenantId)
  const topQueue = summary.actionQueue
    .filter((item) => item.count > 0)
    .slice(0, 5)

  return {
    actionQueue: topQueue.map((item) => ({
      count: item.count,
      detail: item.severity === "critical" ? "Needs urgent review" : "Open",
      key: item.key,
      label: item.label,
      severity: item.severity,
    })),
    generatedAt: summary.workspace.generatedAt,
    stats: [
      {
        detail: "After reserve and pending commitments",
        format: "currency",
        key: "deployable-funds",
        label: "Deployable funds",
        value: summary.primaryMetrics.deployableFunds,
      },
      {
        detail: summary.contributionHealth.periodLabel,
        format: "percent",
        key: "collection-coverage",
        label: "Collections",
        value: summary.primaryMetrics.collectionCoverage,
      },
      {
        detail: "Open mobile-safe action queue",
        format: "count",
        key: "action-queue",
        label: "Action queue",
        value: summary.primaryMetrics.actionQueueTotal,
      },
    ],
    warnings: summary.setupWarnings.map((item) => ({
      key: item.key,
      label: item.label,
    })),
  }
}
