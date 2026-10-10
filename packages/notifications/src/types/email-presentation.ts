export type NotificationEmailPresentation = {
  amountLabel?: string
  eyebrow: string
  familyLabel: string
}

export const notificationEmailPresentationByType = {
  "charge.applied": {
    amountLabel: "Charge amount",
    eyebrow: "Charge record",
    familyLabel: "Cooperative finance",
  },
  "charge.reversed": {
    amountLabel: "Reversed amount",
    eyebrow: "Charge reversal",
    familyLabel: "Cooperative finance",
  },
  "charge.waived": {
    amountLabel: "Waived amount",
    eyebrow: "Charge waiver",
    familyLabel: "Cooperative finance",
  },
  "collections.follow_up_recorded": {
    amountLabel: "Follow-up amount",
    eyebrow: "Collections record",
    familyLabel: "Cooperative finance",
  },
  "contribution.plan_changed": {
    amountLabel: "Contribution amount",
    eyebrow: "Contribution plan",
    familyLabel: "Member contributions",
  },
  "contribution.recorded": {
    amountLabel: "Recorded contribution",
    eyebrow: "Contribution record",
    familyLabel: "Member contributions",
  },
  "domain.verification_changed": {
    eyebrow: "Domain status",
    familyLabel: "Workspace operations",
  },
  "domain.verification_checked": {
    eyebrow: "Domain verification",
    familyLabel: "Workspace operations",
  },
  "food_purchase.application_status_changed": {
    amountLabel: "Purchase amount",
    eyebrow: "Food purchase request",
    familyLabel: "Member purchase",
  },
  "food_purchase.accounting_status_changed": {
    amountLabel: "Recorded amount",
    eyebrow: "Food purchase accounting",
    familyLabel: "Member purchase",
  },
  "import.completed": {
    eyebrow: "Import record",
    familyLabel: "Workspace operations",
  },
  "import.failed": {
    eyebrow: "Import record",
    familyLabel: "Workspace operations",
  },
  "loan.disbursed": {
    amountLabel: "Disbursed amount",
    eyebrow: "Financing disbursement",
    familyLabel: "Member financing",
  },
  "loan.guarantor_approval_requested": {
    amountLabel: "Financing amount",
    eyebrow: "Guarantor request",
    familyLabel: "Member financing",
  },
  "loan.request_status_changed": {
    amountLabel: "Financing amount",
    eyebrow: "Financing decision",
    familyLabel: "Member financing",
  },
  "loan.request_submitted": {
    amountLabel: "Requested amount",
    eyebrow: "Financing request",
    familyLabel: "Member financing",
  },
  "member.kyc_updated": {
    eyebrow: "Member verification",
    familyLabel: "Member records",
  },
  "member.onboarding_approved": {
    eyebrow: "Membership decision",
    familyLabel: "Member records",
  },
  "member.onboarding_rejected": {
    eyebrow: "Membership decision",
    familyLabel: "Member records",
  },
  "member.onboarding_verification_requested": {
    eyebrow: "Membership verification",
    familyLabel: "Member records",
  },
  "member.status_changed": {
    eyebrow: "Member status",
    familyLabel: "Member records",
  },
  "marketing.early_access_approved": {
    eyebrow: "Early access",
    familyLabel: "Halaalvest access",
  },
  "marketing.early_access_requested": {
    eyebrow: "Early access request",
    familyLabel: "Halaalvest access",
  },
  "member_share_application.status_changed": {
    amountLabel: "Share amount",
    eyebrow: "Share application",
    familyLabel: "Member shares",
  },
  "member_payment_receipt.status_changed": {
    amountLabel: "Receipt amount",
    eyebrow: "Payment receipt",
    familyLabel: "Member payments",
  },
  "migration.backfill_applied": {
    eyebrow: "Migration record",
    familyLabel: "Workspace operations",
  },
  "migration.backfill_initialized": {
    eyebrow: "Migration record",
    familyLabel: "Workspace operations",
  },
  "monthly_record.generated": {
    amountLabel: "Recorded amount",
    eyebrow: "Monthly record",
    familyLabel: "Cooperative finance",
  },
  "monthly_record.member_applied": {
    amountLabel: "Applied amount",
    eyebrow: "Monthly member record",
    familyLabel: "Cooperative finance",
  },
  "monthly_record.member_cancelled": {
    amountLabel: "Cancelled amount",
    eyebrow: "Monthly member record",
    familyLabel: "Cooperative finance",
  },
  "project_financing.request_status_changed": {
    amountLabel: "Financing amount",
    eyebrow: "Project financing",
    familyLabel: "Member financing",
  },
  "procurement.request_status_changed": {
    amountLabel: "Procurement amount",
    eyebrow: "Procurement request",
    familyLabel: "Cooperative procurement",
  },
  "repayment.posted": {
    amountLabel: "Repayment amount",
    eyebrow: "Repayment record",
    familyLabel: "Member financing",
  },
  "share.profit_published": {
    amountLabel: "Published amount",
    eyebrow: "Share profit record",
    familyLabel: "Member shares",
  },
  "support.case_created": {
    eyebrow: "Support case",
    familyLabel: "Member support",
  },
  "support.case_status_updated": {
    eyebrow: "Support update",
    familyLabel: "Member support",
  },
  "support.message_added": {
    eyebrow: "Support message",
    familyLabel: "Member support",
  },
  signup_email_verification: {
    eyebrow: "Account verification",
    familyLabel: "Halaalvest access",
  },
  workspace_invitation: {
    eyebrow: "Workspace invitation",
    familyLabel: "Halaalvest access",
  },
  workspace_ready: {
    eyebrow: "Workspace ready",
    familyLabel: "Halaalvest access",
  },
} as const satisfies Record<string, NotificationEmailPresentation>

export const notificationEmailPresentationTypeList = Object.keys(
  notificationEmailPresentationByType
)
