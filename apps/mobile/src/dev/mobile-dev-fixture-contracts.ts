/**
 * Development-fixture-only contracts.
 *
 * Production feature code owns its public contracts. This module keeps the
 * mutable fixture store isolated from production adapters while the fixtures
 * preserve representative legacy rows used by visual and interaction QA.
 */
import type {
  AdminAccess,
  AdminAccessInviteInput,
  AdminReports,
} from "@/features/admin-reports-access/model/admin-reports-access-types"
import type { MobileAdminActionResult } from "@/features/admin-member-lifecycle/model/admin-member-lifecycle-types"
import type {
  MobileFinancingRequest,
  MobileFinancingRequestInput,
  MobileMemberFinancing,
} from "@/features/financing/model/member-financing-types"
import type {
  MobileGuarantorRequest,
  MobileGuarantorResponseInput,
  MobileMemberGuarantorSnapshot,
} from "@/features/guarantors/model/member-guarantor-types"
import type {
  MobileMemberSection,
  MobileMemberSectionKey,
  MobileMemberStatementSection,
} from "@/features/member-core/public/member-core-types"
import type {
  MobileMemberReceipts as MobileMemberReceiptsContract,
  MobilePaymentReceipt as MobilePaymentReceiptContract,
  MobileReceiptCreateInput,
} from "@/features/receipts/model/member-receipt-types"
import type { MobileMemberMore } from "@/features/settings-access/model/member-more-types"
import type { MobileMemberSupport as MobileMemberSupportContract } from "@/features/support/model/member-support-types"

export type MobileAdminAccess = AdminAccess
export type MobileAdminAccessInviteInput = AdminAccessInviteInput
export type { MobileAdminActionResult }
export type MobileAdminReports = AdminReports
export type { MobileMemberFinancing }
export type MobileMemberFinancingRequest = MobileFinancingRequest
export type MobileFinancingRequestCreateInput = MobileFinancingRequestInput
export type MobileMemberGuarantorApproval = MobileGuarantorRequest
export type MobileMemberGuarantorApprovals = Omit<
  MobileMemberGuarantorSnapshot,
  "state"
>
export type MobileGuarantorApprovalRespondInput = Omit<
  MobileGuarantorResponseInput,
  "decisionConfirmed"
>
export type { MobileMemberMore }
export type {
  MobileMemberSection,
  MobileMemberSectionKey,
  MobileMemberStatementSection,
}
export type { MobileReceiptCreateInput }

type FixtureReceiptAllocation = Omit<
  MobilePaymentReceiptContract["allocations"][number],
  | "contributionPlanId"
  | "foodPurchaseApplicationId"
  | "loanId"
  | "projectFinancingRequestId"
  | "procurementRepaymentScheduleItemId"
>

export type MobilePaymentReceipt = Omit<
  MobilePaymentReceiptContract,
  "allocations" | "reviewedAt"
> & {
  allocations: FixtureReceiptAllocation[]
  reviewedAt?: string | null
}

export type MobileMemberReceipts = Omit<
  MobileMemberReceiptsContract,
  "canCreateSupportCase" | "categories" | "nextCursor" | "receipts" | "state"
> & {
  receipts: MobilePaymentReceipt[]
}

export type MobileMemberSupport = Omit<
  MobileMemberSupportContract,
  "canCreateCase" | "nextCursor" | "state"
>

export type MobileAdminCollectionFollowUpInput = {
  assignedToUserId?: string
  caseStage?: string
  nextActionAt?: string
  note: string
  priority?: "low" | "normal" | "high" | "urgent"
  promiseToPayAt?: string
  repaymentScheduleItemId: string
  resolutionStatus?: string
  status: "promise_to_pay" | "reminded" | "settled" | "unreachable"
}

export type MobileAdminSupportReplyInput = MobileSupportReplyInput

export type MobileAdminSupportStatusUpdateInput = {
  assignedToUserId?: string
  priority?: "low" | "normal" | "high" | "urgent"
  requiresFinancialAdjustment?: boolean
  resolutionSummary?: string
  status: "open" | "in_progress" | "waiting_on_member" | "resolved" | "closed"
  supportCaseId: string
}

export type MobileSupportReplyInput = {
  attachmentUrl?: string
  message: string
  supportCaseId: string
}

export type MobileAdminFinance = {
  collectionFollowUps: AdminReports["collectionFollowUps"]
  generatedAt: string
  queues: Array<{
    count: number
    detail: string
    key: string
    label: string
    severity: "neutral" | "warning" | "critical"
  }>
  recentItems: Array<{
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
  }>
  stats: Array<{
    detail: string
    format: "currency" | "percent" | "count"
    key: string
    label: string
    value: number
  }>
}

export type MobileNotifications = {
  deliveries: Array<{
    action:
      | "open_notifications"
      | "open_receipts"
      | "open_financing"
      | "open_food_purchase"
      | "open_guarantors"
      | "open_procurement"
      | "open_project_financing"
      | "open_support"
      | "open_reports"
      | "open_security"
      | "open_updates"
    entityId: string | null
    errorMessage: string | null
    id: string
    intendedRole:
      | "super_admin"
      | "tenant_admin"
      | "finance_officer"
      | "operations_officer"
      | "member"
    notificationType: string
    occurredAt: string
    recipient: string
    safeSummary: string
    safeTitle: string
    source: string | null
    status: "failed" | "queued" | "sent" | "suppressed" | "unknown"
  }>
  generatedAt: string
  preferences: Array<{
    available: boolean
    channel: "push"
    description: string
    enabled: boolean
    key: "security" | "transactions" | "financing" | "cooperative" | "support"
    mandatory: boolean
    title: string
  }>
  pushRegistration: {
    lastValidatedAt: string
    permissionStatus: string
    status: string
  } | null
  summary: {
    enabledPreferences: number
    failed: number
    queued: number
    sent: number
    totalDeliveries: number
  }
}
