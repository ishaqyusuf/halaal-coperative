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
  actionItems: {
    detail: string
    key: string
    label: string
    severity: "neutral" | "warning" | "critical"
  }[]
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
  actionQueue: {
    count: number
    detail: string
    key: string
    label: string
    severity: "neutral" | "warning" | "critical"
  }[]
  generatedAt: string
  stats: MobileOverviewMetric[]
  supportCases: MobileSupportCase[]
  warnings: {
    key: string
    label: string
  }[]
}

export type MobileAdminMemberStatus =
  | "pending"
  | "active"
  | "inactive"
  | "suspended"
  | "exited"

export type MobileAdminMemberKycStatus =
  | "not_started"
  | "pending"
  | "verified"
  | "rejected"

export type MobileAdminMemberRow = {
  deductionSourceName: string | null
  email: string | null
  fullName: string
  id: string
  joinedAt: string
  kycStatus: string
  linkedUserEmail: string | null
  memberNumber: string
  memberType: string
  phoneNumber: string | null
  status: string
}

export type MobileAdminMemberReviewQueue = {
  count: number
  detail: string
  key: "membership-approvals" | "kyc-documents"
  label: string
  severity: "neutral" | "warning" | "critical"
}

export type MobileAdminMemberOnboardingRequest = {
  createdAt: string
  email: string
  emailVerifiedAt: string | null
  fullName: string
  id: string
  linkedUserEmail: string | null
  memberNumber: string
  phoneNumber: string | null
  status: string
}

export type MobileAdminMembers = {
  generatedAt: string
  members: MobileAdminMemberRow[]
  onboardingRequests: MobileAdminMemberOnboardingRequest[]
  page: number
  pageSize: number
  reviewQueues: MobileAdminMemberReviewQueue[]
  summary: {
    activeCount: number
    kycPendingCount: number
    linkedUsersCount: number
    pageCount: number
    totalCount: number
  }
  total: number
}

export type MobileAdminMemberDetail = {
  generatedAt: string
  member:
    | (MobileAdminMemberRow & {
        exitedAt: string | null
        linkedUserName: string | null
      })
    | null
  sections: MobileMemberStatementSection[]
  stats: MobileOverviewMetric[]
}

export type MobileAdminMembersListInput = {
  kycStatus?: MobileAdminMemberKycStatus
  page?: number
  pageSize?: number
  search?: string
  status?: MobileAdminMemberStatus
}

export type MobileAdminFinanceQueue = {
  count: number
  detail: string
  key: string
  label: string
  severity: "neutral" | "warning" | "critical"
}

export type MobileAdminFinanceRecentItem = {
  amount: number
  id: string
  queueKey:
    | "financing"
    | "procurement"
    | "projectFinancing"
    | "foodPurchase"
    | "receipts"
    | "shares"
  requestedAt: string
  status: string
  subtitle: string
  title: string
}

export type MobileAdminFinance = {
  collectionFollowUps: MobileAdminCollectionFollowUp[]
  generatedAt: string
  queues: MobileAdminFinanceQueue[]
  recentItems: MobileAdminFinanceRecentItem[]
  stats: MobileOverviewMetric[]
}

export type MobileAdminReportCard = {
  detail: string
  exportHref: string
  key: string
  metricFormat: MobileMetricFormat
  metricLabel: string
  metricValue: number
  title: string
}

export type MobileAdminActivityEvent = {
  action: string
  actionLabel: string
  actorLabel: string
  actorType: string
  authorizationRole: string
  authorizerLabel: string
  entityId: string | null
  entityType: string
  id: string
  metadataSummary: string[]
  occurredAt: string
}

export type MobileAdminCollectionFollowUp = {
  caseStage: string
  createdAt: string
  id: string
  loanProductName: string
  memberName: string
  memberNumber: string
  nextActionAt: string | null
  note: string
  priority: string
  resolutionStatus: string
  status: string
}

export type MobileAdminReports = {
  activityEvents: MobileAdminActivityEvent[]
  collectionFollowUps: MobileAdminCollectionFollowUp[]
  generatedAt: string
  reports: MobileAdminReportCard[]
  stats: MobileOverviewMetric[]
}

export type MobileNotificationDelivery = {
  action: string
  errorMessage: string | null
  id: string
  notificationType: string
  occurredAt: string
  recipient: string
  source: string | null
  status: "failed" | "queued" | "sent" | "unknown"
}

export type MobileNotificationPreference = {
  channel: string
  enabled: boolean
  notificationType: string
  role: MobileAdminAccessRoleKey | "all"
}

export type MobileNotifications = {
  deliveries: MobileNotificationDelivery[]
  generatedAt: string
  preferences: MobileNotificationPreference[]
  summary: {
    enabledPreferences: number
    failed: number
    queued: number
    sent: number
    totalDeliveries: number
  }
}

export type MobileAdminAccessRoleKey =
  | "super_admin"
  | "tenant_admin"
  | "finance_officer"
  | "operations_officer"
  | "member"

export type MobileAdminAccessMembership = {
  id: string
  isDefault: boolean
  label: string
  role: MobileAdminAccessRoleKey
}

export type MobileAdminAccessUser = {
  defaultRoleLabel: string | null
  email: string
  fullName: string
  id: string
  isPlatformOwner: boolean
  memberships: MobileAdminAccessMembership[]
}

export type MobileAdminAccessRole = {
  defaultUsersCount: number
  label: string
  role: MobileAdminAccessRoleKey
  scope: string
  usersCount: number
}

export type MobileAdminAccess = {
  generatedAt: string
  roles: MobileAdminAccessRole[]
  summary: {
    defaultRoles: number
    memberUsers: number
    roleAssignments: number
    staffUsers: number
    workspaceUsers: number
  }
  users: MobileAdminAccessUser[]
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

export type MobileProjectFinancingStructure =
  | "investment_partnership"
  | "profit_sharing"
  | "repayable_facility"
  | "undecided"

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

export type MobileLoanProductOption = {
  code: string | null
  id: string
  loanType: string
  maxSavingsMultiple: number
  name: string
  termMonths: number
}

export type MobileMemberFinancingRequest = {
  availablePoolSnapshot: number
  eligibleAmountSnapshot: number
  estimatedMonthlyServicing: number
  extraMonthlySavingsAmount: number
  guarantorApprovals: {
    guarantorMemberNumber: string
    guarantorName: string
    id: string
    respondedAt: string | null
    status: string
  }[]
  id: string
  loanProductCode: string | null
  loanProductName: string
  purpose: string | null
  requestedAmount: number
  requestedAt: string
  requestedTermMonths: number
  reviewNotes: string | null
  status: string
}

export type MobileMemberFinancing = {
  generatedAt: string
  member: {
    id: string
    memberNumber: string
    name: string
  } | null
  products: MobileLoanProductOption[]
  requests: MobileMemberFinancingRequest[]
  section: MobileMemberSection
  state: "available" | "database_unavailable" | "member_profile_missing"
}

export type MobileFinancingRequestCreateInput = {
  extraMonthlySavingsAmount?: number
  loanProductId: string
  purpose?: string
  requestedAmount: number
  requestedTermMonths: number
}

export type MobileProcurementScheduleItem = {
  amount: number
  dueDate: string
  id: string
  installmentNumber: number
  paidAmount: number
  status: string
}

export type MobileMemberProcurementRequest = {
  approvedCost: number | null
  approvedMonthlyRepayment: number | null
  approvedRepaymentMonths: number | null
  estimatedMonthlyRepayment: number
  id: string
  itemDescription: string | null
  itemName: string
  outstandingAmount: number
  purchasedAt: string | null
  purchaseReference: string | null
  requestedAt: string
  requestedCost: number
  requestedRepaymentMonths: number
  reviewNotes: string | null
  scheduleItems: MobileProcurementScheduleItem[]
  status: string
  vendorName: string | null
}

export type MobileMemberProcurement = {
  generatedAt: string
  member: {
    id: string
    memberNumber: string
    name: string
  } | null
  requests: MobileMemberProcurementRequest[]
  summary: {
    activeRequests: number
    approvedRequests: number
    dueScheduleItems: number
    outstandingAmount: number
    overdueScheduleItems: number
    pendingRequests: number
    totalRequests: number
  }
}

export type MobileProcurementRequestCreateInput = {
  itemDescription?: string
  itemName: string
  requestedCost: number
  requestedRepaymentMonths: number
  vendorName?: string
}

export type MobileProjectFinancingRequest = {
  approvedAmount: number | null
  approvedMonthlyPayback: number | null
  approvedPaybackMonths: number | null
  approvedStructure: MobileProjectFinancingStructure | null
  businessDescription: string | null
  businessName: string
  disbursedAt: string | null
  disbursementNotes: string | null
  disbursementReference: string | null
  estimatedMonthlyPayback: number | null
  id: string
  paidAmount: number
  paidAt: string | null
  projectPurpose: string | null
  proposedStructure: MobileProjectFinancingStructure
  requestedAmount: number
  requestedAt: string
  requestedPaybackMonths: number | null
  reviewedAt: string | null
  reviewNotes: string | null
  status: string
}

export type MobileMemberProjectFinancing = {
  generatedAt: string
  member: {
    id: string
    memberNumber: string
    name: string
  } | null
  requests: MobileProjectFinancingRequest[]
  summary: {
    activeRequests: number
    approvedRequests: number
    outstandingAmount: number
    pendingRequests: number
    totalApprovedAmount: number
    totalRequestedAmount: number
    totalRequests: number
  }
}

export type MobileProjectFinancingRequestCreateInput = {
  businessDescription?: string
  businessName: string
  projectPurpose?: string
  proposedStructure?: MobileProjectFinancingStructure
  requestedAmount: number
  requestedPaybackMonths?: number
}

export type MobileFoodPurchaseCycle = {
  id: string
  periodMonth: string
  releasedAmount: number
  releasedAt: string
  releaseNotes: string | null
  status: string
}

export type MobileFoodPurchaseApplication = {
  approvedAmount: number | null
  approvedPaybackMonths: number | null
  cycle: {
    id: string
    periodMonth: string
    releasedAmount: number
    status: string
  }
  id: string
  itemDescription: string | null
  paidAmount: number
  paidAt: string | null
  requestedAmount: number
  requestedAt: string
  requestedPaybackMonths: number
  requestNotes: string | null
  reviewNotes: string | null
  status: string
}

export type MobileMemberFoodPurchase = {
  applications: MobileFoodPurchaseApplication[]
  cycles: MobileFoodPurchaseCycle[]
  generatedAt: string
  member: {
    id: string
    memberNumber: string
    name: string
  } | null
  summary: {
    approvedApplications: number
    openCycles: number
    pendingApplications: number
    totalApplications: number
  }
}

export type MobileFoodPurchaseApplicationCreateInput = {
  cycleId: string
  itemDescription?: string
  requestedAmount: number
  requestedPaybackMonths: number
  requestNotes?: string
}

export type MobileMemberShareApplicationCreateInput = {
  notes?: string
  requestedUnits: number
}

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

export type MobileGuarantorApprovalRespondInput = {
  guarantorApprovalId: string
  notes?: string
  status: MobileGuarantorApprovalDecision
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
  key:
    | "profile"
    | "statement"
    | "receipts"
    | "procurement"
    | "projectFinancing"
    | "foodPurchase"
    | "guarantors"
    | "support"
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
  | "receipts"
  | "ledger"
  | "support"

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

export type MobileSupportReplyInput = {
  attachmentUrl?: string
  message: string
  supportCaseId: string
}

export async function getMobileMemberHome() {
  const client = createMobileTrpcClient()

  return client.mobile.member.home.query() as Promise<MobileMemberHome>
}

export async function getMobileMemberMore() {
  const client = createMobileTrpcClient()

  return client.mobile.member.more.query() as Promise<MobileMemberMore>
}

export async function getMobileMemberStatement() {
  const client = createMobileTrpcClient()

  return client.mobile.member.statement.query() as Promise<MobileMemberStatement>
}

export async function getMobileMemberSupport() {
  const client = createMobileTrpcClient()

  return client.mobile.member.support.list.query() as Promise<MobileMemberSupport>
}

export async function getMobileMemberReceipts() {
  const client = createMobileTrpcClient()

  return client.mobile.member.receipts.list.query() as Promise<MobileMemberReceipts>
}

export async function getMobileMemberGuarantorApprovals() {
  const client = createMobileTrpcClient()

  return client.mobile.member.guarantorApprovals.list.query() as Promise<MobileMemberGuarantorApprovals>
}

export async function getMobileMemberFinancing() {
  const client = createMobileTrpcClient()

  return client.mobile.member.financing.list.query() as Promise<MobileMemberFinancing>
}

export async function createMobileMemberFinancingRequest(
  input: MobileFinancingRequestCreateInput
) {
  const client = createMobileTrpcClient()

  return client.mobile.member.financing.createRequest.mutate(
    input
  ) as Promise<MobileMemberFinancingRequest>
}

export async function getMobileMemberProcurement() {
  const client = createMobileTrpcClient()

  return client.mobile.member.procurement.list.query() as Promise<MobileMemberProcurement>
}

export async function createMobileMemberProcurementRequest(
  input: MobileProcurementRequestCreateInput
) {
  const client = createMobileTrpcClient()

  return client.mobile.member.procurement.createRequest.mutate(
    input
  ) as Promise<MobileMemberProcurementRequest>
}

export async function getMobileMemberProjectFinancing() {
  const client = createMobileTrpcClient()

  return client.mobile.member.projectFinancing.list.query() as Promise<MobileMemberProjectFinancing>
}

export async function createMobileMemberProjectFinancingRequest(
  input: MobileProjectFinancingRequestCreateInput
) {
  const client = createMobileTrpcClient()

  return client.mobile.member.projectFinancing.createRequest.mutate(
    input
  ) as Promise<MobileProjectFinancingRequest>
}

export async function getMobileMemberFoodPurchase() {
  const client = createMobileTrpcClient()

  return client.mobile.member.foodPurchase.list.query() as Promise<MobileMemberFoodPurchase>
}

export async function createMobileMemberFoodPurchaseApplication(
  input: MobileFoodPurchaseApplicationCreateInput
) {
  const client = createMobileTrpcClient()

  return client.mobile.member.foodPurchase.createApplication.mutate(
    input
  ) as Promise<MobileFoodPurchaseApplication>
}

export async function respondMobileMemberGuarantorApproval(
  input: MobileGuarantorApprovalRespondInput
) {
  const client = createMobileTrpcClient()

  return client.mobile.member.guarantorApprovals.respond.mutate(
    input
  ) as Promise<MobileMemberGuarantorApproval>
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

export async function replyMobileMemberSupportCase(
  input: MobileSupportReplyInput
) {
  const client = createMobileTrpcClient()

  return client.mobile.member.support.reply.mutate(
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

export async function getMobileAdminMembers(
  input?: MobileAdminMembersListInput
) {
  const client = createMobileTrpcClient()

  return client.mobile.admin.members.list.query(
    input
  ) as Promise<MobileAdminMembers>
}

export async function getMobileAdminMemberDetail(memberId: string) {
  const client = createMobileTrpcClient()

  return client.mobile.admin.members.detail.query({
    memberId,
  }) as Promise<MobileAdminMemberDetail>
}

export async function getMobileAdminFinance() {
  const client = createMobileTrpcClient()

  return client.mobile.admin.finance.overview.query() as Promise<MobileAdminFinance>
}

export async function getMobileAdminReports() {
  const client = createMobileTrpcClient()

  return client.mobile.admin.reports.overview.query() as Promise<MobileAdminReports>
}

export async function getMobileNotifications() {
  const client = createMobileTrpcClient()

  return client.mobile.notifications.overview.query() as Promise<MobileNotifications>
}

export async function getMobileAdminAccess() {
  const client = createMobileTrpcClient()

  return client.mobile.admin.access.overview.query() as Promise<MobileAdminAccess>
}
