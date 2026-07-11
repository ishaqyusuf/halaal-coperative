import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"

export type MobileMetricFormat = "currency" | "percent" | "count"

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

export type MobileMemberSectionKey = "commitments" | "financing" | "shares"

export type MobileSupportCategory =
  | "payment_issue"
  | "account_update"
  | "shares"
  | "financing"
  | "procurement"
  | "feature_request"
  | "technical"
  | "other"

export type MobileReceiptAllocationCategory =
  | "commitment"
  | "special_savings"
  | "loan_servicing"
  | "loan_extra_payment"
  | "shares"
  | "procurement"
  | "project_financing"
  | "food_purchase"
  | "other"

export type MobileReceiptChannel = "transfer" | "cash" | "manual" | "payroll"

export type MobileReceiptPeriodIntent =
  | "current_period"
  | "future_period"
  | "back_period"
  | "unspecified"

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

export type MobileMemberShareApplicationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"

export type MobileMemberShareApplication = {
  approvedUnits: number | null
  createdAt: string
  id: string
  notes: string | null
  requestedUnits: number
  reviewedAt: string | null
  reviewNotes: string | null
  shareValueSnapshot: number
  status: MobileMemberShareApplicationStatus
  unitAmountSnapshot: number
}

export type MobileMemberSharePolicy = {
  compulsoryShareUnits: number
  configurationMode: "monthly_history" | "unit_based"
  maximumShareUnits: number
  unitAmount: number
}

export type MobileMemberSharePosition = {
  approvedOptionalUnits: number
  compulsoryUnits: number
  maximumUnits: number
  pendingOptionalUnits: number
  remainingOptionalUnits: number
  totalApprovedUnits: number
  totalApprovedValue: number
  totalPendingUnits: number
  totalPendingValue: number
  unitAmount: number
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

export type MobileMemberShareApplicationCreateInput = {
  notes?: string
  requestedUnits: number
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
  key: "profile" | "statement" | "receipts" | "support"
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

export type MobileReceiptCreateAllocation = {
  amount: number
  category: MobileReceiptAllocationCategory
  notes?: string
  periodIntent?: MobileReceiptPeriodIntent
  targetPeriodStart?: string
}

export type MobileReceiptCreateInput = {
  allocations: MobileReceiptCreateAllocation[]
  channel?: MobileReceiptChannel
  memberNotes?: string
  paidAt: string
  paymentReference?: string
  proofDocumentName?: string
  proofDocumentUrl?: string
  totalAmount: number
}

export type MobileSupportCreateInput = {
  category: MobileSupportCategory
  description: string
  moneyImpactRequested?: boolean
  subject: string
}

export async function getMobileMemberHome() {
  const client = createMobileTrpcClient()

  return client.mobile.member.home.query() as Promise<MobileMemberHome>
}

export async function getMobileMemberMore() {
  const client = createMobileTrpcClient()

  return client.mobile.member.more.query() as Promise<MobileMemberMore>
}

export async function getMobileMemberSupport() {
  const client = createMobileTrpcClient()

  return client.mobile.member.support.list.query() as Promise<MobileMemberSupport>
}

export async function getMobileMemberReceipts() {
  const client = createMobileTrpcClient()

  return client.mobile.member.receipts.list.query() as Promise<MobileMemberReceipts>
}

export async function getMobileMemberShares() {
  const client = createMobileTrpcClient()

  return client.mobile.member.shares.list.query() as Promise<MobileMemberShares>
}

export async function createMobileMemberShareApplication(
  input: MobileMemberShareApplicationCreateInput
) {
  const client = createMobileTrpcClient()

  return client.mobile.member.shares.createApplication.mutate(
    input
  ) as Promise<MobileMemberShareApplication>
}

export async function createMobileMemberReceipt(
  input: MobileReceiptCreateInput
) {
  const client = createMobileTrpcClient()

  return client.mobile.member.receipts.create.mutate(
    input
  ) as Promise<MobilePaymentReceipt>
}

export async function createMobileMemberSupportCase(
  input: MobileSupportCreateInput
) {
  const client = createMobileTrpcClient()

  return client.mobile.member.support.create.mutate(
    input
  ) as Promise<MobileSupportCase>
}

export async function getMobileMemberSection(section: MobileMemberSectionKey) {
  const client = createMobileTrpcClient()

  return client.mobile.member.section.query({
    section,
  }) as Promise<MobileMemberSection>
}

export async function getMobileAdminOverview() {
  const client = createMobileTrpcClient()

  return client.mobile.admin.overview.query() as Promise<MobileAdminOverview>
}
