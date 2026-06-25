import type { z } from "zod"
import { createNotificationInputFromType } from "../notification-types"
import type { NotificationEmailDraft, NotificationRecipient } from "../core-types"
import {
  chargeApplied,
  chargeReversed,
  chargeWaived,
  collectionsFollowUpRecorded,
  contributionPlanChanged,
  contributionRecorded,
  loanDisbursed,
  loanRequestStatusChanged,
  loanRequestSubmitted,
  monthlyRecordGenerated,
  monthlyRecordMemberApplied,
  monthlyRecordMemberCancelled,
  repaymentPosted,
  shareProfitPublished,
} from "./finance"
import {
  memberKycUpdated,
  memberOnboardingApproved,
  memberOnboardingRejected,
  memberOnboardingVerificationRequested,
  memberStatusChanged,
} from "./member"
import {
  signupEmailVerification,
  workspaceInvitation,
  workspaceReady,
} from "./onboarding"
import {
  domainVerificationChanged,
  domainVerificationChecked,
  importCompleted,
  importFailed,
  migrationBackfillApplied,
  migrationBackfillInitialized,
} from "./operations"
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
  "import.completed": importCompleted,
  "import.failed": importFailed,
  "loan.disbursed": loanDisbursed,
  "loan.request_status_changed": loanRequestStatusChanged,
  "loan.request_submitted": loanRequestSubmitted,
  "member.kyc_updated": memberKycUpdated,
  "member.onboarding_approved": memberOnboardingApproved,
  "member.onboarding_rejected": memberOnboardingRejected,
  "member.onboarding_verification_requested": memberOnboardingVerificationRequested,
  "member.status_changed": memberStatusChanged,
  "migration.backfill_applied": migrationBackfillApplied,
  "migration.backfill_initialized": migrationBackfillInitialized,
  "monthly_record.generated": monthlyRecordGenerated,
  "monthly_record.member_applied": monthlyRecordMemberApplied,
  "monthly_record.member_cancelled": monthlyRecordMemberCancelled,
  "repayment.posted": repaymentPosted,
  "share.profit_published": shareProfitPublished,
  signup_email_verification: signupEmailVerification,
  workspace_invitation: workspaceInvitation,
  workspace_ready: workspaceReady,
} as const

export type HalaalVestNotificationType =
  keyof typeof halaalVestNotificationTypes & string

export type HalaalVestNotificationPayload<TType extends HalaalVestNotificationType> =
  z.infer<(typeof halaalVestNotificationTypes)[TType]["schema"]>

export const halaalVestNotificationTypeList = Object.keys(
  halaalVestNotificationTypes,
) as HalaalVestNotificationType[]

export function createHalaalVestNotificationFromType<
  TType extends HalaalVestNotificationType,
>(type: TType, payload: HalaalVestNotificationPayload<TType>) {
  return createNotificationInputFromType(halaalVestNotificationTypes, type, payload)
}

export function createEmailDraftFromType<TType extends HalaalVestNotificationType>(
  type: TType,
  payload: HalaalVestNotificationPayload<TType>,
  recipientOverride?: NotificationRecipient,
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
export * from "./member"
export * from "./onboarding"
export * from "./operations"
export * from "./shared"
