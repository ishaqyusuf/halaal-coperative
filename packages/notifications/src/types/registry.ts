import type { z } from "zod"
import { createNotificationInputFromType } from "../notification-types"
import type {
  NotificationEmailDraft,
  NotificationRecipient,
} from "../core-types"
import {
  chargeApplied,
  chargeReversed,
  chargeWaived,
  collectionsFollowUpRecorded,
  contributionPlanChanged,
  contributionRecorded,
  loanDisbursed,
  loanGuarantorApprovalRequested,
  loanRequestStatusChanged,
  loanRequestSubmitted,
  monthlyRecordGenerated,
  monthlyRecordMemberApplied,
  monthlyRecordMemberCancelled,
  repaymentPosted,
  shareProfitPublished,
} from "./finance"
import {
  foodPurchaseAccountingStatusChanged,
  foodPurchaseApplicationStatusChanged,
} from "./food-purchase"
import {
  memberKycUpdated,
  memberOnboardingApproved,
  memberOnboardingRejected,
  memberOnboardingVerificationRequested,
  memberStatusChanged,
} from "./member"
import {
  marketingEarlyAccessApproved,
  marketingEarlyAccessRequest,
  signupEmailVerification,
  workspaceInvitation,
  workspaceReady,
} from "./onboarding"
import { memberPaymentReceiptStatusChanged } from "./payment-receipts"
import { projectFinancingRequestStatusChanged } from "./project-financing"
import { procurementRequestStatusChanged } from "./procurement"
import { memberShareApplicationStatusChanged } from "./share-applications"
import {
  domainVerificationChanged,
  domainVerificationChecked,
  importCompleted,
  importFailed,
  migrationBackfillApplied,
  migrationBackfillInitialized,
} from "./operations"
import {
  supportCaseCreated,
  supportCaseStatusUpdated,
  supportMessageAdded,
} from "./support"
import {
  createNotificationEmailDraft,
  type HalaalVestNotificationDefinition,
} from "./shared"

export const halaalVestNotificationTypes = {
  "charge.applied": chargeApplied,
  "charge.reversed": chargeReversed,
  "charge.waived": chargeWaived,
  "collections.follow_up_recorded": collectionsFollowUpRecorded,
  "contribution.plan_changed": contributionPlanChanged,
  "contribution.recorded": contributionRecorded,
  "domain.verification_changed": domainVerificationChanged,
  "domain.verification_checked": domainVerificationChecked,
  "food_purchase.application_status_changed":
    foodPurchaseApplicationStatusChanged,
  "food_purchase.accounting_status_changed":
    foodPurchaseAccountingStatusChanged,
  "import.completed": importCompleted,
  "import.failed": importFailed,
  "loan.disbursed": loanDisbursed,
  "loan.guarantor_approval_requested": loanGuarantorApprovalRequested,
  "loan.request_status_changed": loanRequestStatusChanged,
  "loan.request_submitted": loanRequestSubmitted,
  "member.kyc_updated": memberKycUpdated,
  "member.onboarding_approved": memberOnboardingApproved,
  "member.onboarding_rejected": memberOnboardingRejected,
  "member.onboarding_verification_requested":
    memberOnboardingVerificationRequested,
  "member.status_changed": memberStatusChanged,
  "marketing.early_access_approved": marketingEarlyAccessApproved,
  "marketing.early_access_requested": marketingEarlyAccessRequest,
  "member_share_application.status_changed":
    memberShareApplicationStatusChanged,
  "member_payment_receipt.status_changed": memberPaymentReceiptStatusChanged,
  "migration.backfill_applied": migrationBackfillApplied,
  "migration.backfill_initialized": migrationBackfillInitialized,
  "monthly_record.generated": monthlyRecordGenerated,
  "monthly_record.member_applied": monthlyRecordMemberApplied,
  "monthly_record.member_cancelled": monthlyRecordMemberCancelled,
  "project_financing.request_status_changed":
    projectFinancingRequestStatusChanged,
  "procurement.request_status_changed": procurementRequestStatusChanged,
  "repayment.posted": repaymentPosted,
  "share.profit_published": shareProfitPublished,
  "support.case_created": supportCaseCreated,
  "support.case_status_updated": supportCaseStatusUpdated,
  "support.message_added": supportMessageAdded,
  signup_email_verification: signupEmailVerification,
  workspace_invitation: workspaceInvitation,
  workspace_ready: workspaceReady,
} as const

export type HalaalVestNotificationType =
  keyof typeof halaalVestNotificationTypes & string

export type HalaalVestNotificationPayload<
  TType extends HalaalVestNotificationType,
> = z.infer<(typeof halaalVestNotificationTypes)[TType]["schema"]>

export const halaalVestNotificationTypeList = Object.keys(
  halaalVestNotificationTypes
) as HalaalVestNotificationType[]

export function createHalaalVestNotificationFromType<
  TType extends HalaalVestNotificationType,
>(type: TType, payload: HalaalVestNotificationPayload<TType>) {
  return createNotificationInputFromType(
    halaalVestNotificationTypes,
    type,
    payload
  )
}

export function createEmailDraftFromType<
  TType extends HalaalVestNotificationType,
>(
  type: TType,
  payload: HalaalVestNotificationPayload<TType>,
  recipientOverride?: NotificationRecipient
): NotificationEmailDraft {
  const definition = halaalVestNotificationTypes[
    type
  ] as HalaalVestNotificationDefinition
  const parsed = definition.schema.parse(payload)
  const template = definition.buildEmailDraft(parsed)

  if (!template && !recipientOverride) {
    throw new Error(`Notification type ${type} does not define an email draft.`)
  }

  const recipient = recipientOverride ?? template?.recipient

  if (!recipient || recipient.kind !== "email") {
    throw new Error(`Notification type ${type} requires an email recipient.`)
  }

  const bodyText = template?.bodyText ?? definition.buildBody(parsed)
  const actionLabel = template?.actionLabel ?? "Open dashboard"
  const actionUrl = template?.actionUrl ?? definition.buildLink(parsed) ?? "/"
  const subject = template?.subject ?? "Notification"
  const previewText = template?.previewText ?? bodyText

  return createNotificationEmailDraft({
    actionLabel,
    actionUrl,
    bodyText,
    eventLabel: type,
    notificationType: type,
    previewText,
    recipient,
    subject,
  })
}

export function getDefaultNotificationRoles(type: HalaalVestNotificationType) {
  return [...(halaalVestNotificationTypes[type].defaultRoles ?? [])]
}

export * from "./finance"
export * from "./food-purchase"
export * from "./member"
export * from "./onboarding"
export * from "./operations"
export * from "./payment-receipts"
export * from "./project-financing"
export * from "./procurement"
export * from "./share-applications"
export * from "./support"
export * from "./shared"
