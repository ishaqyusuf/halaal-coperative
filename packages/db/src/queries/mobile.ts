import { createPrismaClient } from "../prisma"
import { ExpectedQueryError } from "../query-error"
import {
  listActivityReportEvents,
  listAuditLogs,
  type ActivityReportEvent,
} from "./audit"
import {
  listTenantUsersWithMemberships,
  provisionTenantUserRole,
  type MembershipRole,
} from "./auth"
import { getDashboardMetrics, getOverviewSummary } from "./dashboard"
import {
  listFoodPurchaseApplications,
  listFoodPurchaseCycles,
  reviewFoodPurchaseApplication,
  submitFoodPurchaseApplication,
  type FoodPurchaseApplicationRow,
  type FoodPurchaseCycleRow,
} from "./food-purchase"
import {
  quoteApplicableCharges,
  type ChargeCollectionMode,
  type ChargeWorkflow,
} from "./charges"
import {
  listLoanProducts,
  listCollectionFollowUps,
  listLoanRequests,
  listMemberLoanGuarantorApprovals,
  recordCollectionFollowUp,
  respondMemberLoanGuarantorApproval,
  reviewLoanRequest,
  submitLoanRequest,
} from "./loans"
import {
  createMember,
  getMemberByUserId,
  getMemberStatementDetail,
  listMembers,
  listMemberStatementSummaries,
  updateMemberKyc,
  updateMemberStatus,
  type ListMembersFilters,
} from "./members"
import {
  approveMemberOnboardingRequest,
  listMemberOnboardingRequests,
  rejectMemberOnboardingRequest,
} from "./member-onboarding"
import { listNotificationPreferences } from "./notifications"
import {
  createMemberPaymentReceipt,
  getMemberScopedPaymentReceiptSummary,
  listMemberPaymentReceipts,
  reviewMemberPaymentReceipt,
  type MemberPaymentReceiptRow,
  type PaymentReceiptAllocationInput,
} from "./payment-receipts"
import {
  createProcurementRequest,
  listProcurementRequests,
  reviewProcurementRequest,
  type ProcurementRequestRow,
} from "./procurement"
import { getTenantOperationProfile } from "./operation-profile"
import {
  createProjectFinancingRequest,
  listProjectFinancingRequests,
  reviewProjectFinancingRequest,
  type ProjectFinancingRequestRow,
  type ProjectFinancingStructure,
} from "./project-financing"
import {
  addSupportCaseMessage,
  addMemberSupportCaseMessage,
  createMemberSupportCase,
  getMemberSupportCaseSummary,
  getSupportCase,
  listSupportCases,
  updateSupportCaseStatus,
  type SupportCaseCategory,
  type SupportCaseLinkedRecordType,
  type SupportCasePriority,
  type SupportCaseRow,
  type SupportCaseStatus,
} from "./support"
import {
  createMemberShareApplication,
  getMemberShareBalancesAtDate,
  getMemberUnitSharePosition,
  getTenantSharePolicy,
  listMemberShareApplications,
  listMemberShareLedgerEntries,
  reviewMemberShareApplication,
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

export const mobileAdminMemberStatusKeys = [
  "pending",
  "active",
  "inactive",
  "suspended",
  "exited",
] as const satisfies readonly NonNullable<ListMembersFilters["status"]>[]

export type MobileAdminMemberStatus =
  (typeof mobileAdminMemberStatusKeys)[number]

export const mobileAdminMemberKycStatusKeys = [
  "not_started",
  "pending",
  "verified",
  "rejected",
] as const satisfies readonly NonNullable<ListMembersFilters["kycStatus"]>[]

export type MobileAdminMemberKycStatus =
  (typeof mobileAdminMemberKycStatusKeys)[number]

export const mobileProjectFinancingStructureKeys = [
  "investment_partnership",
  "profit_sharing",
  "repayable_facility",
  "undecided",
] as const satisfies readonly ProjectFinancingStructure[]

export type MobileProjectFinancingStructure =
  (typeof mobileProjectFinancingStructureKeys)[number]

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
  services: Array<{
    icon: string
    key: string
    label: string
    tone: "accent" | "primary" | "success"
  }>
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
  supportCases: MobileSupportCase[]
  warnings: Array<{
    key: string
    label: string
  }>
}

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
  repaymentScheduleItemId: string
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
  safeSummary: string
  safeTitle: string
  source: string | null
  status: "failed" | "queued" | "sent" | "unknown"
}

export type MobileDeviceRegistrationState = "active" | "revoked"

export type MobileNotificationPreference = {
  channel: string
  enabled: boolean
  notificationType: string
  role: MembershipRole | "all"
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

export type MobileAdminAccessMembership = {
  id: string
  isDefault: boolean
  label: string
  role: MembershipRole
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
  role: MembershipRole
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
  | "charges"
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
  recentMessages: {
    attachmentUrl: string | null
    authorName: string | null
    authorType: string
    createdAt: string
    id: string
    message: string
  }[]
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
  canCreateReceipt: boolean
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

type MobileLoanRequestRow = Awaited<ReturnType<typeof listLoanRequests>>[number]

export type MobileLoanProductOption = {
  code: string | null
  id: string
  loanType: string
  maxSavingsMultiple: number
  name: string
  termMonths: number
}

export type MobileMemberFinancingRequest = {
  charges: {
    amount: number
    code: string
    collectionMode: string
    id: string
    name: string
    status: string
  }[]
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

export type MobileLoanRequestChargeOption = {
  amount: number
  chargeValueType: "fixed_amount" | "percentage"
  code: string
  collectionMode: ChargeCollectionMode
  id: string
  name: string
}

export type MobileWorkflowChargeOption = MobileLoanRequestChargeOption

export type MobileMemberFinancing = {
  generatedAt: string
  loanRequestCharges: MobileLoanRequestChargeOption[]
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
  extraMonthlySavingsAmount?: number | null
  loanProductId: string
  purpose?: string | null
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
  canCreateRequest: boolean
  chargeOptions: MobileWorkflowChargeOption[]
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
  itemDescription?: string | null
  itemName: string
  requestedCost: number
  requestedRepaymentMonths: number
  vendorName?: string | null
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
  chargeOptions: MobileWorkflowChargeOption[]
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
  businessDescription?: string | null
  businessName: string
  projectPurpose?: string | null
  proposedStructure?: MobileProjectFinancingStructure | null
  requestedAmount: number
  requestedPaybackMonths?: number | null
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
  canCreateApplication: boolean
  chargeOptions: MobileWorkflowChargeOption[]
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
  itemDescription?: string | null
  requestedAmount: number
  requestedPaybackMonths: number
  requestNotes?: string | null
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
    services: getMobileMemberHomeServices({
      foodPurchaseRecords: 0,
      operationProfile: null,
      procurementRecords: 0,
      receiptRecords: 0,
      supportRecords: 0,
    }),
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

function emptyAdminMembers(input?: {
  page?: number
  pageSize?: number
}): MobileAdminMembers {
  return {
    generatedAt: new Date().toISOString(),
    members: [],
    onboardingRequests: [],
    page: input?.page ?? 1,
    pageSize: input?.pageSize ?? 25,
    reviewQueues: [],
    summary: {
      activeCount: 0,
      kycPendingCount: 0,
      linkedUsersCount: 0,
      pageCount: 0,
      totalCount: 0,
    },
    total: 0,
  }
}

function emptyAdminMemberDetail(
  detail = "No statement detail was found for this member profile."
): MobileAdminMemberDetail {
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
            label: "Member profile",
            status: "Unavailable",
            value: null,
          },
        ],
        subtitle: "Membership identity and account readiness.",
        title: "Profile",
      },
    ],
    stats: getEmptyStatementStats(),
  }
}

function emptyAdminFinance(): MobileAdminFinance {
  return {
    collectionFollowUps: [],
    generatedAt: new Date().toISOString(),
    queues: [],
    recentItems: [],
    stats: [
      {
        detail: "No configured database runtime",
        format: "count",
        key: "finance-queues",
        label: "Finance queues",
        value: 0,
      },
    ],
  }
}

function emptyAdminReports(): MobileAdminReports {
  return {
    activityEvents: [],
    collectionFollowUps: [],
    generatedAt: new Date().toISOString(),
    reports: buildMobileAdminReportCards({
      activeMemberCount: 0,
      activeLoanCount: 0,
      availablePool: 0,
      delinquencyRate: 0,
      memberCount: 0,
      outstandingLoans: 0,
      reserveBuffer: 0,
      totalContributions: 0,
    }),
    stats: [
      {
        detail: "Mobile-safe report previews",
        format: "count",
        key: "report-count",
        label: "Reports",
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
    canCreateReceipt: false,
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

function emptyMemberFinancing(
  state: MobileMemberFinancing["state"],
  detail: string
): MobileMemberFinancing {
  return {
    generatedAt: new Date().toISOString(),
    loanRequestCharges: [],
    member: null,
    products: [],
    requests: [],
    section: emptyMemberSection("financing", detail),
    state,
  }
}

function toMobileWorkflowChargeOptions(
  quotes: Awaited<ReturnType<typeof quoteApplicableCharges>>
): MobileWorkflowChargeOption[] {
  return quotes.map((quote) => ({
    amount: quote.effectiveAmount,
    chargeValueType: quote.chargeValueType,
    code: quote.code,
    collectionMode: quote.collectionMode,
    id: quote.chargeApplicabilityId ?? quote.chargeDefinitionId,
    name: quote.name,
  }))
}

async function getMobileWorkflowChargeOptions(input: {
  tenantId: string
  workflow: ChargeWorkflow
}): Promise<MobileWorkflowChargeOption[]> {
  const quotes = await quoteApplicableCharges({
    basisAmount: 100,
    tenantId: input.tenantId,
    trigger: "submission",
    workflow: input.workflow,
  })

  return toMobileWorkflowChargeOptions(quotes)
}

function emptyMemberProcurement(): MobileMemberProcurement {
  return {
    canCreateRequest: false,
    chargeOptions: [],
    generatedAt: new Date().toISOString(),
    member: null,
    requests: [],
    summary: {
      activeRequests: 0,
      approvedRequests: 0,
      dueScheduleItems: 0,
      outstandingAmount: 0,
      overdueScheduleItems: 0,
      pendingRequests: 0,
      totalRequests: 0,
    },
  }
}

function emptyMemberProjectFinancing(): MobileMemberProjectFinancing {
  return {
    chargeOptions: [],
    generatedAt: new Date().toISOString(),
    member: null,
    requests: [],
    summary: {
      activeRequests: 0,
      approvedRequests: 0,
      outstandingAmount: 0,
      pendingRequests: 0,
      totalApprovedAmount: 0,
      totalRequestedAmount: 0,
      totalRequests: 0,
    },
  }
}

function emptyMemberFoodPurchase(): MobileMemberFoodPurchase {
  return {
    applications: [],
    canCreateApplication: false,
    chargeOptions: [],
    cycles: [],
    generatedAt: new Date().toISOString(),
    member: null,
    summary: {
      approvedApplications: 0,
      openCycles: 0,
      pendingApplications: 0,
      totalApplications: 0,
    },
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

function getMobileMetadataString(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null
  }

  const value = (metadata as Record<string, unknown>)[key]

  return typeof value === "string" && value.trim() ? value : null
}

function getMobileDeliveryStatus(
  action: string
): MobileNotificationDelivery["status"] {
  if (action === "notification.email_sent") return "sent"
  if (action === "notification.email_failed") return "failed"
  if (action === "notification.email_queued") return "queued"

  return "unknown"
}

function getMobileNotificationSafeCopy(
  notificationType: string,
  status: MobileNotificationDelivery["status"]
) {
  const normalized = notificationType.toLowerCase()
  const state =
    status === "failed"
      ? "Delivery needs attention."
      : status === "sent"
        ? "Delivery was completed."
        : "Delivery is being prepared."

  if (normalized.includes("receipt") || normalized.includes("payment")) {
    return {
      safeSummary: `Receipt activity is available inside the app. ${state}`,
      safeTitle: "Receipt update",
    }
  }

  if (normalized.includes("financing") || normalized.includes("loan")) {
    return {
      safeSummary: `Financing activity is available inside the app. ${state}`,
      safeTitle: "Financing update",
    }
  }

  if (normalized.includes("procurement")) {
    return {
      safeSummary: `Procurement activity is available inside the app. ${state}`,
      safeTitle: "Procurement update",
    }
  }

  if (normalized.includes("food")) {
    return {
      safeSummary: `Foodstuff Purchase activity is available inside the app. ${state}`,
      safeTitle: "Foodstuff Purchase update",
    }
  }

  if (normalized.includes("project")) {
    return {
      safeSummary: `Project financing activity is available inside the app. ${state}`,
      safeTitle: "Project financing update",
    }
  }

  if (normalized.includes("share")) {
    return {
      safeSummary: `Share activity is available inside the app. ${state}`,
      safeTitle: "Share update",
    }
  }

  if (normalized.includes("guarantor")) {
    return {
      safeSummary: `Guarantor activity is available inside the app. ${state}`,
      safeTitle: "Guarantor update",
    }
  }

  if (normalized.includes("support")) {
    return {
      safeSummary: `Support activity is available inside the app. ${state}`,
      safeTitle: "Support update",
    }
  }

  return {
    safeSummary: `Cooperative activity is available inside the app. ${state}`,
    safeTitle: "Cooperative update",
  }
}

const mobileAdminAccessRoles: MembershipRole[] = [
  "super_admin",
  "tenant_admin",
  "finance_officer",
  "operations_officer",
  "member",
]

function getMobileAdminRoleLabel(role: MembershipRole) {
  switch (role) {
    case "super_admin":
      return "Super Admin"
    case "tenant_admin":
      return "Cooperative Admin"
    case "finance_officer":
      return "Finance Officer"
    case "operations_officer":
      return "Operations Officer"
    case "member":
      return "Member"
  }
}

function getMobileAdminRoleScope(role: MembershipRole) {
  switch (role) {
    case "super_admin":
      return "Platform-level oversight across cooperative workspaces."
    case "tenant_admin":
      return "Administrative control over cooperative setup and operations."
    case "finance_officer":
      return "Financial operations across collections, charges, and repayments."
    case "operations_officer":
      return "Member operations, public site updates, and coordination."
    case "member":
      return "Member-facing visibility into cooperative activity."
  }
}

type MobileAdminMemberListRow = Awaited<
  ReturnType<typeof listMembers>
>["items"][number]

type MobileAdminMemberOnboardingRow = Awaited<
  ReturnType<typeof listMemberOnboardingRequests>
>["items"][number]

function toMobileAdminMemberRow(
  row: MobileAdminMemberListRow
): MobileAdminMemberRow {
  return {
    deductionSourceName: row.deductionSource?.name ?? null,
    email: row.email ?? null,
    fullName: row.fullName,
    id: row.id,
    joinedAt: row.joinedAt.toISOString(),
    kycStatus: row.kycStatus,
    linkedUserEmail: row.user?.email ?? null,
    memberNumber: row.memberNumber,
    memberType: row.memberType,
    phoneNumber: row.phoneNumber ?? null,
    status: row.status,
  }
}

function toMobileAdminMemberOnboardingRequest(
  row: MobileAdminMemberOnboardingRow
): MobileAdminMemberOnboardingRequest {
  return {
    createdAt: row.createdAt.toISOString(),
    email: row.email,
    emailVerifiedAt: row.emailVerifiedAt
      ? row.emailVerifiedAt.toISOString()
      : null,
    fullName: row.fullName,
    id: row.id,
    linkedUserEmail: row.user?.email ?? null,
    memberNumber: row.memberNumber,
    phoneNumber: row.phoneNumber ?? null,
    status: row.status,
  }
}

function summarizeMobileAdminMembers(input: {
  members: MobileAdminMemberRow[]
  total: number
}): MobileAdminMembers["summary"] {
  return {
    activeCount: input.members.filter((member) => member.status === "active")
      .length,
    kycPendingCount: input.members.filter(
      (member) => member.kycStatus !== "verified"
    ).length,
    linkedUsersCount: input.members.filter((member) => member.linkedUserEmail)
      .length,
    pageCount: input.members.length,
    totalCount: input.total,
  }
}

function toMobileAdminMemberReviewQueue(
  row: Awaited<ReturnType<typeof getOverviewSummary>>["actionQueue"][number]
): MobileAdminMemberReviewQueue | null {
  if (row.key !== "membership-approvals" && row.key !== "kyc-documents") {
    return null
  }

  return {
    count: row.count,
    detail:
      row.key === "membership-approvals"
        ? "Pending signup approvals"
        : "Members or documents waiting for KYC review",
    key: row.key,
    label: row.label,
    severity: row.severity,
  }
}

function toMobileAdminAccessUser(
  tenantId: string,
  user: Awaited<ReturnType<typeof listTenantUsersWithMemberships>>[number]
): MobileAdminAccessUser {
  const memberships = user.memberships
    .filter((membership) => membership.tenantId === tenantId)
    .map((membership) => ({
      id: membership.id,
      isDefault: membership.isDefault,
      label: getMobileAdminRoleLabel(membership.role),
      role: membership.role,
    }))

  return {
    defaultRoleLabel:
      memberships.find((membership) => membership.isDefault)?.label ?? null,
    email: user.email,
    fullName: user.fullName,
    id: user.id,
    isPlatformOwner: user.isPlatformOwner,
    memberships,
  }
}

function buildMobileAdminAccessRoles(
  users: MobileAdminAccessUser[]
): MobileAdminAccessRole[] {
  return mobileAdminAccessRoles.map((role) => {
    const usersWithRole = users.filter((user) =>
      user.memberships.some((membership) => membership.role === role)
    )

    return {
      defaultUsersCount: usersWithRole.filter(
        (user) =>
          user.memberships.find((membership) => membership.role === role)
            ?.isDefault
      ).length,
      label: getMobileAdminRoleLabel(role),
      role,
      scope: getMobileAdminRoleScope(role),
      usersCount: usersWithRole.length,
    }
  })
}

function summarizeMobileAdminAccess(
  users: MobileAdminAccessUser[]
): MobileAdminAccess["summary"] {
  return {
    defaultRoles: users.filter((user) => user.defaultRoleLabel).length,
    memberUsers: users.filter((user) =>
      user.memberships.some((membership) => membership.role === "member")
    ).length,
    roleAssignments: users.reduce(
      (total, user) => total + user.memberships.length,
      0
    ),
    staffUsers: users.filter((user) =>
      user.memberships.some((membership) => membership.role !== "member")
    ).length,
    workspaceUsers: users.length,
  }
}

type MobileNotificationAuditLog = Awaited<
  ReturnType<typeof listAuditLogs>
>[number]

function toMobileNotificationDelivery(
  log: MobileNotificationAuditLog
): MobileNotificationDelivery {
  const notificationType =
    getMobileMetadataString(log.metadata, "notificationType") ??
    "notification.email"
  const status = getMobileDeliveryStatus(log.action)
  const safeCopy = getMobileNotificationSafeCopy(notificationType, status)

  return {
    action: log.action,
    errorMessage:
      status === "failed" ? "Delivery could not be completed." : null,
    id: log.id,
    notificationType,
    occurredAt: log.occurredAt.toISOString(),
    recipient: "This account",
    safeSummary: safeCopy.safeSummary,
    safeTitle: safeCopy.safeTitle,
    source: getMobileMetadataString(log.metadata, "source"),
    status,
  }
}

function summarizeMobileNotifications(
  deliveries: MobileNotificationDelivery[],
  preferences: MobileNotificationPreference[]
): MobileNotifications["summary"] {
  return {
    enabledPreferences: preferences.filter((preference) => preference.enabled)
      .length,
    failed: deliveries.filter((delivery) => delivery.status === "failed")
      .length,
    queued: deliveries.filter((delivery) => delivery.status === "queued")
      .length,
    sent: deliveries.filter((delivery) => delivery.status === "sent").length,
    totalDeliveries: deliveries.length,
  }
}

const mobileFinanceQueueKeys = new Set([
  "financing-approvals",
  "disbursement-holds",
  "financing-cycle-warnings",
  "overdue-follow-ups",
  "share-applications",
  "payment-receipts",
  "procurement-requests",
  "project-financing-requests",
  "food-purchase-applications",
  "food-purchase-accounting",
])

function toMobileAdminFinanceQueue(
  row: Awaited<ReturnType<typeof getOverviewSummary>>["actionQueue"][number]
): MobileAdminFinanceQueue | null {
  if (!mobileFinanceQueueKeys.has(row.key)) {
    return null
  }

  return {
    count: row.count,
    detail:
      row.severity === "critical"
        ? "Needs urgent finance review"
        : "Waiting for review",
    key: row.key,
    label: row.label,
    severity: row.severity,
  }
}

function getOverviewQueueCount(
  summary: Awaited<ReturnType<typeof getOverviewSummary>> | null | undefined,
  key: string
) {
  return summary?.actionQueue.find((item) => item.key === key)?.count ?? 0
}

function buildMobileAdminReportCards(
  metrics: Awaited<ReturnType<typeof getDashboardMetrics>>,
  summary?: Awaited<ReturnType<typeof getOverviewSummary>> | null
): MobileAdminReportCard[] {
  const hasQueue = (key: string) =>
    summary?.actionQueue.some((item) => item.key === key) ?? true
  const cards: MobileAdminReportCard[] = [
    {
      detail: "Member identity, KYC, status, and linked-login evidence.",
      exportHref: "/reports/members-export",
      key: "members",
      metricFormat: "count",
      metricLabel: "Members",
      metricValue: metrics.memberCount,
      title: "Member register",
    },
    {
      detail: "Contribution collection totals and period coverage.",
      exportHref: "/reports/collections-export",
      key: "collections",
      metricFormat: "currency",
      metricLabel: "Received this period",
      metricValue: summary?.contributionHealth.receivedThisMonth ?? 0,
      title: "Collections",
    },
    {
      detail: "Submitted proofs, allocation intent, and review status.",
      exportHref: "/reports/payment-receipts-export",
      key: "paymentReceipts",
      metricFormat: "count",
      metricLabel: "Pending review",
      metricValue: getOverviewQueueCount(summary, "payment-receipts"),
      title: "Payment receipts",
    },
    {
      detail: "Active cooperative financing, exposure, and repayment state.",
      exportHref: "/reports/loans-export",
      key: "financing",
      metricFormat: "currency",
      metricLabel: "Outstanding",
      metricValue: metrics.outstandingLoans,
      title: "Financing portfolio",
    },
    {
      detail: "Share capital positions and optional share activity.",
      exportHref: "/reports/shares-export",
      key: "shares",
      metricFormat: "currency",
      metricLabel: "Share capital",
      metricValue: summary?.shareAndProfitPosition.shareCapitalBalance ?? 0,
      title: "Shares",
    },
    {
      detail: "Item-purchase requests, review evidence, and repayment risk.",
      exportHref: "/reports/procurement-export",
      key: "procurement",
      metricFormat: "count",
      metricLabel: "Pending review",
      metricValue: getOverviewQueueCount(summary, "procurement-requests"),
      title: "Procurement",
    },
    {
      detail:
        "Monthly cycle releases, member applications, and accounting evidence.",
      exportHref: "/reports/food-purchase-export",
      key: "foodPurchase",
      metricFormat: "count",
      metricLabel: "Open queue",
      metricValue:
        getOverviewQueueCount(summary, "food-purchase-applications") +
        getOverviewQueueCount(summary, "food-purchase-accounting"),
      title: "Foodstuff Purchase",
    },
    {
      detail: "Business funding requests and structure-review evidence.",
      exportHref: "/reports/project-financing-export",
      key: "projectFinancing",
      metricFormat: "count",
      metricLabel: "Pending review",
      metricValue: getOverviewQueueCount(summary, "project-financing-requests"),
      title: "Project financing",
    },
    {
      detail:
        "Support cases, escalation status, and financial adjustment requests.",
      exportHref: "/reports/support-export",
      key: "support",
      metricFormat: "count",
      metricLabel: "Open cases",
      metricValue: getOverviewQueueCount(summary, "support-cases"),
      title: "Support cases",
    },
    {
      detail:
        "Recent workspace activity, actor evidence, and operational events.",
      exportHref: "/reports/audit",
      key: "audit",
      metricFormat: "count",
      metricLabel: "Recent events",
      metricValue: summary?.recentActivity.length ?? 0,
      title: "Activity evidence",
    },
  ]

  if (!summary) {
    return cards
  }

  return cards.filter((card) => {
    if (card.key === "paymentReceipts") {
      return hasQueue("payment-receipts") || card.metricValue > 0
    }

    if (card.key === "procurement") {
      return hasQueue("procurement-requests") || card.metricValue > 0
    }

    if (card.key === "foodPurchase") {
      return (
        hasQueue("food-purchase-applications") ||
        hasQueue("food-purchase-accounting") ||
        card.metricValue > 0
      )
    }

    if (card.key === "support") {
      return hasQueue("support-cases") || card.metricValue > 0
    }

    return true
  })
}

function toMobileAdminActivityEvent(
  event: ActivityReportEvent
): MobileAdminActivityEvent {
  return {
    action: event.action,
    actionLabel: event.actionLabel,
    actorLabel: event.actorLabel,
    actorType: event.actorType,
    authorizationRole: event.authorizationRole,
    authorizerLabel: event.authorizerLabel,
    entityId: event.entityId,
    entityType: event.entityType,
    id: event.id,
    metadataSummary: event.metadataSummary.slice(0, 3),
    occurredAt: event.occurredAt.toISOString(),
  }
}

type MobileCollectionFollowUpRow = Awaited<
  ReturnType<typeof listCollectionFollowUps>
>[number]

function toMobileAdminCollectionFollowUp(
  followUp: MobileCollectionFollowUpRow
): MobileAdminCollectionFollowUp {
  return {
    caseStage: followUp.caseStage,
    createdAt: followUp.createdAt.toISOString(),
    id: followUp.id,
    loanProductName: followUp.loan.loanProduct.name,
    memberName: followUp.member.fullName,
    memberNumber: followUp.member.memberNumber,
    nextActionAt: followUp.nextActionAt?.toISOString() ?? null,
    note: followUp.note,
    priority: followUp.priority,
    repaymentScheduleItemId: followUp.repaymentScheduleItemId,
    resolutionStatus: followUp.resolutionStatus,
    status: followUp.status,
  }
}

function loanRequestToFinanceItem(
  row: MobileLoanRequestRow
): MobileAdminFinanceRecentItem {
  return {
    amount: Number(row.requestedAmount ?? 0),
    id: row.id,
    queueKey: "financing",
    requestedAt: row.requestedAt.toISOString(),
    status: row.status,
    subtitle: row.loanProduct.name,
    title: `${row.member.fullName} (${row.member.memberNumber})`,
  }
}

function procurementToFinanceItem(
  row: ProcurementRequestRow
): MobileAdminFinanceRecentItem {
  return {
    amount: row.requestedCost,
    id: row.id,
    queueKey: "procurement",
    requestedAt: row.requestedAt.toISOString(),
    status: row.status,
    subtitle: row.vendorName ?? "No vendor recorded",
    title: `${row.member.fullName} - ${row.itemName}`,
  }
}

function projectFinancingToFinanceItem(
  row: ProjectFinancingRequestRow
): MobileAdminFinanceRecentItem {
  return {
    amount: row.requestedAmount,
    id: row.id,
    queueKey: "projectFinancing",
    requestedAt: row.requestedAt.toISOString(),
    status: row.status,
    subtitle: row.projectPurpose ?? row.proposedStructure,
    title: `${row.member.fullName} - ${row.businessName}`,
  }
}

function foodPurchaseToFinanceItem(
  row: FoodPurchaseApplicationRow
): MobileAdminFinanceRecentItem {
  return {
    amount: row.requestedAmount,
    id: row.id,
    queueKey: "foodPurchase",
    requestedAt: row.requestedAt.toISOString(),
    status: row.status,
    subtitle:
      row.itemDescription ?? `Cycle ${formatDateLabel(row.cycle.periodMonth)}`,
    title: `${row.member.fullName} (${row.member.memberNumber})`,
  }
}

function receiptToFinanceItem(
  row: MemberPaymentReceiptRow
): MobileAdminFinanceRecentItem {
  return {
    amount: row.totalAmount,
    id: row.id,
    queueKey: "receipts",
    requestedAt: row.submittedAt.toISOString(),
    status: row.status,
    subtitle: row.paymentReference
      ? `Reference ${row.paymentReference}`
      : `${row.allocations.length} allocation${
          row.allocations.length === 1 ? "" : "s"
        }`,
    title: `${row.member.fullName} (${row.member.memberNumber})`,
  }
}

function shareApplicationToFinanceItem(
  row: MemberShareApplicationRow
): MobileAdminFinanceRecentItem {
  return {
    amount: row.shareValueSnapshot,
    id: row.id,
    queueKey: "shares",
    requestedAt: row.createdAt.toISOString(),
    status: row.status,
    subtitle: `${row.requestedUnits} optional unit${
      row.requestedUnits === 1 ? "" : "s"
    } requested`,
    title: `${row.memberName} (${row.memberNumber})`,
  }
}

function toMobileSupportCase(row: SupportCaseRow): MobileSupportCase {
  const recentMessages = row.messages.slice(-5)

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
    recentMessages: recentMessages.map((message) => ({
      attachmentUrl: message.attachmentUrl,
      authorName: message.authorUser?.fullName ?? null,
      authorType: message.authorType,
      createdAt: message.createdAt.toISOString(),
      id: message.id,
      message: message.message,
    })),
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

function toMobileLoanProductOption(
  row: Awaited<ReturnType<typeof listLoanProducts>>[number]
): MobileLoanProductOption {
  return {
    code: row.code,
    id: row.id,
    loanType: row.loanType,
    maxSavingsMultiple: Number(row.maxSavingsMultiple ?? 0),
    name: row.name,
    termMonths: row.termMonths,
  }
}

function toMobileFinancingRequest(
  row: MobileLoanRequestRow
): MobileMemberFinancingRequest {
  return {
    charges: (row.charges ?? []).map((charge: any) => ({
      amount: Number(charge.amount ?? 0),
      code: charge.chargeDefinition?.code ?? "",
      collectionMode: charge.collectionMode ?? "deduct_from_savings",
      id: charge.id,
      name: charge.chargeDefinition?.name ?? "Charge",
      status: charge.status,
    })),
    availablePoolSnapshot: Number(row.availablePoolSnapshot ?? 0),
    eligibleAmountSnapshot: Number(row.eligibleAmountSnapshot ?? 0),
    estimatedMonthlyServicing: Number(row.estimatedMonthlyServicing ?? 0),
    extraMonthlySavingsAmount: Number(row.extraMonthlySavingsAmount ?? 0),
    guarantorApprovals: row.guarantorApprovals.map((approval) => ({
      guarantorMemberNumber: approval.guarantorMember.memberNumber,
      guarantorName: approval.guarantorMember.fullName,
      id: approval.id,
      respondedAt: approval.respondedAt
        ? approval.respondedAt.toISOString()
        : null,
      status: approval.status,
    })),
    id: row.id,
    loanProductCode: row.loanProduct.code,
    loanProductName: row.loanProduct.name,
    purpose: row.purpose,
    requestedAmount: Number(row.requestedAmount ?? 0),
    requestedAt: row.requestedAt.toISOString(),
    requestedTermMonths: row.requestedTermMonths,
    reviewNotes: row.reviewNotes,
    status: row.status,
  }
}

function toMobileProcurementRequest(
  row: ProcurementRequestRow
): MobileMemberProcurementRequest {
  return {
    approvedCost: row.approvedCost,
    approvedMonthlyRepayment: row.approvedMonthlyRepayment,
    approvedRepaymentMonths: row.approvedRepaymentMonths,
    estimatedMonthlyRepayment: row.estimatedMonthlyRepayment,
    id: row.id,
    itemDescription: row.itemDescription,
    itemName: row.itemName,
    outstandingAmount: row.outstandingAmount,
    purchasedAt: row.purchasedAt ? row.purchasedAt.toISOString() : null,
    purchaseReference: row.purchaseReference,
    requestedAt: row.requestedAt.toISOString(),
    requestedCost: row.requestedCost,
    requestedRepaymentMonths: row.requestedRepaymentMonths,
    reviewNotes: row.reviewNotes,
    scheduleItems: row.repaymentScheduleItems.map((item) => ({
      amount: item.amount,
      dueDate: item.dueDate.toISOString(),
      id: item.id,
      installmentNumber: item.installmentNumber,
      paidAmount: item.paidAmount,
      status: item.status,
    })),
    status: row.status,
    vendorName: row.vendorName,
  }
}

function summarizeMobileProcurementRequests(
  requests: MobileMemberProcurementRequest[]
): MobileMemberProcurement["summary"] {
  return {
    activeRequests: requests.filter((request) =>
      ["active", "purchased"].includes(request.status)
    ).length,
    approvedRequests: requests.filter((request) =>
      ["approved", "purchased", "active", "completed"].includes(request.status)
    ).length,
    dueScheduleItems: requests.reduce(
      (total, request) =>
        total +
        request.scheduleItems.filter((item) => item.status === "due").length,
      0
    ),
    outstandingAmount: requests.reduce(
      (total, request) => total + request.outstandingAmount,
      0
    ),
    overdueScheduleItems: requests.reduce(
      (total, request) =>
        total +
        request.scheduleItems.filter((item) => item.status === "overdue")
          .length,
      0
    ),
    pendingRequests: requests.filter((request) =>
      ["submitted", "under_review"].includes(request.status)
    ).length,
    totalRequests: requests.length,
  }
}

function toMobileProjectFinancingRequest(
  row: ProjectFinancingRequestRow
): MobileProjectFinancingRequest {
  return {
    approvedAmount: row.approvedAmount,
    approvedMonthlyPayback: row.approvedMonthlyPayback,
    approvedPaybackMonths: row.approvedPaybackMonths,
    approvedStructure: row.approvedStructure,
    businessDescription: row.businessDescription,
    businessName: row.businessName,
    disbursedAt: row.disbursedAt ? row.disbursedAt.toISOString() : null,
    disbursementNotes: row.disbursementNotes,
    disbursementReference: row.disbursementReference,
    estimatedMonthlyPayback: row.estimatedMonthlyPayback,
    id: row.id,
    paidAmount: row.paidAmount,
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
    projectPurpose: row.projectPurpose,
    proposedStructure: row.proposedStructure,
    requestedAmount: row.requestedAmount,
    requestedAt: row.requestedAt.toISOString(),
    requestedPaybackMonths: row.requestedPaybackMonths,
    reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
    reviewNotes: row.reviewNotes,
    status: row.status,
  }
}

function summarizeMobileProjectFinancingRequests(
  requests: MobileProjectFinancingRequest[]
): MobileMemberProjectFinancing["summary"] {
  return {
    activeRequests: requests.filter((request) => request.status === "active")
      .length,
    approvedRequests: requests.filter((request) =>
      ["approved", "active", "completed"].includes(request.status)
    ).length,
    outstandingAmount: requests.reduce((total, request) => {
      if (!["approved", "active", "completed"].includes(request.status)) {
        return total
      }

      return (
        total + Math.max((request.approvedAmount ?? 0) - request.paidAmount, 0)
      )
    }, 0),
    pendingRequests: requests.filter((request) =>
      ["submitted", "under_review"].includes(request.status)
    ).length,
    totalApprovedAmount: requests.reduce(
      (total, request) => total + (request.approvedAmount ?? 0),
      0
    ),
    totalRequestedAmount: requests.reduce(
      (total, request) => total + request.requestedAmount,
      0
    ),
    totalRequests: requests.length,
  }
}

function toMobileFoodPurchaseCycle(
  row: FoodPurchaseCycleRow
): MobileFoodPurchaseCycle {
  return {
    id: row.id,
    periodMonth: row.periodMonth.toISOString(),
    releasedAmount: row.releasedAmount,
    releasedAt: row.releasedAt.toISOString(),
    releaseNotes: row.releaseNotes,
    status: row.status,
  }
}

function toMobileFoodPurchaseApplication(
  row: FoodPurchaseApplicationRow
): MobileFoodPurchaseApplication {
  return {
    approvedAmount: row.approvedAmount,
    approvedPaybackMonths: row.approvedPaybackMonths,
    cycle: {
      id: row.cycle.id,
      periodMonth: row.cycle.periodMonth.toISOString(),
      releasedAmount: row.cycle.releasedAmount,
      status: row.cycle.status,
    },
    id: row.id,
    itemDescription: row.itemDescription,
    paidAmount: row.paidAmount,
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
    requestedAmount: row.requestedAmount,
    requestedAt: row.requestedAt.toISOString(),
    requestedPaybackMonths: row.requestedPaybackMonths,
    requestNotes: row.requestNotes,
    reviewNotes: row.reviewNotes,
    status: row.status,
  }
}

function summarizeMobileFoodPurchase(input: {
  applications: MobileFoodPurchaseApplication[]
  cycles: MobileFoodPurchaseCycle[]
}): MobileMemberFoodPurchase["summary"] {
  return {
    approvedApplications: input.applications.filter(
      (application) => application.status === "approved"
    ).length,
    openCycles: input.cycles.filter((cycle) => cycle.status === "open").length,
    pendingApplications: input.applications.filter((application) =>
      ["submitted", "under_review"].includes(application.status)
    ).length,
    totalApplications: input.applications.length,
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
    procurementRequests,
    projectFinancingRequests,
    foodPurchaseCycles,
    foodPurchaseApplications,
    guarantorApprovals,
    supportSummary,
    supportCases,
    operationProfile,
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
    listProcurementRequests(
      {
        limit: 3,
        memberId: input.member.id,
        tenantId: input.tenantId,
      },
      input.prisma
    ),
    listProjectFinancingRequests(
      {
        limit: 3,
        memberId: input.member.id,
        tenantId: input.tenantId,
      },
      input.prisma
    ),
    listFoodPurchaseCycles(
      {
        limit: 3,
        status: "open",
        tenantId: input.tenantId,
      },
      input.prisma
    ),
    listFoodPurchaseApplications(
      {
        limit: 3,
        memberId: input.member.id,
        tenantId: input.tenantId,
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
    getTenantOperationProfile(input.tenantId, input.prisma),
  ])
  const summary = input.detail.summary
  const verifiedDocuments = input.detail.member.documents.filter(
    (document) => document.reviewStatus === "verified"
  ).length
  const latestReceipt = receipts[0] ?? null
  const pendingProcurementCount = procurementRequests.filter((request) =>
    ["submitted", "under_review"].includes(request.status)
  ).length
  const latestProcurementRequest = procurementRequests[0] ?? null
  const pendingProjectFinancingCount = projectFinancingRequests.filter(
    (request) => ["submitted", "under_review"].includes(request.status)
  ).length
  const latestProjectFinancingRequest = projectFinancingRequests[0] ?? null
  const latestFoodPurchaseApplication = foodPurchaseApplications[0] ?? null
  const pendingFoodPurchaseCount = foodPurchaseApplications.filter(
    (application) => ["submitted", "under_review"].includes(application.status)
  ).length
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
    sections: (
      [
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
              status:
                receiptSummary.pendingReviewReceipts > 0 ? "Open" : "Clear",
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
          icon: "PackageSearch",
          key: "procurement",
          rows: [
            moreRow({
              detail:
                pendingProcurementCount > 0
                  ? "Waiting for cooperative review"
                  : "No procurement requests waiting on review",
              format: "count",
              key: "pending-procurement",
              label: "Pending procurement",
              status: pendingProcurementCount > 0 ? "Open" : "Clear",
              value: pendingProcurementCount,
            }),
            ...(latestProcurementRequest
              ? [
                  moreRow({
                    detail: latestProcurementRequest.vendorName
                      ? `${latestProcurementRequest.itemName} - ${latestProcurementRequest.vendorName}`
                      : latestProcurementRequest.itemName,
                    format: "currency" as const,
                    key: `procurement-${latestProcurementRequest.id}`,
                    label: "Latest request",
                    status: humanizeStatus(latestProcurementRequest.status),
                    value: latestProcurementRequest.requestedCost,
                  }),
                ]
              : []),
          ],
          title: "Procurement",
        },
        {
          icon: "BriefcaseBusiness",
          key: "projectFinancing",
          rows: [
            moreRow({
              detail:
                pendingProjectFinancingCount > 0
                  ? "Waiting for finance review"
                  : "No project financing requests waiting on review",
              format: "count",
              key: "pending-project-financing",
              label: "Pending project requests",
              status: pendingProjectFinancingCount > 0 ? "Open" : "Clear",
              value: pendingProjectFinancingCount,
            }),
            ...(latestProjectFinancingRequest
              ? [
                  moreRow({
                    detail:
                      latestProjectFinancingRequest.projectPurpose ??
                      humanizeStatus(
                        latestProjectFinancingRequest.proposedStructure
                      ) ??
                      "Project financing request",
                    format: "currency" as const,
                    key: `project-financing-${latestProjectFinancingRequest.id}`,
                    label: latestProjectFinancingRequest.businessName,
                    status: humanizeStatus(
                      latestProjectFinancingRequest.status
                    ),
                    value: latestProjectFinancingRequest.requestedAmount,
                  }),
                ]
              : []),
          ],
          title: "Project financing",
        },
        {
          icon: "ShoppingBasket",
          key: "foodPurchase",
          rows: [
            moreRow({
              detail:
                foodPurchaseCycles.length > 0
                  ? "Monthly purchase cycle accepting applications"
                  : "No open Foodstuff Purchase cycle",
              format: "count",
              key: "open-food-purchase-cycles",
              label: "Open cycles",
              status: foodPurchaseCycles.length > 0 ? "Open" : "Closed",
              value: foodPurchaseCycles.length,
            }),
            moreRow({
              detail:
                pendingFoodPurchaseCount > 0
                  ? "Waiting for committee review"
                  : "No pending Foodstuff Purchase applications",
              format: "count",
              key: "pending-food-purchase",
              label: "Pending applications",
              status: pendingFoodPurchaseCount > 0 ? "Open" : "Clear",
              value: pendingFoodPurchaseCount,
            }),
            ...(latestFoodPurchaseApplication
              ? [
                  moreRow({
                    detail: latestFoodPurchaseApplication.itemDescription
                      ? latestFoodPurchaseApplication.itemDescription
                      : `Cycle ${formatDateLabel(latestFoodPurchaseApplication.cycle.periodMonth)}`,
                    format: "currency" as const,
                    key: `food-purchase-${latestFoodPurchaseApplication.id}`,
                    label: "Latest application",
                    status: humanizeStatus(
                      latestFoodPurchaseApplication.status
                    ),
                    value: latestFoodPurchaseApplication.requestedAmount,
                  }),
                ]
              : []),
          ],
          title: "Foodstuff Purchase",
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
      ] satisfies MobileMemberMoreSection[]
    ).filter((section) => {
      if (section.key === "receipts") {
        return (
          operationProfile.services.payment_receipts.shouldShowInMemberNav ||
          receipts.length > 0
        )
      }

      if (section.key === "procurement") {
        return (
          operationProfile.services.procurement.shouldShowInMemberNav ||
          procurementRequests.length > 0
        )
      }

      if (section.key === "foodPurchase") {
        return (
          operationProfile.services.food_purchase.shouldShowInMemberNav ||
          foodPurchaseApplications.length > 0 ||
          foodPurchaseCycles.length > 0
        )
      }

      if (section.key === "support") {
        return (
          operationProfile.services.support_cases.shouldShowInMemberNav ||
          supportCases.length > 0
        )
      }

      return true
    }),
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

  const [summary, receipts, operationProfile] = await Promise.all([
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
    getTenantOperationProfile(input.tenantId, prisma),
  ])

  return {
    canCreateReceipt:
      operationProfile.services.payment_receipts.canMemberCreate,
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

export async function getMobileMemberProcurement(input: {
  tenantId: string
  userId: string
}): Promise<MobileMemberProcurement> {
  const prisma = createPrismaClient()

  if (!prisma) {
    return emptyMemberProcurement()
  }

  const member = await getMemberByUserId(input, prisma)

  if (!member) {
    return emptyMemberProcurement()
  }

  const [requests, chargeOptions, operationProfile] = await Promise.all([
    listProcurementRequests(
      {
        memberId: member.id,
        tenantId: input.tenantId,
      },
      prisma
    ),
    getMobileWorkflowChargeOptions({
      tenantId: input.tenantId,
      workflow: "procurement_request",
    }),
    getTenantOperationProfile(input.tenantId, prisma),
  ])
  const mobileRequests = requests.map(toMobileProcurementRequest)

  return {
    canCreateRequest: operationProfile.services.procurement.canMemberCreate,
    chargeOptions,
    generatedAt: new Date().toISOString(),
    member: {
      id: member.id,
      memberNumber: member.memberNumber,
      name: member.fullName,
    },
    requests: mobileRequests,
    summary: summarizeMobileProcurementRequests(mobileRequests),
  }
}

export async function createMobileMemberProcurementRequest(input: {
  itemDescription?: string | null
  itemName: string
  requestedCost: number
  requestedRepaymentMonths: number
  tenantId: string
  userId: string
  vendorName?: string | null
}): Promise<MobileMemberProcurementRequest> {
  const prisma = createPrismaClient()

  if (!prisma) {
    throw new Error(
      "Procurement requests are unavailable without database configuration."
    )
  }

  const member = await getMemberByUserId(input, prisma)

  if (!member) {
    throw ExpectedQueryError.precondition(
      "Member profile needs linking before submitting procurement requests."
    )
  }

  const request = await createProcurementRequest(
    {
      actorUserId: input.userId,
      itemDescription: input.itemDescription ?? undefined,
      itemName: input.itemName,
      memberId: member.id,
      requestSource: "member_self_service",
      requestedCost: input.requestedCost,
      requestedRepaymentMonths: input.requestedRepaymentMonths,
      tenantId: input.tenantId,
      vendorName: input.vendorName ?? undefined,
    },
    prisma
  )

  return toMobileProcurementRequest(request)
}

export async function getMobileMemberProjectFinancing(input: {
  tenantId: string
  userId: string
}): Promise<MobileMemberProjectFinancing> {
  const prisma = createPrismaClient()

  if (!prisma) {
    return emptyMemberProjectFinancing()
  }

  const member = await getMemberByUserId(input, prisma)

  if (!member) {
    return emptyMemberProjectFinancing()
  }

  const [requests, chargeOptions] = await Promise.all([
    listProjectFinancingRequests(
      {
        memberId: member.id,
        tenantId: input.tenantId,
      },
      prisma
    ),
    getMobileWorkflowChargeOptions({
      tenantId: input.tenantId,
      workflow: "project_financing_request",
    }),
  ])
  const mobileRequests = requests.map(toMobileProjectFinancingRequest)

  return {
    chargeOptions,
    generatedAt: new Date().toISOString(),
    member: {
      id: member.id,
      memberNumber: member.memberNumber,
      name: member.fullName,
    },
    requests: mobileRequests,
    summary: summarizeMobileProjectFinancingRequests(mobileRequests),
  }
}

export async function createMobileMemberProjectFinancingRequest(input: {
  businessDescription?: string | null
  businessName: string
  projectPurpose?: string | null
  proposedStructure?: MobileProjectFinancingStructure | null
  requestedAmount: number
  requestedPaybackMonths?: number | null
  tenantId: string
  userId: string
}): Promise<MobileProjectFinancingRequest> {
  const prisma = createPrismaClient()

  if (!prisma) {
    throw new Error(
      "Project financing requests are unavailable without database configuration."
    )
  }

  const member = await getMemberByUserId(input, prisma)

  if (!member) {
    throw ExpectedQueryError.precondition(
      "Member profile needs linking before submitting project financing requests."
    )
  }

  const request = await createProjectFinancingRequest(
    {
      actorUserId: input.userId,
      businessDescription: input.businessDescription ?? undefined,
      businessName: input.businessName,
      memberId: member.id,
      projectPurpose: input.projectPurpose ?? undefined,
      proposedStructure: input.proposedStructure ?? undefined,
      requestedAmount: input.requestedAmount,
      requestedPaybackMonths: input.requestedPaybackMonths ?? undefined,
      tenantId: input.tenantId,
    },
    prisma
  )

  return toMobileProjectFinancingRequest(request)
}

export async function getMobileMemberFoodPurchase(input: {
  tenantId: string
  userId: string
}): Promise<MobileMemberFoodPurchase> {
  const prisma = createPrismaClient()

  if (!prisma) {
    return emptyMemberFoodPurchase()
  }

  const member = await getMemberByUserId(input, prisma)

  if (!member) {
    return emptyMemberFoodPurchase()
  }

  const [cycles, applications, chargeOptions, operationProfile] =
    await Promise.all([
      listFoodPurchaseCycles(
        {
          tenantId: input.tenantId,
        },
        prisma
      ),
      listFoodPurchaseApplications(
        {
          memberId: member.id,
          tenantId: input.tenantId,
        },
        prisma
      ),
      getMobileWorkflowChargeOptions({
        tenantId: input.tenantId,
        workflow: "food_purchase_application",
      }),
      getTenantOperationProfile(input.tenantId, prisma),
    ])
  const mobileCycles = cycles.map(toMobileFoodPurchaseCycle)
  const mobileApplications = applications.map(toMobileFoodPurchaseApplication)

  return {
    applications: mobileApplications,
    canCreateApplication:
      operationProfile.services.food_purchase.canMemberCreate,
    chargeOptions,
    cycles: mobileCycles,
    generatedAt: new Date().toISOString(),
    member: {
      id: member.id,
      memberNumber: member.memberNumber,
      name: member.fullName,
    },
    summary: summarizeMobileFoodPurchase({
      applications: mobileApplications,
      cycles: mobileCycles,
    }),
  }
}

export async function createMobileMemberFoodPurchaseApplication(input: {
  cycleId: string
  itemDescription?: string | null
  requestedAmount: number
  requestedPaybackMonths: number
  requestNotes?: string | null
  tenantId: string
  userId: string
}): Promise<MobileFoodPurchaseApplication> {
  const prisma = createPrismaClient()

  if (!prisma) {
    throw new Error(
      "Foodstuff Purchase applications are unavailable without database configuration."
    )
  }

  const member = await getMemberByUserId(input, prisma)

  if (!member) {
    throw ExpectedQueryError.precondition(
      "Member profile needs linking before submitting Foodstuff Purchase applications."
    )
  }

  const application = await submitFoodPurchaseApplication(
    {
      actorUserId: input.userId,
      cycleId: input.cycleId,
      itemDescription: input.itemDescription ?? undefined,
      memberId: member.id,
      requestSource: "member_self_service",
      requestedAmount: input.requestedAmount,
      requestedPaybackMonths: input.requestedPaybackMonths,
      requestNotes: input.requestNotes ?? undefined,
      tenantId: input.tenantId,
    },
    prisma
  )

  return toMobileFoodPurchaseApplication(application)
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
    throw ExpectedQueryError.precondition(
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
    throw ExpectedQueryError.notFound("Loan guarantor approval not found.")
  }

  return toMobileGuarantorApproval(approval)
}

export async function getMobileMemberFinancing(input: {
  tenantId: string
  userId: string
}): Promise<MobileMemberFinancing> {
  const prisma = createPrismaClient()

  if (!prisma) {
    return emptyMemberFinancing(
      "database_unavailable",
      "Financing self-service needs the database runtime."
    )
  }

  const member = await getMemberByUserId(input, prisma)

  if (!member) {
    return emptyMemberFinancing(
      "member_profile_missing",
      "No linked member profile was found for this mobile session."
    )
  }

  const [detail, products, requests, loanRequestCharges] = await Promise.all([
    getMemberStatementDetail(input.tenantId, member.id, prisma),
    listLoanProducts(input.tenantId, prisma),
    listLoanRequests(input.tenantId, prisma),
    getMobileWorkflowChargeOptions({
      tenantId: input.tenantId,
      workflow: "loan_request",
    }),
  ])

  if (!detail) {
    return emptyMemberFinancing(
      "member_profile_missing",
      "No linked member statement was found for this mobile session."
    )
  }

  return {
    generatedAt: new Date().toISOString(),
    loanRequestCharges,
    member: {
      id: member.id,
      memberNumber: member.memberNumber,
      name: member.fullName,
    },
    products: products.map(toMobileLoanProductOption),
    requests: requests
      .filter((request) => request.member.id === member.id)
      .map(toMobileFinancingRequest),
    section: buildFinancingSection(detail),
    state: "available",
  }
}

export async function createMobileMemberFinancingRequest(input: {
  extraMonthlySavingsAmount?: number | null
  loanProductId: string
  purpose?: string | null
  requestedAmount: number
  requestedTermMonths: number
  tenantId: string
  userId: string
}): Promise<MobileMemberFinancingRequest> {
  const prisma = createPrismaClient()

  if (!prisma) {
    throw new Error(
      "Financing requests are unavailable without database configuration."
    )
  }

  const member = await getMemberByUserId(input, prisma)

  if (!member) {
    throw ExpectedQueryError.precondition(
      "Member profile needs linking before submitting financing requests."
    )
  }

  const created = await submitLoanRequest(
    {
      actorUserId: input.userId,
      extraMonthlySavingsAmount: input.extraMonthlySavingsAmount ?? undefined,
      loanProductId: input.loanProductId,
      memberId: member.id,
      purpose: input.purpose ?? undefined,
      requestedAmount: input.requestedAmount,
      requestedTermMonths: input.requestedTermMonths,
      tenantId: input.tenantId,
    },
    prisma
  )

  const request = (await listLoanRequests(input.tenantId, prisma)).find(
    (item) => item.id === created.id
  )

  if (!request) {
    throw ExpectedQueryError.notFound("Financing request not found.")
  }

  return toMobileFinancingRequest(request)
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
    throw ExpectedQueryError.precondition(
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
    throw ExpectedQueryError.precondition(
      "Member profile needs linking before submitting receipts."
    )
  }

  const operationProfile = await getTenantOperationProfile(
    input.tenantId,
    prisma
  )

  if (!operationProfile.services.payment_receipts.canMemberCreate) {
    throw ExpectedQueryError.precondition(
      "Payment receipt self-service is not enabled for this cooperative."
    )
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
  linkedRecordId?: string | null
  linkedRecordType?: SupportCaseLinkedRecordType | null
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
    throw ExpectedQueryError.precondition(
      "Member profile needs linking before creating support cases."
    )
  }

  const supportCase = await createMemberSupportCase(
    {
      category: input.category,
      description: input.description,
      linkedRecordId: input.linkedRecordId,
      linkedRecordType: input.linkedRecordType,
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

export async function replyMobileMemberSupportCase(input: {
  attachmentUrl?: string | null
  message: string
  supportCaseId: string
  tenantId: string
  userId: string
}): Promise<MobileSupportCase> {
  const prisma = createPrismaClient()

  if (!prisma) {
    throw new Error("Support is unavailable without database configuration.")
  }

  const member = await getMemberByUserId(input, prisma)

  if (!member) {
    throw ExpectedQueryError.precondition(
      "Member profile needs linking before replying to support."
    )
  }

  await addMemberSupportCaseMessage(
    {
      attachmentUrl: input.attachmentUrl,
      authorUserId: input.userId,
      memberId: member.id,
      message: input.message,
      supportCaseId: input.supportCaseId,
      tenantId: input.tenantId,
    },
    prisma
  )

  const supportCase = await getSupportCase(
    {
      memberId: member.id,
      supportCaseId: input.supportCaseId,
      tenantId: input.tenantId,
    },
    prisma
  )

  return toMobileSupportCase(supportCase)
}

function requireMobileAdminPrisma(feature: string) {
  const prisma = createPrismaClient()

  if (!prisma) {
    throw new Error(`${feature} is unavailable without database configuration.`)
  }

  return prisma
}

export async function inviteMobileAdminAccessUser(input: {
  actorUserId: string
  email: string
  fullName: string
  makeDefault?: boolean | null
  role: MembershipRole
  tenantId: string
}) {
  requireMobileAdminPrisma("Workspace invitation")

  if (input.role === "super_admin") {
    throw ExpectedQueryError.permission(
      "Super admin access cannot be invited from mobile."
    )
  }

  const result = await provisionTenantUserRole({
    actorUserId: input.actorUserId,
    email: input.email,
    fullName: input.fullName,
    makeDefault: input.makeDefault ?? false,
    role: input.role,
    tenantId: input.tenantId,
  })

  return {
    id: result.membership.id,
    status: result.membership.role,
  }
}

export async function registerMobileDeviceSession(input: {
  actorUserId: string
  appVersion: string
  buildVariant: string
  deviceId: string
  deviceName?: string | null
  platform: string
  revocationState: MobileDeviceRegistrationState
  tenantId: string
}) {
  const prisma = requireMobileAdminPrisma("Mobile device registration")
  const normalizedDeviceId = input.deviceId.trim()
  const normalizedPlatform = input.platform.trim()
  const normalizedAppVersion = input.appVersion.trim()
  const normalizedBuildVariant = input.buildVariant.trim()

  if (!normalizedDeviceId || !normalizedPlatform) {
    throw ExpectedQueryError.validation("Device id and platform are required.")
  }

  const log = await prisma.auditLog.create({
    data: {
      action:
        input.revocationState === "revoked"
          ? "mobile.device_revoked"
          : "mobile.device_registered",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityId: normalizedDeviceId,
      entityType: "MobileDeviceSession",
      metadata: {
        appVersion: normalizedAppVersion || "unknown",
        buildVariant: normalizedBuildVariant || "unknown",
        deviceId: normalizedDeviceId,
        deviceName: input.deviceName?.trim() || null,
        platform: normalizedPlatform,
        revocationState: input.revocationState,
        userId: input.actorUserId,
      },
      occurredAt: new Date(),
      tenantId: input.tenantId,
    },
  })

  return {
    id: log.id,
    status: input.revocationState,
  }
}

export async function updateMobileAdminMemberStatus(input: {
  actorUserId: string
  memberId: string
  reviewNotes?: string | null
  status: string
  tenantId: string
}) {
  const prisma = requireMobileAdminPrisma("Member status review")

  const member = await updateMemberStatus(
    input.tenantId,
    input.memberId,
    input.status as never,
    input.actorUserId,
    {
      prisma,
      reviewNotes: input.reviewNotes,
    }
  )

  return {
    id: member.id,
    status: member.status,
  }
}

export async function createMobileAdminMember(input: {
  actorUserId: string
  address?: string | null
  email?: string | null
  fullName: string
  joinedAt: Date
  memberNumber: string
  memberType: "civil_servant" | "individual" | "business"
  monthlyCommitment?: number | null
  occupation?: string | null
  phoneNumber?: string | null
  tenantId: string
}): Promise<MobileAdminMemberRow> {
  const prisma = requireMobileAdminPrisma("Member creation")
  const member = await createMember(
    {
      actorUserId: input.actorUserId,
      address: input.address,
      email: input.email?.toLowerCase() ?? null,
      fullName: input.fullName,
      joinedAt: input.joinedAt,
      memberNumber: input.memberNumber,
      memberType: input.memberType,
      monthlyCommitment: input.monthlyCommitment ?? undefined,
      occupation: input.occupation,
      phoneNumber: input.phoneNumber,
      tenantId: input.tenantId,
    },
    prisma
  )

  return {
    deductionSourceName: null,
    email: member.email ?? null,
    fullName: member.fullName,
    id: member.id,
    joinedAt: member.joinedAt.toISOString(),
    kycStatus: member.kycStatus,
    linkedUserEmail: null,
    memberNumber: member.memberNumber,
    memberType: member.memberType,
    phoneNumber: member.phoneNumber ?? null,
    status: member.status,
  }
}

export async function updateMobileAdminMemberKyc(input: {
  actorUserId: string
  governmentIdNumber?: string | null
  kycDocumentType?: string | null
  kycDocumentUrl?: string | null
  kycReviewNotes?: string | null
  kycStatus: string
  memberId: string
  tenantId: string
}) {
  const prisma = requireMobileAdminPrisma("Member KYC review")

  const member = await updateMemberKyc(
    {
      actorUserId: input.actorUserId,
      governmentIdNumber: input.governmentIdNumber,
      kycDocumentType: input.kycDocumentType,
      kycDocumentUrl: input.kycDocumentUrl,
      kycReviewNotes: input.kycReviewNotes,
      kycStatus: input.kycStatus as never,
      memberId: input.memberId,
      tenantId: input.tenantId,
    },
    prisma
  )

  return {
    id: member.id,
    kycStatus: member.kycStatus,
  }
}

export async function reviewMobileAdminMemberOnboarding(input: {
  actorUserId: string
  decision: "approved" | "rejected"
  requestId: string
  reviewNotes?: string | null
  tenantId: string
}) {
  const prisma = requireMobileAdminPrisma("Member onboarding review")

  if (input.decision === "approved") {
    const result = await approveMemberOnboardingRequest(
      {
        actorUserId: input.actorUserId,
        requestId: input.requestId,
        reviewNotes: input.reviewNotes,
        tenantId: input.tenantId,
      },
      prisma
    )

    return {
      id: result.request.id,
      status: result.request.status,
    }
  }

  const result = await rejectMemberOnboardingRequest(
    {
      actorUserId: input.actorUserId,
      reason: input.reviewNotes,
      requestId: input.requestId,
      tenantId: input.tenantId,
    },
    prisma
  )

  return {
    id: result.request.id,
    status: result.request.status,
  }
}

export async function reviewMobileAdminReceipt(input: {
  actorUserId: string
  adjustedAllocations?: MobileReceiptCreateAllocation[]
  adjustmentReason?: string | null
  decision: string
  receiptId: string
  reviewNotes?: string | null
  tenantId: string
}): Promise<MobilePaymentReceipt> {
  const prisma = requireMobileAdminPrisma("Receipt review")

  const receipt = await reviewMemberPaymentReceipt(
    {
      actorUserId: input.actorUserId,
      adjustedAllocations: input.adjustedAllocations,
      adjustmentReason: input.adjustmentReason,
      decision: input.decision as never,
      receiptId: input.receiptId,
      reviewNotes: input.reviewNotes,
      tenantId: input.tenantId,
    },
    prisma
  )

  return toMobileReceipt(receipt)
}

export async function reviewMobileAdminFinancingRequest(input: {
  actorUserId: string
  loanRequestId: string
  notes?: string | null
  status: "approved" | "rejected" | "under_review"
  tenantId: string
}) {
  const prisma = requireMobileAdminPrisma("Financing request review")
  const request = await reviewLoanRequest(
    {
      actorUserId: input.actorUserId,
      loanRequestId: input.loanRequestId,
      notes: input.notes ?? undefined,
      status: input.status,
      tenantId: input.tenantId,
    },
    prisma
  )

  return {
    id: request.id,
    status: request.status,
  }
}

export async function reviewMobileAdminProcurementRequest(input: {
  actorUserId: string
  approvedCost?: number | null
  approvedRepaymentMonths?: number | null
  notes?: string | null
  procurementRequestId: string
  status: "approved" | "rejected" | "under_review"
  tenantId: string
}): Promise<MobileMemberProcurementRequest> {
  const prisma = requireMobileAdminPrisma("Procurement request review")
  const request = await reviewProcurementRequest(
    {
      actorUserId: input.actorUserId,
      approvedCost: input.approvedCost,
      approvedRepaymentMonths: input.approvedRepaymentMonths,
      notes: input.notes,
      procurementRequestId: input.procurementRequestId,
      status: input.status,
      tenantId: input.tenantId,
    },
    prisma
  )

  return toMobileProcurementRequest(request)
}

export async function reviewMobileAdminFoodPurchaseApplication(input: {
  actorUserId: string
  applicationId: string
  approvedAmount?: number | null
  approvedPaybackMonths?: number | null
  notes?: string | null
  status: "approved" | "rejected" | "under_review"
  tenantId: string
}): Promise<MobileFoodPurchaseApplication> {
  const prisma = requireMobileAdminPrisma("Foodstuff Purchase review")
  const application = await reviewFoodPurchaseApplication(
    {
      actorUserId: input.actorUserId,
      applicationId: input.applicationId,
      approvedAmount: input.approvedAmount,
      approvedPaybackMonths: input.approvedPaybackMonths,
      notes: input.notes,
      status: input.status,
      tenantId: input.tenantId,
    },
    prisma
  )

  return toMobileFoodPurchaseApplication(application)
}

export async function reviewMobileAdminProjectFinancingRequest(input: {
  actorUserId: string
  approvedAmount?: number | null
  approvedPaybackMonths?: number | null
  approvedStructure?: MobileProjectFinancingStructure | null
  notes?: string | null
  projectFinancingRequestId: string
  status: "approved" | "rejected" | "under_review"
  tenantId: string
}): Promise<MobileProjectFinancingRequest> {
  const prisma = requireMobileAdminPrisma("Project financing review")
  const request = await reviewProjectFinancingRequest(
    {
      actorUserId: input.actorUserId,
      approvedAmount: input.approvedAmount,
      approvedPaybackMonths: input.approvedPaybackMonths,
      approvedStructure: input.approvedStructure,
      notes: input.notes,
      projectFinancingRequestId: input.projectFinancingRequestId,
      status: input.status,
      tenantId: input.tenantId,
    },
    prisma
  )

  return toMobileProjectFinancingRequest(request)
}

export async function reviewMobileAdminShareApplication(input: {
  actorUserId: string
  applicationId: string
  approvedUnits?: number | null
  decision: "approved" | "rejected"
  effectiveDate?: Date
  reviewNotes?: string | null
  tenantId: string
}): Promise<MobileMemberShareApplication> {
  const prisma = requireMobileAdminPrisma("Share application review")
  const application = await reviewMemberShareApplication(
    {
      actorUserId: input.actorUserId,
      applicationId: input.applicationId,
      approvedUnits: input.approvedUnits ?? undefined,
      decision: input.decision,
      effectiveDate: input.effectiveDate,
      reviewNotes: input.reviewNotes,
      tenantId: input.tenantId,
    },
    prisma
  )

  return toMobileShareApplication(application)
}

export async function addMobileAdminSupportReply(input: {
  actorUserId: string
  attachmentUrl?: string | null
  message: string
  supportCaseId: string
  tenantId: string
}): Promise<MobileSupportCase> {
  const prisma = requireMobileAdminPrisma("Support reply")

  await addSupportCaseMessage(
    {
      attachmentUrl: input.attachmentUrl,
      authorType: "staff",
      authorUserId: input.actorUserId,
      message: input.message,
      supportCaseId: input.supportCaseId,
      tenantId: input.tenantId,
    },
    prisma
  )

  return toMobileSupportCase(
    await getSupportCase(
      {
        supportCaseId: input.supportCaseId,
        tenantId: input.tenantId,
      },
      prisma
    )
  )
}

export async function updateMobileAdminSupportStatus(input: {
  actorUserId: string
  assignedToUserId?: string | null
  priority?: SupportCasePriority
  requiresFinancialAdjustment?: boolean
  resolutionSummary?: string | null
  status: SupportCaseStatus
  supportCaseId: string
  tenantId: string
}): Promise<MobileSupportCase> {
  const prisma = requireMobileAdminPrisma("Support status update")
  const supportCase = await updateSupportCaseStatus(
    {
      actorUserId: input.actorUserId,
      assignedToUserId: input.assignedToUserId,
      priority: input.priority,
      requiresFinancialAdjustment: input.requiresFinancialAdjustment,
      resolutionSummary: input.resolutionSummary,
      status: input.status,
      supportCaseId: input.supportCaseId,
      tenantId: input.tenantId,
    },
    prisma
  )

  return toMobileSupportCase(supportCase)
}

export async function recordMobileAdminCollectionFollowUp(input: {
  actorUserId: string
  assignedToUserId?: string
  caseStage?: string
  nextActionAt?: string
  note: string
  priority?: string
  promiseToPayAt?: string
  repaymentScheduleItemId: string
  resolutionStatus?: string
  status: "promise_to_pay" | "reminded" | "settled" | "unreachable"
  tenantId: string
}) {
  const prisma = requireMobileAdminPrisma("Collection follow-up")
  const followUp = await recordCollectionFollowUp(
    {
      actorUserId: input.actorUserId,
      assignedToUserId: input.assignedToUserId,
      caseStage: input.caseStage,
      nextActionAt: input.nextActionAt,
      note: input.note,
      priority: input.priority,
      promiseToPayAt: input.promiseToPayAt,
      repaymentScheduleItemId: input.repaymentScheduleItemId,
      resolutionStatus: input.resolutionStatus,
      status: input.status,
      tenantId: input.tenantId,
    },
    prisma
  )

  return {
    id: followUp.id,
    status: followUp.status,
  }
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

function buildReceiptStatementSection(input: {
  receipts: MemberPaymentReceiptRow[]
  summary: Awaited<ReturnType<typeof getMemberScopedPaymentReceiptSummary>>
}): MobileMemberStatementSection {
  const rows: MobileMemberSectionRow[] = [
    {
      detail: `${input.summary.submittedReceipts} submitted - ${input.summary.underReviewReceipts} under review`,
      format: "count",
      key: "receipt-pending-review",
      label: "Pending review",
      status:
        input.summary.pendingReviewReceipts > 0
          ? "Needs finance review"
          : "Clear",
      value: input.summary.pendingReviewReceipts,
    },
    {
      detail:
        input.summary.correctionRequestedReceipts > 0
          ? "Member needs clarification"
          : "No correction requested receipts",
      format: "count",
      key: "receipt-corrections",
      label: "Correction requested",
      status:
        input.summary.correctionRequestedReceipts > 0
          ? "Needs member response"
          : "Clear",
      value: input.summary.correctionRequestedReceipts,
    },
  ]

  for (const receipt of input.receipts.slice(0, 3)) {
    rows.push({
      detail: [
        receipt.paidAt ? `Paid ${formatDateLabel(receipt.paidAt)}` : null,
        receipt.submittedAt
          ? `Submitted ${formatDateLabel(receipt.submittedAt)}`
          : null,
        `${receipt.allocations.length} allocation${
          receipt.allocations.length === 1 ? "" : "s"
        }`,
      ]
        .filter(Boolean)
        .join(" - "),
      format: "currency",
      key: `receipt-${receipt.id}`,
      label: receipt.paymentReference
        ? `Receipt ${receipt.paymentReference}`
        : "Payment receipt",
      status: humanizeStatus(receipt.status),
      value: receipt.totalAmount,
    })
  }

  return {
    emptyState: "No payment receipt context is available.",
    key: "receipts",
    rows,
    subtitle:
      "Recent member-submitted proof of payment and finance review state.",
    title: "Receipts",
  }
}

function formatChargeWorkflowSource(charge: any) {
  if (charge.procurementRequest) {
    return `Procurement - ${charge.procurementRequest.itemName}`
  }

  if (charge.foodPurchaseApplication) {
    return "Foodstuff Purchase"
  }

  if (charge.projectFinancingRequest) {
    return `Project financing - ${charge.projectFinancingRequest.businessName}`
  }

  if (charge.loanRequest) {
    return "Financing request"
  }

  return (
    charge.chargeApplicability?.workflow?.replace(/_/g, " ") ?? "Manual charge"
  )
}

function buildChargesStatementSection(
  detail: NonNullable<Awaited<ReturnType<typeof getMemberStatementDetail>>>
): MobileMemberStatementSection {
  const pendingCharges = detail.chargeApplications.filter(
    (charge: any) => charge.status === "pending"
  )
  const rows: MobileMemberSectionRow[] = [
    {
      detail:
        pendingCharges.length > 0
          ? "Separately paid charges are waiting for payment evidence, waiver, or correction."
          : "No separately paid charges are pending.",
      format: "count",
      key: "pending-workflow-charges",
      label: "Pending separate charges",
      status: pendingCharges.length > 0 ? "Needs payment" : "Clear",
      value: pendingCharges.length,
    },
  ]

  for (const charge of detail.chargeApplications.slice(0, 6)) {
    rows.push({
      detail: [
        formatChargeWorkflowSource(charge),
        charge.assessedAt
          ? `Assessed ${formatDateLabel(charge.assessedAt)}`
          : null,
        humanizeStatus(charge.collectionMode),
      ]
        .filter(Boolean)
        .join(" - "),
      format: "currency",
      key: `charge-${charge.id}`,
      label: charge.chargeDefinition.name,
      status: humanizeStatus(charge.status),
      value: Number(charge.amount ?? 0),
    })
  }

  return {
    emptyState: "No charge applications are available.",
    key: "charges",
    rows,
    subtitle:
      "Workflow charges stay separate from financing, procurement, Foodstuff Purchase, and project principal amounts.",
    title: "Charges",
  }
}

function buildSupportStatementSection(input: {
  cases: SupportCaseRow[]
  summary: Awaited<ReturnType<typeof getMemberSupportCaseSummary>>
}): MobileMemberStatementSection {
  const rows: MobileMemberSectionRow[] = [
    {
      detail:
        input.summary.openCases > 0
          ? "Open member support cases need follow-up"
          : "No open support cases",
      format: "count",
      key: "support-open",
      label: "Open support",
      status: input.summary.openCases > 0 ? "Open" : "Clear",
      value: input.summary.openCases,
    },
    {
      detail:
        input.summary.highPriorityOpenCases > 0
          ? "High-priority support case active"
          : "No high-priority support cases",
      format: "count",
      key: "support-priority",
      label: "Priority support",
      status:
        input.summary.highPriorityOpenCases > 0 ? "Needs attention" : "Clear",
      value: input.summary.highPriorityOpenCases,
    },
  ]

  for (const supportCase of input.cases.slice(0, 3)) {
    const latestMessage = supportCase.messages.at(-1)?.message

    rows.push({
      detail: [
        latestMessage ?? supportCase.description,
        supportCase.updatedAt
          ? `Updated ${formatDateLabel(supportCase.updatedAt)}`
          : null,
        supportCase.requiresFinancialAdjustment
          ? `Finance adjustment ${humanizeStatus(
              supportCase.financialAdjustmentApprovalStatus
            )}`
          : null,
      ]
        .filter(Boolean)
        .join(" - "),
      format: null,
      key: `support-${supportCase.id}`,
      label: supportCase.subject,
      status: [
        humanizeStatus(supportCase.status),
        humanizeStatus(supportCase.priority),
      ]
        .filter(Boolean)
        .join(" - "),
      value: null,
    })
  }

  return {
    emptyState: "No support context is available.",
    key: "support",
    rows,
    subtitle:
      "Open account questions, payment issues, and money-impact review state.",
    title: "Support",
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
      buildChargesStatementSection(input.detail),
      buildDocumentStatementSection(input.detail),
      buildLedgerStatementSection(input.detail),
    ],
    stats: buildStatementStats(input.detail),
  }
}

function getMobileMemberHomeServices(input: {
  foodPurchaseRecords: number
  operationProfile: Awaited<ReturnType<typeof getTenantOperationProfile>> | null
  procurementRecords: number
  receiptRecords: number
  supportRecords: number
}) {
  const services: MobileMemberHome["services"] = [
    {
      icon: "BadgeCheck",
      key: "commitments",
      label: "Commitments",
      tone: "accent",
    },
    { icon: "Wallet", key: "savings", label: "Savings", tone: "success" },
    {
      icon: "HandCoins",
      key: "financing",
      label: "Financing",
      tone: "primary",
    },
    { icon: "PieChart", key: "shares", label: "Shares", tone: "accent" },
    {
      icon: "FileText",
      key: "statements",
      label: "Statements",
      tone: "primary",
    },
    {
      icon: "Bell",
      key: "notifications",
      label: "Notifications",
      tone: "accent",
    },
    { icon: "RefreshCw", key: "updates", label: "Updates", tone: "accent" },
    {
      icon: "BriefcaseBusiness",
      key: "projectFinancing",
      label: "Project Financing",
      tone: "primary",
    },
    {
      icon: "ShieldCheck",
      key: "guarantors",
      label: "Guarantor approvals",
      tone: "success",
    },
  ]

  if (!input.operationProfile) {
    services.push({
      icon: "Headphones",
      key: "support",
      label: "Support",
      tone: "primary",
    })

    return services
  }

  const { services: profileServices } = input.operationProfile

  if (
    profileServices.payment_receipts.shouldShowInMemberNav ||
    input.receiptRecords > 0
  ) {
    services.push({
      icon: "ReceiptText",
      key: "receipts",
      label: "Receipts",
      tone: "primary",
    })
  }

  if (
    profileServices.procurement.shouldShowInMemberNav ||
    input.procurementRecords > 0
  ) {
    services.push({
      icon: "PackageSearch",
      key: "procurement",
      label: "Procurement",
      tone: "accent",
    })
  }

  if (
    profileServices.food_purchase.shouldShowInMemberNav ||
    input.foodPurchaseRecords > 0
  ) {
    services.push({
      icon: "ShoppingBasket",
      key: "foodPurchase",
      label: "Foodstuff Purchase",
      tone: "success",
    })
  }

  if (
    profileServices.support_cases.shouldShowInMemberNav ||
    input.supportRecords > 0
  ) {
    services.push({
      icon: "Headphones",
      key: "support",
      label: "Support",
      tone: "primary",
    })
  }

  return services
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
  const [
    operationProfile,
    receipts,
    procurementRequests,
    foodPurchaseApplications,
    supportCases,
    shareBalances,
  ] = await Promise.all([
    getTenantOperationProfile(input.tenantId, prisma),
    listMemberPaymentReceipts(
      input.tenantId,
      { limit: 1, memberId: member.id },
      prisma
    ),
    listProcurementRequests(
      { limit: 1, memberId: member.id, tenantId: input.tenantId },
      prisma
    ),
    listFoodPurchaseApplications(
      { limit: 1, memberId: member.id, tenantId: input.tenantId },
      prisma
    ),
    listSupportCases(
      { limit: 1, memberId: member.id, tenantId: input.tenantId },
      prisma
    ),
    getMemberShareBalancesAtDate(input.tenantId, new Date(), prisma),
  ])
  const shareCapital =
    shareBalances.find((balance) => balance.memberId === member.id)
      ?.shareBalance ?? 0
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
    services: getMobileMemberHomeServices({
      foodPurchaseRecords: foodPurchaseApplications.length,
      operationProfile,
      procurementRecords: procurementRequests.length,
      receiptRecords: receipts.length,
      supportRecords: supportCases.length,
    }),
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
        label: "Savings total",
        value: summary?.totalSavingsSnapshot ?? 0,
      },
      {
        detail:
          (summary?.totalExtraSavingsContributions ?? 0) > 0
            ? "Voluntary savings posted"
            : "No special savings posted",
        format: "currency",
        key: "special-savings",
        label: "Special savings",
        value: summary?.totalExtraSavingsContributions ?? 0,
      },
      {
        detail:
          (summary?.activeLoanCount ?? 0) > 0
            ? `${summary?.activeLoanCount ?? 0} active financing record(s)`
            : "No active financing",
        format: "currency",
        key: "financing",
        label: "Financing exposure",
        value: summary?.totalOutstandingPrincipal ?? 0,
      },
      {
        detail:
          shareCapital > 0
            ? "Ledger balance as of today"
            : "No share capital posted",
        format: "currency",
        key: "share-capital",
        label: "Share capital",
        value: shareCapital,
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
  const prisma = createPrismaClient()
  const [summary, supportCases] = await Promise.all([
    getOverviewSummary(tenantId, prisma ?? undefined),
    prisma
      ? listSupportCases(
          {
            limit: 8,
            tenantId,
          },
          prisma
        )
      : [],
  ])
  const topQueue = summary.actionQueue
    .filter((item) => item.count > 0)
    .slice(0, 8)
  const openSupportCases = supportCases
    .filter((supportCase) =>
      ["open", "in_progress", "waiting_on_member"].includes(supportCase.status)
    )
    .slice(0, 3)

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
    supportCases: openSupportCases.map(toMobileSupportCase),
    warnings: summary.setupWarnings.map((item) => ({
      key: item.key,
      label: item.label,
    })),
  }
}

export async function getMobileAdminMembers(input: {
  kycStatus?: MobileAdminMemberKycStatus
  page?: number
  pageSize?: number
  search?: string
  status?: MobileAdminMemberStatus
  tenantId: string
}): Promise<MobileAdminMembers> {
  const prisma = createPrismaClient()

  if (!prisma) {
    return emptyAdminMembers(input)
  }

  const page = input.page ?? 1
  const pageSize = input.pageSize ?? 25
  const [result, overview, onboardingRequests] = await Promise.all([
    listMembers(
      input.tenantId,
      {
        kycStatus: input.kycStatus,
        page,
        pageSize,
        search: input.search,
        status: input.status,
      },
      prisma
    ),
    getOverviewSummary(input.tenantId, prisma),
    listMemberOnboardingRequests(
      input.tenantId,
      {
        pageSize: 3,
        status: "pending_approval",
      },
      prisma
    ),
  ])
  const members = result.items.map(toMobileAdminMemberRow)

  return {
    generatedAt: new Date().toISOString(),
    members,
    onboardingRequests: onboardingRequests.items.map(
      toMobileAdminMemberOnboardingRequest
    ),
    page: result.page,
    pageSize: result.pageSize,
    reviewQueues: overview.actionQueue
      .map(toMobileAdminMemberReviewQueue)
      .filter((item): item is MobileAdminMemberReviewQueue => Boolean(item)),
    summary: summarizeMobileAdminMembers({
      members,
      total: result.total,
    }),
    total: result.total,
  }
}

export async function getMobileAdminMemberDetail(input: {
  memberId: string
  tenantId: string
}): Promise<MobileAdminMemberDetail> {
  const prisma = createPrismaClient()

  if (!prisma) {
    return emptyAdminMemberDetail(
      "Database is not configured for this mobile session."
    )
  }

  const detail = await getMemberStatementDetail(
    input.tenantId,
    input.memberId,
    prisma
  )

  if (!detail) {
    return emptyAdminMemberDetail()
  }

  const commitmentSection = buildCommitmentSection(detail)
  const financingSection = buildFinancingSection(detail)
  const [
    sharesSection,
    receiptSummary,
    receipts,
    supportSummary,
    supportCases,
  ] = await Promise.all([
    buildSharesSection(
      {
        detail,
        memberId: detail.member.id,
        tenantId: input.tenantId,
      },
      prisma
    ),
    getMemberScopedPaymentReceiptSummary(
      {
        memberId: detail.member.id,
        tenantId: input.tenantId,
      },
      prisma
    ),
    listMemberPaymentReceipts(
      input.tenantId,
      {
        limit: 3,
        memberId: detail.member.id,
      },
      prisma
    ),
    getMemberSupportCaseSummary(
      {
        memberId: detail.member.id,
        tenantId: input.tenantId,
      },
      prisma
    ),
    listSupportCases(
      {
        limit: 3,
        memberId: detail.member.id,
        tenantId: input.tenantId,
      },
      prisma
    ),
  ])

  return {
    generatedAt: new Date().toISOString(),
    member: {
      deductionSourceName: detail.member.deductionSource?.name ?? null,
      email: detail.member.email ?? null,
      exitedAt: detail.member.exitedAt
        ? detail.member.exitedAt.toISOString()
        : null,
      fullName: detail.member.fullName,
      id: detail.member.id,
      joinedAt: detail.member.joinedAt.toISOString(),
      kycStatus: detail.member.kycStatus,
      linkedUserEmail: detail.member.user?.email ?? null,
      linkedUserName: detail.member.user?.fullName ?? null,
      memberNumber: detail.member.memberNumber,
      memberType: detail.member.memberType,
      phoneNumber: detail.member.phoneNumber ?? null,
      status: detail.member.status,
    },
    sections: [
      buildProfileStatementSection(detail),
      toStatementSection(commitmentSection),
      toStatementSection(financingSection),
      toStatementSection(sharesSection),
      buildReceiptStatementSection({
        receipts,
        summary: receiptSummary,
      }),
      buildChargesStatementSection(detail),
      buildSupportStatementSection({
        cases: supportCases,
        summary: supportSummary,
      }),
      buildDocumentStatementSection(detail),
      buildLedgerStatementSection(detail),
    ],
    stats: buildStatementStats(detail),
  }
}

export async function getMobileAdminFinance(
  tenantId: string
): Promise<MobileAdminFinance> {
  const prisma = createPrismaClient()

  if (!prisma) {
    return emptyAdminFinance()
  }

  const [
    overview,
    loanRequests,
    procurementRequests,
    projectRequests,
    foodApplications,
    receipts,
    shareApplications,
    collectionFollowUps,
  ] = await Promise.all([
    getOverviewSummary(tenantId),
    listLoanRequests(tenantId, prisma),
    listProcurementRequests(
      {
        limit: 8,
        tenantId,
      },
      prisma
    ),
    listProjectFinancingRequests(
      {
        limit: 8,
        tenantId,
      },
      prisma
    ),
    listFoodPurchaseApplications(
      {
        limit: 8,
        tenantId,
      },
      prisma
    ),
    listMemberPaymentReceipts(
      tenantId,
      {
        limit: 8,
      },
      prisma
    ),
    listMemberShareApplications(
      {
        status: "pending",
        tenantId,
      },
      prisma
    ),
    listCollectionFollowUps(
      tenantId,
      {
        limit: 5,
        resolutionStatus: "open",
      },
      prisma
    ),
  ])
  const queues = overview.actionQueue
    .map(toMobileAdminFinanceQueue)
    .filter((item): item is MobileAdminFinanceQueue => Boolean(item))
  const pendingStatuses = ["submitted", "under_review"]
  const recentItems = [
    ...loanRequests
      .filter((request) => pendingStatuses.includes(request.status))
      .slice(0, 4)
      .map(loanRequestToFinanceItem),
    ...procurementRequests
      .filter((request) => pendingStatuses.includes(request.status))
      .map(procurementToFinanceItem),
    ...projectRequests
      .filter((request) => pendingStatuses.includes(request.status))
      .map(projectFinancingToFinanceItem),
    ...foodApplications
      .filter((application) => pendingStatuses.includes(application.status))
      .map(foodPurchaseToFinanceItem),
    ...receipts
      .filter((receipt) => pendingStatuses.includes(receipt.status))
      .map(receiptToFinanceItem),
    ...shareApplications.slice(0, 8).map(shareApplicationToFinanceItem),
  ]
    .sort((left, right) => right.requestedAt.localeCompare(left.requestedAt))
    .slice(0, 12)

  return {
    collectionFollowUps: collectionFollowUps.map(
      toMobileAdminCollectionFollowUp
    ),
    generatedAt: overview.workspace.generatedAt,
    queues,
    recentItems,
    stats: [
      {
        detail: "Finance review queues",
        format: "count",
        key: "finance-queues",
        label: "Open queues",
        value: queues.reduce((total, queue) => total + queue.count, 0),
      },
      {
        detail: "After reserve and commitments",
        format: "currency",
        key: "deployable-funds",
        label: "Deployable funds",
        value: overview.primaryMetrics.deployableFunds,
      },
      {
        detail: overview.contributionHealth.periodLabel,
        format: "percent",
        key: "collection-coverage",
        label: "Collections",
        value: overview.primaryMetrics.collectionCoverage,
      },
    ],
  }
}

export async function getMobileAdminReports(
  tenantId: string
): Promise<MobileAdminReports> {
  const prisma = createPrismaClient()

  if (!prisma) {
    return emptyAdminReports()
  }

  const [overview, metrics, activityEvents, collectionFollowUps] =
    await Promise.all([
      getOverviewSummary(tenantId, prisma),
      getDashboardMetrics(tenantId, prisma),
      listActivityReportEvents(
        tenantId,
        {
          limit: 8,
        },
        prisma
      ),
      listCollectionFollowUps(
        tenantId,
        {
          limit: 8,
        },
        prisma
      ),
    ])
  const reports = buildMobileAdminReportCards(metrics, overview)

  return {
    activityEvents: activityEvents.map(toMobileAdminActivityEvent),
    collectionFollowUps: collectionFollowUps.map(
      toMobileAdminCollectionFollowUp
    ),
    generatedAt: overview.workspace.generatedAt,
    reports,
    stats: [
      {
        detail: "Mobile-safe report previews",
        format: "count",
        key: "report-count",
        label: "Reports",
        value: reports.length,
      },
      {
        detail: "Active members in this workspace",
        format: "count",
        key: "active-members",
        label: "Active members",
        value: metrics.activeMemberCount,
      },
      {
        detail: "Open operational queue items",
        format: "count",
        key: "action-queue",
        label: "Action queue",
        value: overview.primaryMetrics.actionQueueTotal,
      },
    ],
  }
}

export async function getMobileAdminAccess(
  tenantId: string
): Promise<MobileAdminAccess> {
  const users = (await listTenantUsersWithMemberships(tenantId)).map((user) =>
    toMobileAdminAccessUser(tenantId, user)
  )

  return {
    generatedAt: new Date().toISOString(),
    roles: buildMobileAdminAccessRoles(users),
    summary: summarizeMobileAdminAccess(users),
    users,
  }
}

export async function getMobileNotifications(input: {
  role: MembershipRole
  tenantId: string
  userEmail: string
}): Promise<MobileNotifications> {
  const normalizedEmail = input.userEmail.trim().toLowerCase()
  const [deliveryLogs, preferences] = await Promise.all([
    listAuditLogs(input.tenantId, {
      action: "notification.email",
      limit: 100,
    }),
    listNotificationPreferences(input.tenantId),
  ])
  const deliveries = deliveryLogs
    .filter(
      (log) =>
        getMobileMetadataString(log.metadata, "recipient")
          ?.trim()
          .toLowerCase() === normalizedEmail
    )
    .map(toMobileNotificationDelivery)
    .slice(0, 25)
  const visiblePreferences = preferences
    .filter(
      (preference) => preference.role === null || preference.role === input.role
    )
    .map((preference) => ({
      channel: preference.channel,
      enabled: preference.enabled,
      notificationType: preference.notificationType,
      role: (preference.role ?? "all") as MembershipRole | "all",
    }))

  return {
    deliveries,
    generatedAt: new Date().toISOString(),
    preferences: visiblePreferences,
    summary: summarizeMobileNotifications(deliveries, visiblePreferences),
  }
}
