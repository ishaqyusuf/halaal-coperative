// Plain names for each email the cooperative sends, keyed by notification type.
const emailLabels: Record<string, string> = {
  "auth.password_recovery_requested": "Password reset link",
  "charge.applied": "A charge was added",
  "charge.reversed": "A charge was reversed",
  "charge.settled": "A charge was paid",
  "charge.waived": "A charge was waived",
  "collections.follow_up_recorded": "Late payment follow-up",
  "contribution.plan_changed": "Monthly payment changed",
  "contribution.recorded": "Payment received",
  "domain.verification_changed": "Web address status changed",
  "domain.verification_checked": "Web address checked",
  "food_purchase.accounting_status_changed": "Food purchase account update",
  "food_purchase.application_status_changed": "Food purchase request update",
  "import.completed": "Import finished",
  "import.failed": "Import failed",
  "loan.disbursed": "Loan paid out",
  "loan.guarantor_approval_recorded": "Guarantor answered",
  "loan.guarantor_approval_requested": "Asked to be a guarantor",
  "loan.request_status_changed": "Loan request update",
  "loan.request_submitted": "Loan request sent",
  "marketing.early_access_approved": "Early access approved",
  "marketing.early_access_requested": "Early access requested",
  "member.kyc_updated": "Member check updated",
  "member.onboarding_approved": "Membership approved",
  "member.onboarding_rejected": "Membership not approved",
  "member.onboarding_verification_requested": "Confirm your email to join",
  "member.status_changed": "Member status changed",
  "member_payment_receipt.status_changed": "Payment receipt update",
  "member_share_application.status_changed": "Share request update",
  "migration.backfill_applied": "Past records added",
  "migration.backfill_initialized": "Adding past records started",
  "monthly_record.generated": "Monthly record created",
  "monthly_record.member_applied": "Monthly payment recorded",
  "monthly_record.member_cancelled": "Monthly payment cancelled",
  "monthly_record.workplace_received": "Workplace payment received",
  "procurement.request_status_changed": "Item request update",
  "project_financing.request_status_changed": "Business funding update",
  "repayment.posted": "Loan repayment received",
  "share.profit_published": "Profit shared",
  signup_email_verification: "Confirm your email",
  "support.case_created": "Help request opened",
  "support.case_status_updated": "Help request update",
  "support.message_added": "New reply on a help request",
  "workspace.invitation": "Invitation to the cooperative",
  "workspace.ready": "Cooperative is ready",
}

/** "contribution.recorded" → "Payment received"; unknown types read as words. */
export function getEmailLabel(notificationType: string) {
  const label = emailLabels[notificationType]

  if (label) return label

  const words = notificationType
    .replace(/^notification\./, "")
    .replace(/[._]+/g, " ")
    .trim()

  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Email"
}

export const emailStatusWords = {
  failed: "Not delivered",
  queued: "Waiting to send",
  sent: "Sent",
} as const

export type EmailDeliveryStatus = keyof typeof emailStatusWords
