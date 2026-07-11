import { createPrismaClient } from "../prisma"
import { getOverviewSummary } from "./dashboard"
import {
  listMemberLoanGuarantorApprovals,
  respondMemberLoanGuarantorApproval,
} from "./loans"
import {
  getMemberByUserId,
  getMemberStatementDetail,
  listMemberStatementSummaries,
} from "./members"
import {
  createMemberPaymentReceipt,
  getMemberScopedPaymentReceiptSummary,
  listMemberPaymentReceipts,
  type MemberPaymentReceiptRow,
  type PaymentReceiptAllocationInput,
} from "./payment-receipts"
import {
  createMemberSupportCase,
  getMemberSupportCaseSummary,
  listSupportCases,
  type SupportCaseCategory,
  type SupportCaseRow,
} from "./support"
import {
  createMemberShareApplication,
  getMemberShareBalancesAtDate,
  getMemberUnitSharePosition,
  getTenantSharePolicy,
  listMemberShareApplications,
  listMemberShareLedgerEntries,
  type MemberShareApplicationRow,
  type MemberShareApplicationStatus,
  type MemberUnitSharePosition,
  type TenantSharePolicySettings,
} from "./tenant-finance"

export type MobileMetricFormat = "currency" | "percent" | "count"

export const mobileMemberSectionKeys = [
  "commitments",
  "financing",
  "shares",
] as const

export type MobileMemberSectionKey = (typeof mobileMemberSectionKeys)[number]

export const mobileSupportCategoryKeys = [
  "payment_issue",
  "account_update",
  "shares",
  "financing",
  "procurement",
  "feature_request",
  "technical",
  "other",
] as const satisfies readonly SupportCaseCategory[]

export type MobileSupportCategory = (typeof mobileSupportCategoryKeys)[number]

export const mobileReceiptAllocationCategoryKeys = [
  "commitment",
  "special_savings",
  "loan_servicing",
  "loan_extra_payment",
  "shares",
  "procurement",
  "project_financing",
  "food_purchase",
  "other",
] as const satisfies readonly PaymentReceiptAllocationInput["category"][]

export type MobileReceiptAllocationCategory =
  (typeof mobileReceiptAllocationCategoryKeys)[number]

export const mobileReceiptChannelKeys = [
  "transfer",
  "cash",
  "manual",
  "payroll",
] as const

export type MobileReceiptChannel = (typeof mobileReceiptChannelKeys)[number]

export const mobileReceiptPeriodIntentKeys = [
  "current_period",
  "future_period",
  "back_period",
  "unspecified",
] as const satisfies readonly PaymentReceiptAllocationInput["periodIntent"][]

export type MobileReceiptPeriodIntent =
  (typeof mobileReceiptPeriodIntentKeys)[number]

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

export type MobileMemberMoreRow = {
  detail: string
  format: MobileMetricFormat | null
  key: string
  label: string
  status: string | null
  value: number | null
}

export type MobileMemberMoreSection = {
  icon: string
  key: "profile" | "statement" | "receipts" | "guarantors" | "support"
  rows: MobileMemberMoreRow[]
  title: string
}

export type MobileMemberMore = {
  generatedAt: string
  member: {
    id: string
    kycStatus: string
    memberNumber: string
    name: string
    status: string
  } | null
  sections: MobileMemberMoreSection[]
}

export type MobileMemberStatementSectionKey =
  | "profile"
  | MobileMemberSectionKey
  | "documents"
  | "ledger"

export type MobileMemberStatementSection = {
  emptyState: string
  key: MobileMemberStatementSectionKey
  rows: MobileMemberSectionRow[]
  subtitle: string
  title: string
}

export type MobileMemberStatement = {
  generatedAt: string
  member: {
    deductionSourceName: string | null
    email: string | null
    exitedAt: string | null
    id: string
    joinedAt: string
    kycStatus: string
    memberNumber: string
    memberType: string
    name: string
    status: string
  } | null
  sections: MobileMemberStatementSection[]
  stats: MobileOverviewMetric[]
}

export type MobileSupportCase = {
  category: MobileSupportCategory
  detail: string
  financialAdjustmentApprovalStatus: string
  id: string
  lastActivityAt: string
  messageCount: number
  priority: string
  requiresFinancialAdjustment: boolean
  status: string
  subject: string
}

export type MobileMemberSupport = {
  cases: MobileSupportCase[]
  generatedAt: string
  member: {
    id: string
    memberNumber: string
    name: string
  } | null
  summary: {
    highPriorityOpenCases: number
    openCases: number
    totalCases: number
  }
}

export type MobileReceiptAllocation = {
  amount: number
  category: MobileReceiptAllocationCategory
  id: string
  notes: string | null
  periodIntent: MobileReceiptPeriodIntent
  targetPeriodStart: string | null
}

export type MobilePaymentReceipt = {
  allocations: MobileReceiptAllocation[]
  channel: MobileReceiptChannel
  id: string
  memberNotes: string | null
  paidAt: string
  paymentReference: string | null
  proofDocumentName: string | null
  proofDocumentUrl: string | null
  reviewNotes: string | null
  status: string
  submittedAt: string
  totalAmount: number
}

export type MobileMemberReceipts = {
  generatedAt: string
  member: {
    id: string
    memberNumber: string
    name: string
  } | null
  receipts: MobilePaymentReceipt[]
  summary: {
    approvedReceipts: number
    correctionRequestedReceipts: number
    pendingReviewReceipts: number
    rejectedReceipts: number
  }
}

export type MobileMemberShareApplication = {
  approvedUnits: number | null
  createdAt: string
  id: string
  notes: string | null
  requestedUnits: number
  reviewedAt: string | null
  reviewNotes: string | null
  shareValueSnapshot: number
  status: MemberShareApplicationStatus
  unitAmountSnapshot: number
}

export type MobileMemberSharePolicy = Pick<
  TenantSharePolicySettings,
  | "configurationMode"
  | "compulsoryShareUnits"
  | "maximumShareUnits"
  | "unitAmount"
>

export type MobileMemberSharePosition = MemberUnitSharePosition & {
  remainingOptionalUnits: number
}

export type MobileMemberShares = {
  applications: MobileMemberShareApplication[]
  generatedAt: string
  member: {
    id: string
    memberNumber: string
    name: string
  } | null
  policy: MobileMemberSharePolicy | null
  position: MobileMemberSharePosition | null
  section: MobileMemberSection
  state:
    | "available"
    | "database_unavailable"
    | "member_profile_missing"
    | "unit_model_inactive"
}

type MobileLoanGuarantorApprovalRow = Awaited<
  ReturnType<typeof listMemberLoanGuarantorApprovals>
>[number]

export type MobileGuarantorApprovalDecision = "approved" | "rejected"

export type MobileMemberGuarantorApproval = {
  id: string
  loanRequest: {
    borrowerMemberNumber: string
    borrowerName: string
    estimatedMonthlyServicing: number
    id: string
    loanProductName: string
    purpose: string | null
    requestedAmount: number
    requestedAt: string
    requestedTermMonths: number
    status: string
  }
  requestedAt: string
  requestedByName: string | null
  respondedAt: string | null
  respondedByName: string | null
  responseNotes: string | null
  status: string
}

export type MobileMemberGuarantorApprovals = {
  approvals: MobileMemberGuarantorApproval[]
  generatedAt: string
  member: {
    id: string
    memberNumber: string
    name: string
  } | null
  summary: {
    approvedApprovals: number
    pendingApprovals: number
    rejectedApprovals: number
    totalApprovals: number
  }
}

export type MobileReceiptCreateAllocation = {
  amount: number
  category: MobileReceiptAllocationCategory
  notes?: string | null
  periodIntent?: MobileReceiptPeriodIntent | null
  targetPeriodStart?: Date | null
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

function emptyMemberSupport(): MobileMemberSupport {
  return {
    cases: [],
    generatedAt: new Date().toISOString(),
    member: null,
    summary: {
      highPriorityOpenCases: 0,
      openCases: 0,
      totalCases: 0,
    },
  }
}

function emptyMemberReceipts(): MobileMemberReceipts {
  return {
    generatedAt: new Date().toISOString(),
    member: null,
    receipts: [],
    summary: {
      approvedReceipts: 0,
      correctionRequestedReceipts: 0,
      pendingReviewReceipts: 0,
      rejectedReceipts: 0,
    },
  }
}

function emptyMemberGuarantorApprovals(): MobileMemberGuarantorApprovals {
  return {
    approvals: [],
    generatedAt: new Date().toISOString(),
    member: null,
    summary: {
      approvedApprovals: 0,
      pendingApprovals: 0,
      rejectedApprovals: 0,
      totalApprovals: 0,
    },
  }
}

function emptyMemberShares(
  state: MobileMemberShares["state"],
  detail: string
): MobileMemberShares {
  return {
    applications: [],
    generatedAt: new Date().toISOString(),
    member: null,
    policy: null,
    position: null,
    section: emptyMemberSection("shares", detail),
    state,
  }
}

function emptyMemberMore(): MobileMemberMore {
  return {
    generatedAt: new Date().toISOString(),
    member: null,
    sections: [
      {
        icon: "UserRound",
        key: "profile",
        rows: [
          {
            detail:
              "No linked member profile was found for this mobile session.",
            format: null,
            key: "member-profile",
            label: "Member profile needs linking",
            status: "Needs setup",
            value: null,
          },
        ],
        title: "Profile",
      },
    ],
  }
}

function getEmptyStatementStats(): MobileOverviewMetric[] {
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
      detail: "No active financing available",
      format: "currency",
      key: "financing",
      label: "Financing",
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

function emptyMemberStatement(
  detail = "No linked member profile was found for this mobile session."
): MobileMemberStatement {
  return {
    generatedAt: new Date().toISOString(),
    member: null,
    sections: [
      {
        emptyState: detail,
        key: "profile",
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
        subtitle: "Membership identity and statement readiness.",
        title: "Profile",
      },
    ],
    stats: getEmptyStatementStats(),
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

function moreRow(input: MobileMemberMoreRow): MobileMemberMoreRow {
  return input
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

function latestDateLabel(value: Date | null | undefined) {
  return value ? formatDateLabel(value) : "No recent activity"
}

function toMobileSupportCase(row: SupportCaseRow): MobileSupportCase {
  return {
    category: row.category as MobileSupportCategory,
    detail:
      row.messages.at(-1)?.message ??
      row.description ??
      "No support message available",
    financialAdjustmentApprovalStatus: row.financialAdjustmentApprovalStatus,
    id: row.id,
    lastActivityAt: row.updatedAt.toISOString(),
    messageCount: row.messages.length,
    priority: row.priority,
    requiresFinancialAdjustment: row.requiresFinancialAdjustment,
    status: row.status,
    subject: row.subject,
  }
}

function toMobileReceipt(row: MemberPaymentReceiptRow): MobilePaymentReceipt {
  return {
    allocations: row.allocations.map((allocation) => ({
      amount: allocation.amount,
      category: allocation.category as MobileReceiptAllocationCategory,
      id: allocation.id,
      notes: allocation.notes,
      periodIntent: allocation.periodIntent as MobileReceiptPeriodIntent,
      targetPeriodStart: allocation.targetPeriodStart
        ? allocation.targetPeriodStart.toISOString()
        : null,
    })),
    channel: row.channel as MobileReceiptChannel,
    id: row.id,
    memberNotes: row.memberNotes,
    paidAt: row.paidAt.toISOString(),
    paymentReference: row.paymentReference,
    proofDocumentName: row.proofDocumentName,
    proofDocumentUrl: row.proofDocumentUrl,
    reviewNotes: row.reviewNotes,
    status: row.status,
    submittedAt: row.submittedAt.toISOString(),
    totalAmount: row.totalAmount,
  }
}

function toMobileShareApplication(
  row: MemberShareApplicationRow
): MobileMemberShareApplication {
  return {
    approvedUnits: row.approvedUnits,
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    notes: row.notes,
    requestedUnits: row.requestedUnits,
    reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
    reviewNotes: row.reviewNotes,
    shareValueSnapshot: row.shareValueSnapshot,
    status: row.status,
    unitAmountSnapshot: row.unitAmountSnapshot,
  }
}

function toMobileSharePolicy(
  policy: TenantSharePolicySettings
): MobileMemberSharePolicy {
  return {
    compulsoryShareUnits: policy.compulsoryShareUnits,
    configurationMode: policy.configurationMode,
    maximumShareUnits: policy.maximumShareUnits,
    unitAmount: policy.unitAmount,
  }
}

function toMobileSharePosition(
  position: MemberUnitSharePosition
): MobileMemberSharePosition {
  return {
    ...position,
    remainingOptionalUnits: Math.max(
      0,
      position.maximumUnits - position.totalPendingUnits
    ),
  }
}

function toMobileGuarantorApproval(
  row: MobileLoanGuarantorApprovalRow
): MobileMemberGuarantorApproval {
  return {
    id: row.id,
    loanRequest: {
      borrowerMemberNumber: row.loanRequest.member.memberNumber,
      borrowerName: row.loanRequest.member.fullName,
      estimatedMonthlyServicing: Number(
        row.loanRequest.estimatedMonthlyServicing ?? 0
      ),
      id: row.loanRequest.id,
      loanProductName: row.loanRequest.loanProduct.name,
      purpose: row.loanRequest.purpose,
      requestedAmount: Number(row.loanRequest.requestedAmount ?? 0),
      requestedAt: row.loanRequest.requestedAt.toISOString(),
      requestedTermMonths: row.loanRequest.requestedTermMonths,
      status: row.loanRequest.status,
    },
    requestedAt: row.requestedAt.toISOString(),
    requestedByName: row.requestedByUser?.fullName ?? null,
    respondedAt: row.respondedAt ? row.respondedAt.toISOString() : null,
    respondedByName: row.respondedByUser?.fullName ?? null,
    responseNotes: row.responseNotes,
    status: row.status,
  }
}

function summarizeGuarantorApprovals(
  approvals: MobileMemberGuarantorApproval[]
): MobileMemberGuarantorApprovals["summary"] {
  return {
    approvedApprovals: approvals.filter(
      (approval) => approval.status === "approved"
    ).length,
    pendingApprovals: approvals.filter(
      (approval) => approval.status === "pending"
    ).length,
    rejectedApprovals: approvals.filter(
      (approval) => approval.status === "rejected"
    ).length,
    totalApprovals: approvals.length,
  }
}

async function buildMemberMore(input: {
  detail: NonNullable<Awaited<ReturnType<typeof getMemberStatementDetail>>>
  member: NonNullable<Awaited<ReturnType<typeof getMemberByUserId>>>
  prisma: NonNullable<ReturnType<typeof createPrismaClient>>
  tenantId: string
}): Promise<MobileMemberMore> {
  const [
    receiptSummary,
    receipts,
    guarantorApprovals,
    supportSummary,
    supportCases,
  ] = await Promise.all([
    getMemberScopedPaymentReceiptSummary(
      {
        memberId: input.member.id,
        tenantId: input.tenantId,
      },
      input.prisma
    ),
    listMemberPaymentReceipts(
      input.tenantId,
      {
        limit: 3,
        memberId: input.member.id,
      },
      input.prisma
    ),
    listMemberLoanGuarantorApprovals(
      {
        guarantorMemberId: input.member.id,
        tenantId: input.tenantId,
      },
      input.prisma
    ),
    getMemberSupportCaseSummary(
      {
        memberId: input.member.id,
        tenantId: input.tenantId,
      },
      input.prisma
    ),
    listSupportCases(
      {
        limit: 3,
        memberId: input.member.id,
        tenantId: input.tenantId,
      },
      input.prisma
    ),
  ])
  const summary = input.detail.summary
  const verifiedDocuments = input.detail.member.documents.filter(
    (document) => document.reviewStatus === "verified"
  ).length
  const latestReceipt = receipts[0] ?? null
  const pendingGuarantorCount = guarantorApprovals.filter(
    (approval) => approval.status === "pending"
  ).length
  const latestGuarantorApproval = guarantorApprovals[0] ?? null
  const latestSupportCase = supportCases[0] ?? null

  return {
    generatedAt: new Date().toISOString(),
    member: {
      id: input.member.id,
      kycStatus: input.member.kycStatus,
      memberNumber: input.member.memberNumber,
      name: input.member.fullName,
      status: input.member.status,
    },
    sections: [
      {
        icon: "UserRound",
        key: "profile",
        rows: [
          moreRow({
            detail: `${humanizeStatus(input.member.status) ?? "Member"} membership`,
            format: null,
            key: "member-number",
            label: input.member.memberNumber,
            status: humanizeStatus(input.member.kycStatus),
            value: null,
          }),
          moreRow({
            detail:
              input.detail.member.documents.length > 0
                ? `${verifiedDocuments} verified document(s)`
                : "No uploaded member documents",
            format: "count",
            key: "documents",
            label: "Documents",
            status:
              input.detail.member.documents.length > 0
                ? "Available"
                : "Needs upload",
            value: input.detail.member.documents.length,
          }),
        ],
        title: "Profile",
      },
      {
        icon: "FileText",
        key: "statement",
        rows: [
          moreRow({
            detail:
              (summary?.contributionsCount ?? 0) > 0
                ? `${summary?.contributionsCount ?? 0} posted contribution entries`
                : "No posted contribution entries",
            format: "currency",
            key: "savings",
            label: "Savings snapshot",
            status: latestDateLabel(summary?.lastContributionAt),
            value: summary?.totalSavingsSnapshot ?? 0,
          }),
          moreRow({
            detail:
              (summary?.activeLoanCount ?? 0) > 0
                ? `${summary?.activeLoanCount ?? 0} active financing record(s)`
                : "No active financing",
            format: "currency",
            key: "financing",
            label: "Financing exposure",
            status: latestDateLabel(summary?.lastRepaymentAt),
            value: summary?.totalOutstandingPrincipal ?? 0,
          }),
          moreRow({
            detail:
              (summary?.dividendAllocationCount ?? 0) > 0
                ? `${summary?.dividendAllocationCount ?? 0} published allocation(s)`
                : "No published dividend allocations",
            format: "currency",
            key: "dividends",
            label: "Published dividends",
            status: latestDateLabel(summary?.lastDividendAllocatedAt),
            value: summary?.totalDividendAllocations ?? 0,
          }),
        ],
        title: "Statement",
      },
      {
        icon: "ReceiptText",
        key: "receipts",
        rows: [
          moreRow({
            detail:
              receiptSummary.pendingReviewReceipts > 0
                ? "Submitted or under review"
                : "No receipts waiting on finance",
            format: "count",
            key: "pending-receipts",
            label: "Pending review",
            status: receiptSummary.pendingReviewReceipts > 0 ? "Open" : "Clear",
            value: receiptSummary.pendingReviewReceipts,
          }),
          moreRow({
            detail:
              receiptSummary.correctionRequestedReceipts > 0
                ? "Finance requested a correction"
                : "No correction requests",
            format: "count",
            key: "correction-receipts",
            label: "Corrections requested",
            status:
              receiptSummary.correctionRequestedReceipts > 0
                ? "Needs action"
                : "Clear",
            value: receiptSummary.correctionRequestedReceipts,
          }),
          ...(latestReceipt
            ? [
                moreRow({
                  detail: latestReceipt.paymentReference
                    ? `Ref ${latestReceipt.paymentReference}`
                    : `Submitted ${formatDateLabel(latestReceipt.submittedAt)}`,
                  format: "currency" as const,
                  key: `receipt-${latestReceipt.id}`,
                  label: "Latest receipt",
                  status: humanizeStatus(latestReceipt.status),
                  value: latestReceipt.totalAmount,
                }),
              ]
            : []),
        ],
        title: "Receipts",
      },
      {
        icon: "ShieldCheck",
        key: "guarantors",
        rows: [
          moreRow({
            detail:
              pendingGuarantorCount > 0
                ? "Waiting for your response"
                : "No pending guarantor response",
            format: "count",
            key: "pending-guarantors",
            label: "Pending guarantor requests",
            status: pendingGuarantorCount > 0 ? "Needs action" : "Clear",
            value: pendingGuarantorCount,
          }),
          ...(latestGuarantorApproval
            ? [
                moreRow({
                  detail: `${latestGuarantorApproval.loanRequest.member.fullName} - ${latestGuarantorApproval.loanRequest.loanProduct.name}`,
                  format: "currency" as const,
                  key: `guarantor-${latestGuarantorApproval.id}`,
                  label: "Latest request",
                  status: humanizeStatus(latestGuarantorApproval.status),
                  value: Number(
                    latestGuarantorApproval.loanRequest.requestedAmount ?? 0
                  ),
                }),
              ]
            : []),
        ],
        title: "Guarantor approvals",
      },
      {
        icon: "Headphones",
        key: "support",
        rows: [
          moreRow({
            detail:
              supportSummary.openCases > 0
                ? "Open, in progress, or waiting on member"
                : "No open support cases",
            format: "count",
            key: "open-support",
            label: "Open cases",
            status: supportSummary.openCases > 0 ? "Open" : "Clear",
            value: supportSummary.openCases,
          }),
          moreRow({
            detail:
              supportSummary.highPriorityOpenCases > 0
                ? "High or urgent priority"
                : "No high priority open cases",
            format: "count",
            key: "priority-support",
            label: "Priority cases",
            status:
              supportSummary.highPriorityOpenCases > 0
                ? "Needs attention"
                : "Clear",
            value: supportSummary.highPriorityOpenCases,
          }),
          ...(latestSupportCase
            ? [
                moreRow({
                  detail: latestSupportCase.subject,
                  format: null,
                  key: `support-${latestSupportCase.id}`,
                  label: "Latest support case",
                  status: humanizeStatus(latestSupportCase.status),
                  value: null,
                }),
              ]
            : []),
        ],
        title: "Support",
      },
    ],
  }
}

export async function getMobileMemberReceipts(input: {
  tenantId: string
  userId: string
}): Promise<MobileMemberReceipts> {
  const prisma = createPrismaClient()

  if (!prisma) {
    return emptyMemberReceipts()
  }

  const member = await getMemberByUserId(input, prisma)

  if (!member) {
    return emptyMemberReceipts()
  }

  const [summary, receipts] = await Promise.all([
    getMemberScopedPaymentReceiptSummary(
      {
        memberId: member.id,
        tenantId: input.tenantId,
      },
      prisma
    ),
    listMemberPaymentReceipts(
      input.tenantId,
      {
        limit: 20,
        memberId: member.id,
      },
      prisma
    ),
  ])

  return {
    generatedAt: new Date().toISOString(),
    member: {
      id: member.id,
      memberNumber: member.memberNumber,
      name: member.fullName,
    },
    receipts: receipts.map(toMobileReceipt),
    summary: {
      approvedReceipts: summary.approvedReceipts,
      correctionRequestedReceipts: summary.correctionRequestedReceipts,
      pendingReviewReceipts: summary.pendingReviewReceipts,
      rejectedReceipts: summary.rejectedReceipts,
    },
  }
}

export async function getMobileMemberGuarantorApprovals(input: {
  tenantId: string
  userId: string
}): Promise<MobileMemberGuarantorApprovals> {
  const prisma = createPrismaClient()

  if (!prisma) {
    return emptyMemberGuarantorApprovals()
  }

  const member = await getMemberByUserId(input, prisma)

  if (!member) {
    return emptyMemberGuarantorApprovals()
  }

  const approvals = (
    await listMemberLoanGuarantorApprovals(
      {
        guarantorMemberId: member.id,
        tenantId: input.tenantId,
      },
      prisma
    )
  ).map(toMobileGuarantorApproval)

  return {
    approvals,
    generatedAt: new Date().toISOString(),
    member: {
      id: member.id,
      memberNumber: member.memberNumber,
      name: member.fullName,
    },
    summary: summarizeGuarantorApprovals(approvals),
  }
}

export async function respondMobileMemberGuarantorApproval(input: {
  guarantorApprovalId: string
  notes?: string | null
  status: MobileGuarantorApprovalDecision
  tenantId: string
  userId: string
}): Promise<MobileMemberGuarantorApproval> {
  const prisma = createPrismaClient()

  if (!prisma) {
    throw new Error(
      "Guarantor approvals are unavailable without database configuration."
    )
  }

  const member = await getMemberByUserId(input, prisma)

  if (!member) {
    throw new Error(
      "Member profile needs linking before answering guarantor requests."
    )
  }

  await respondMemberLoanGuarantorApproval(
    {
      actorUserId: input.userId,
      guarantorApprovalId: input.guarantorApprovalId,
      guarantorMemberId: member.id,
      notes: input.notes ?? undefined,
      status: input.status,
      tenantId: input.tenantId,
    },
    prisma
  )

  const approval = (
    await listMemberLoanGuarantorApprovals(
      {
        guarantorMemberId: member.id,
        tenantId: input.tenantId,
      },
      prisma
    )
  ).find((item) => item.id === input.guarantorApprovalId)

  if (!approval) {
    throw new Error("Loan guarantor approval not found.")
  }

  return toMobileGuarantorApproval(approval)
}

export async function getMobileMemberShares(input: {
  tenantId: string
  userId: string
}): Promise<MobileMemberShares> {
  const prisma = createPrismaClient()

  if (!prisma) {
    return emptyMemberShares(
      "database_unavailable",
      "Share self-service needs the database runtime."
    )
  }

  const member = await getMemberByUserId(input, prisma)

  if (!member) {
    return emptyMemberShares(
      "member_profile_missing",
      "No linked member profile was found for this mobile session."
    )
  }

  const detail = await getMemberStatementDetail(
    input.tenantId,
    member.id,
    prisma
  )

  if (!detail) {
    return emptyMemberShares(
      "member_profile_missing",
      "No linked member statement was found for this mobile session."
    )
  }

  const policy = await getTenantSharePolicy(input.tenantId, prisma)
  const [section, applications, unitPosition] = await Promise.all([
    buildSharesSection(
      {
        detail,
        memberId: member.id,
        tenantId: input.tenantId,
      },
      prisma
    ),
    listMemberShareApplications(
      {
        memberId: member.id,
        tenantId: input.tenantId,
      },
      prisma
    ),
    policy.configurationMode === "unit_based"
      ? getMemberUnitSharePosition(
          {
            memberId: member.id,
            tenantId: input.tenantId,
          },
          prisma
        )
      : Promise.resolve(null),
  ])

  return {
    applications: applications.map(toMobileShareApplication),
    generatedAt: new Date().toISOString(),
    member: {
      id: member.id,
      memberNumber: member.memberNumber,
      name: member.fullName,
    },
    policy: toMobileSharePolicy(policy),
    position: unitPosition ? toMobileSharePosition(unitPosition) : null,
    section,
    state:
      policy.configurationMode === "unit_based"
        ? "available"
        : "unit_model_inactive",
  }
}

export async function createMobileMemberShareApplication(input: {
  notes?: string | null
  requestedUnits: number
  tenantId: string
  userId: string
}): Promise<MobileMemberShareApplication> {
  const prisma = createPrismaClient()

  if (!prisma) {
    throw new Error(
      "Share requests are unavailable without database configuration."
    )
  }

  const member = await getMemberByUserId(input, prisma)

  if (!member) {
    throw new Error(
      "Member profile needs linking before requesting optional shares."
    )
  }

  const application = await createMemberShareApplication(
    {
      memberId: member.id,
      notes: input.notes,
      requestedByUserId: input.userId,
      requestedUnits: input.requestedUnits,
      tenantId: input.tenantId,
    },
    prisma
  )

  return toMobileShareApplication(application)
}

export async function createMobileMemberReceipt(input: {
  allocations: MobileReceiptCreateAllocation[]
  channel?: MobileReceiptChannel
  memberNotes?: string | null
  paidAt: Date
  paymentReference?: string | null
  proofDocumentName?: string | null
  proofDocumentUrl?: string | null
  tenantId: string
  totalAmount: number
  userId: string
}): Promise<MobilePaymentReceipt> {
  const prisma = createPrismaClient()

  if (!prisma) {
    throw new Error("Receipts are unavailable without database configuration.")
  }

  const member = await getMemberByUserId(input, prisma)

  if (!member) {
    throw new Error("Member profile needs linking before submitting receipts.")
  }

  const receipt = await createMemberPaymentReceipt(
    {
      allocations: input.allocations.map((allocation) => ({
        amount: allocation.amount,
        category: allocation.category,
        notes: allocation.notes,
        periodIntent: allocation.periodIntent,
        targetPeriodStart: allocation.targetPeriodStart,
      })),
      channel: input.channel,
      memberId: member.id,
      memberNotes: input.memberNotes,
      paidAt: input.paidAt,
      paymentReference: input.paymentReference,
      proofDocumentName: input.proofDocumentName,
      proofDocumentUrl: input.proofDocumentUrl,
      submittedByUserId: input.userId,
      tenantId: input.tenantId,
      totalAmount: input.totalAmount,
    },
    prisma
  )

  return toMobileReceipt(receipt)
}

export async function getMobileMemberSupport(input: {
  tenantId: string
  userId: string
}): Promise<MobileMemberSupport> {
  const prisma = createPrismaClient()

  if (!prisma) {
    return emptyMemberSupport()
  }

  const member = await getMemberByUserId(input, prisma)

  if (!member) {
    return emptyMemberSupport()
  }

  const [summary, cases] = await Promise.all([
    getMemberSupportCaseSummary(
      {
        memberId: member.id,
        tenantId: input.tenantId,
      },
      prisma
    ),
    listSupportCases(
      {
        limit: 20,
        memberId: member.id,
        tenantId: input.tenantId,
      },
      prisma
    ),
  ])

  return {
    cases: cases.map(toMobileSupportCase),
    generatedAt: new Date().toISOString(),
    member: {
      id: member.id,
      memberNumber: member.memberNumber,
      name: member.fullName,
    },
    summary: {
      highPriorityOpenCases: summary.highPriorityOpenCases,
      openCases: summary.openCases,
      totalCases: summary.totalCases,
    },
  }
}

export async function createMobileMemberSupportCase(input: {
  category: MobileSupportCategory
  description: string
  moneyImpactRequested?: boolean
  subject: string
  tenantId: string
  userId: string
}): Promise<MobileSupportCase> {
  const prisma = createPrismaClient()

  if (!prisma) {
    throw new Error("Support is unavailable without database configuration.")
  }

  const member = await getMemberByUserId(input, prisma)

  if (!member) {
    throw new Error(
      "Member profile needs linking before creating support cases."
    )
  }

  const supportCase = await createMemberSupportCase(
    {
      category: input.category,
      description: input.description,
      memberId: member.id,
      moneyImpactRequested: input.moneyImpactRequested,
      openedByUserId: input.userId,
      subject: input.subject,
      tenantId: input.tenantId,
    },
    prisma
  )

  return toMobileSupportCase(supportCase)
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

function toStatementSection(
  section: MobileMemberSection
): MobileMemberStatementSection {
  return {
    emptyState: section.emptyState,
    key: section.key,
    rows: section.rows,
    subtitle: section.subtitle,
    title: section.title,
  }
}

function buildStatementStats(
  detail: NonNullable<Awaited<ReturnType<typeof getMemberStatementDetail>>>
): MobileOverviewMetric[] {
  const summary = detail.summary
  const activePlan =
    detail.member.contributionPlans.find((plan) => plan.isActive) ??
    detail.member.contributionPlans[0] ??
    null

  return [
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
  ]
}

function buildProfileStatementSection(
  detail: NonNullable<Awaited<ReturnType<typeof getMemberStatementDetail>>>
): MobileMemberStatementSection {
  const member = detail.member
  const email = member.user?.email ?? member.email

  return {
    emptyState: "No member profile detail is available.",
    key: "profile",
    rows: [
      {
        detail: `${humanizeStatus(member.memberType) ?? "Member"} profile`,
        format: null,
        key: "member-number",
        label: member.memberNumber,
        status: humanizeStatus(member.status),
        value: null,
      },
      {
        detail: email ?? "No email on profile",
        format: null,
        key: "email",
        label: "Email",
        status: member.user?.email ? "Account email" : "Member email",
        value: null,
      },
      {
        detail: member.deductionSource?.name ?? "No deduction source assigned",
        format: null,
        key: "deduction-source",
        label: "Deduction source",
        status: member.deductionSource ? "Linked" : "Not linked",
        value: null,
      },
      {
        detail: `Joined ${formatDateLabel(member.joinedAt) ?? "Not recorded"}`,
        format: null,
        key: "membership-dates",
        label: member.exitedAt
          ? `Exited ${formatDateLabel(member.exitedAt) ?? "Not recorded"}`
          : "Active membership period",
        status: humanizeStatus(member.kycStatus),
        value: null,
      },
    ],
    subtitle: "Membership identity, KYC status, and deduction source.",
    title: "Profile",
  }
}

function buildDocumentStatementSection(
  detail: NonNullable<Awaited<ReturnType<typeof getMemberStatementDetail>>>
): MobileMemberStatementSection {
  const rows: MobileMemberSectionRow[] = detail.member.documents
    .slice(0, 6)
    .map((document) => ({
      detail: [
        document.uploadedAt
          ? `Uploaded ${formatDateLabel(document.uploadedAt)}`
          : null,
        document.reviewNotes,
      ]
        .filter(Boolean)
        .join(" - "),
      format: null,
      key: `document-${document.id}`,
      label: humanizeStatus(document.documentType) ?? "Member document",
      status: humanizeStatus(document.reviewStatus),
      value: null,
    }))

  return {
    emptyState: "No uploaded member documents are available.",
    key: "documents",
    rows:
      rows.length > 0
        ? rows
        : [
            {
              detail: "No uploaded member documents are available.",
              format: null,
              key: "empty-documents",
              label: "Documents",
              status: "Not started",
              value: null,
            },
          ],
    subtitle: "KYC and member records currently visible to operations.",
    title: "Documents",
  }
}

function buildLedgerStatementSection(
  detail: NonNullable<Awaited<ReturnType<typeof getMemberStatementDetail>>>
): MobileMemberStatementSection {
  const rows: MobileMemberSectionRow[] = detail.ledgerTransactions
    .slice(0, 8)
    .map((transaction) => {
      const debitEntries = transaction.entries.filter(
        (entry) => entry.direction === "debit"
      )
      const amountEntries =
        debitEntries.length > 0 ? debitEntries : transaction.entries
      const transactionAmount = amountEntries.reduce(
        (sum, entry) => sum + Number(entry.amount ?? 0),
        0
      )

      return {
        detail: [
          transaction.postedAt
            ? `Posted ${formatDateLabel(transaction.postedAt)}`
            : null,
          transaction.reference ? `Ref ${transaction.reference}` : null,
          `${transaction.entries.length} ledger entr${
            transaction.entries.length === 1 ? "y" : "ies"
          }`,
        ]
          .filter(Boolean)
          .join(" - "),
        format: transactionAmount > 0 ? "currency" : null,
        key: `ledger-${transaction.id}`,
        label:
          transaction.narration ??
          humanizeStatus(transaction.transactionType) ??
          "Ledger transaction",
        status: humanizeStatus(transaction.transactionType),
        value: transactionAmount > 0 ? transactionAmount : null,
      }
    })

  return {
    emptyState: "No posted ledger transactions are available.",
    key: "ledger",
    rows:
      rows.length > 0
        ? rows
        : [
            {
              detail: "No posted ledger transactions are available.",
              format: null,
              key: "empty-ledger",
              label: "Ledger timeline",
              status: "No activity",
              value: null,
            },
          ],
    subtitle: "Recent accounting activity posted to your member ledger.",
    title: "Ledger",
  }
}

async function buildMemberStatement(input: {
  detail: NonNullable<Awaited<ReturnType<typeof getMemberStatementDetail>>>
  member: NonNullable<Awaited<ReturnType<typeof getMemberByUserId>>>
  prisma: NonNullable<ReturnType<typeof createPrismaClient>>
  tenantId: string
}): Promise<MobileMemberStatement> {
  const commitmentSection = buildCommitmentSection(input.detail)
  const financingSection = buildFinancingSection(input.detail)
  const sharesSection = await buildSharesSection(
    {
      detail: input.detail,
      memberId: input.member.id,
      tenantId: input.tenantId,
    },
    input.prisma
  )

  return {
    generatedAt: new Date().toISOString(),
    member: {
      deductionSourceName: input.detail.member.deductionSource?.name ?? null,
      email: input.detail.member.user?.email ?? input.detail.member.email,
      exitedAt: input.detail.member.exitedAt
        ? input.detail.member.exitedAt.toISOString()
        : null,
      id: input.member.id,
      joinedAt: input.detail.member.joinedAt.toISOString(),
      kycStatus: input.detail.member.kycStatus,
      memberNumber: input.member.memberNumber,
      memberType: input.detail.member.memberType,
      name: input.member.fullName,
      status: input.detail.member.status,
    },
    sections: [
      buildProfileStatementSection(input.detail),
      toStatementSection(commitmentSection),
      toStatementSection(financingSection),
      toStatementSection(sharesSection),
      buildDocumentStatementSection(input.detail),
      buildLedgerStatementSection(input.detail),
    ],
    stats: buildStatementStats(input.detail),
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

export async function getMobileMemberStatement(input: {
  tenantId: string
  userId: string
}): Promise<MobileMemberStatement> {
  const prisma = createPrismaClient()

  if (!prisma) {
    return emptyMemberStatement()
  }

  const member = await getMemberByUserId(input, prisma)

  if (!member) {
    return emptyMemberStatement()
  }

  const detail = await getMemberStatementDetail(
    input.tenantId,
    member.id,
    prisma
  )

  if (!detail) {
    return emptyMemberStatement(
      "No statement detail was found for this member profile."
    )
  }

  return buildMemberStatement({
    detail,
    member,
    prisma,
    tenantId: input.tenantId,
  })
}

export async function getMobileMemberMore(input: {
  tenantId: string
  userId: string
}): Promise<MobileMemberMore> {
  const prisma = createPrismaClient()

  if (!prisma) {
    return emptyMemberMore()
  }

  const member = await getMemberByUserId(input, prisma)

  if (!member) {
    return emptyMemberMore()
  }

  const detail = await getMemberStatementDetail(
    input.tenantId,
    member.id,
    prisma
  )

  if (!detail) {
    return emptyMemberMore()
  }

  return buildMemberMore({
    detail,
    member,
    prisma,
    tenantId: input.tenantId,
  })
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
