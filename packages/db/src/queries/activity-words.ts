/**
 * Plain words for the activity log (`audit_logs`): what happened, which kind
 * of record, and which area of the cooperative it belongs to. Staff read
 * these on /reports/audit, in its detail sheet and in the activity CSV.
 */

export const activityAreas = [
  "money",
  "loans",
  "members",
  "shares",
  "support",
  "access",
  "emails",
  "setup",
] as const

export type ActivityArea = (typeof activityAreas)[number]

export const activityAreaLabels: Record<ActivityArea, string> = {
  access: "Sign-in and phones",
  emails: "Emails",
  loans: "Loans and requests",
  members: "Members",
  money: "Payments and charges",
  setup: "Settings and setup",
  shares: "Shares and profit",
  support: "Support",
}

/** Action prefixes (the part before the first dot) for each area. */
const areaPrefixes: Record<ActivityArea, string[]> = {
  access: [
    "auth",
    "cooperative_mobile_access",
    "mobile",
    "mobile_admin_command",
    "mobile_app_access",
  ],
  emails: ["notification", "notification_preference"],
  loans: [
    "collections",
    "financing_cycle",
    "food_purchase",
    "loan",
    "loan_guarantor_approval",
    "loan_product",
    "loan_request",
    "procurement",
    "project_financing",
    "repayment",
  ],
  members: [
    "deduction_source",
    "import",
    "import_batch",
    "member",
    "member_document",
    "member_onboarding",
    "member_signup_link",
    "membership",
  ],
  money: [
    "backfill",
    "charge",
    "collection_source_batch",
    "contribution",
    "contribution_plan",
    "member_payment",
    "member_payment_receipt",
    "monthly_record",
    "special_savings",
  ],
  setup: [
    "application",
    "file",
    "migration",
    "qa",
    "subscription",
    "tenant",
    "tenant_business_policy",
    "tenant_operation_profile",
    "tenant_policy",
  ],
  shares: [
    "business",
    "member_share_application",
    "share_business",
    "share_business_profit_entry",
    "share_profit_allocations",
  ],
  support: ["support"],
}

/** `action LIKE` patterns for an area filter, e.g. `member.%`. */
export function getActivityAreaActionPrefixes(area: ActivityArea) {
  return areaPrefixes[area].map((prefix) => `${prefix}.`)
}

export function getActivityArea(action: string): ActivityArea {
  const prefix = action.split(".")[0] ?? ""

  for (const area of activityAreas) {
    if (areaPrefixes[area].includes(prefix)) return area
  }

  return "setup"
}

/** Whole sentences for the actions staff meet most often. */
const actionWords: Record<string, string> = {
  "application.error_captured": "An error was recorded",
  "auth.password_recovery.completed": "Password reset",
  "auth.password_recovery.requested": "Asked to reset a password",
  "auth.workspace_session_handoff.consumed": "Signed in",
  "auth.workspace_session_handoff.requested": "Started signing in",
  "backfill.batch_applied": "Past payments added",
  "charge.applied": "Charge added",
  "charge.reversed": "Charge reversed",
  "charge.settled": "Charge paid",
  "charge.staged": "Charge prepared",
  "charge.waived": "Charge waived",
  "collection_source_batch.rows_updated": "Workplace payment list changed",
  "collection_source_batch.staged": "Workplace payment list prepared",
  "collections.follow_up_recorded": "Late payment follow-up noted",
  "collections.statuses_refreshed": "Late payments checked",
  "contribution.recorded": "Savings payment recorded",
  "contribution_plan.set": "Monthly savings amount set",
  "cooperative_mobile_access.approved": "Mobile app access approved",
  "cooperative_mobile_access.enabled": "Mobile app turned on",
  "cooperative_mobile_access.granted": "Mobile app access given",
  "cooperative_mobile_access.reinstated": "Mobile app access turned back on",
  "cooperative_mobile_access.revoked": "Mobile app access turned off",
  "file.uploaded": "File uploaded",
  "business.profit_season.closed": "Profit season closed",
  "business.profit_season.shared": "Profit season shared with members",
  "financing_cycle.opened": "Loan month opened",
  "food_purchase.accounting_approved": "Foodstuff accounts approved",
  "food_purchase.accounting_submitted": "Foodstuff accounts sent",
  "food_purchase.application_approved": "Foodstuff request approved",
  "food_purchase.application_rejected": "Foodstuff request declined",
  "food_purchase.application_submitted": "Foodstuff request sent",
  "food_purchase.cycle_close_intake": "Stopped taking foodstuff requests",
  "food_purchase.cycle_created": "Foodstuff month started",
  "food_purchase.cycle_reopen_intake": "Foodstuff requests opened again",
  "import.charges": "Charges imported",
  "import.contributions": "Savings payments imported",
  "import.deduction_sources": "Workplaces imported",
  "import.loan_products": "Loan types imported",
  "import.loans": "Loans imported",
  "import.members": "Members imported",
  "import.repayments": "Loan repayments imported",
  "import_batch.applied": "Import saved",
  "import_batch.created": "Import started",
  "loan.backfill_context_recorded": "Past loan details added",
  "loan.disbursed": "Loan paid out",
  "loan.legacy_backfill_created": "Past loan added",
  "loan_guarantor_approval.approved": "Guarantor agreed",
  "loan_guarantor_approval.rejected": "Guarantor declined",
  "loan_product.provisioned_at_go_live": "Loan type set up",
  "loan_product.settings_created": "Loan type set up",
  "loan_request.approved": "Loan request approved",
  "loan_request.rejected": "Loan request declined",
  "loan_request.submitted": "Loan request sent",
  "loan_request.under_review": "Loan request being checked",
  "member.activity_event.upserted": "Member history updated",
  "member.created": "Member added",
  "member.kyc_updated": "ID check updated",
  "member.portal_access_prepared": "Member sign-in prepared",
  "member.status_changed": "Member status changed",
  "member.updated": "Member details changed",
  "member_onboarding.approved": "Joining request approved",
  "member_onboarding.email_verified": "Joining email confirmed",
  "member_onboarding.rejected": "Joining request declined",
  "member_onboarding.requested": "Asked to join",
  "member_payment.recorded": "Payment recorded",
  "member_payment_receipt.approved": "Payment receipt approved",
  "member_payment_receipt.rejected": "Payment receipt declined",
  "member_payment_receipt.submitted": "Payment receipt sent",
  "member_share_application.approved": "Share request approved",
  "member_share_application.created": "Share request sent",
  "member_share_application.rejected": "Share request declined",
  "member_signup_link.created": "Signup link made",
  "mobile.device_registered": "Phone added",
  "mobile.device_revoked": "Phone removed",
  "mobile.member_statement.generated": "Statement downloaded on phone",
  "mobile.notification.read": "Phone message read",
  "mobile.session.created": "Signed in on phone",
  "mobile.session.replaced": "Phone sign-in renewed",
  "mobile.session.revoked": "Signed out on phone",
  "mobile.session.revoked_all": "Signed out on all phones",
  "mobile_admin_command.completed": "Phone task done",
  "mobile_app_access.review_grant_issued": "App review access given",
  "monthly_record.workplace_received": "Workplace payment received",
  "notification.email_failed": "Email failed to send",
  "notification.email_queued": "Email waiting to send",
  "notification.email_sent": "Email sent",
  "notification.push_suppressed": "Phone message not sent",
  "procurement.purchase_recorded": "Item bought",
  "procurement.request_approved": "Item request approved",
  "procurement.request_rejected": "Item request declined",
  "procurement.request_submitted": "Item request sent",
  "project_financing.disbursement_recorded": "Business funding paid out",
  "project_financing.request_approved": "Business funding approved",
  "project_financing.request_rejected": "Business funding declined",
  "project_financing.request_submitted": "Business funding request sent",
  "project_financing.structure_activated": "Business funding terms set",
  "repayment.backfill_posted": "Past loan repayment added",
  "repayment.posted": "Loan repayment recorded",
  "share_business.created": "Business added",
  "share_business.updated": "Business changed",
  "share_business_profit_entry.approved": "Business profit approved",
  "share_business_profit_entry.updated": "Business profit changed",
  "share_profit_allocations.generated": "Profit shares worked out",
  "share_profit_allocations.published": "Profit shared with members",
  "special_savings.refund_posted": "Extra savings paid back",
  "subscription.initialized": "Plan started",
  "subscription.transition": "Plan changed",
  "support.case_created": "Support request opened",
  "support.case_status_updated": "Support request updated",
  "support.financial_adjustment_reviewed": "Support money fix checked",
  "support.message_added": "Support message sent",
  "tenant_business_policy.updated": "Business rules changed",
  "tenant_operation_profile.reviewed": "Services checked",
  "tenant_operation_profile.service_access_updated": "Service access changed",
  "tenant_policy.financing_cycle_updated": "Loan month rules changed",
  "tenant_policy.migration_setup_mode_updated": "Setup mode changed",
  "tenant_policy.share_policy_updated": "Share rules changed",
}

const verbWords: Record<string, string> = {
  applied: "saved",
  posted: "recorded",
  approved: "approved",
  created: "added",
  deleted: "removed",
  rejected: "declined",
  reviewed: "checked",
  revoked: "turned off",
  submitted: "sent",
  updated: "changed",
  upserted: "saved",
}

const subjectWords: Record<string, string> = {
  collection_source_batch: "Workplace payment list",
  contribution: "Savings payment",
  contribution_plan: "Monthly savings plan",
  deduction_source: "Workplace",
  food_purchase: "Foodstuff",
  loan_product: "Loan type",
  member_document: "Member document",
  member_payment_receipt: "Payment receipt",
  member_signup_link: "Signup link",
  migration: "Setup",
  mobile: "Phone",
  mobile_admin_command: "Phone task",
  mobile_billing: "Mobile app bill",
  monthly_record_member: "Monthly payment",
  qa: "Test",
  repayment: "Loan repayment",
  share_business_profit_entry: "Business profit",
  subscription: "Plan",
  tenant: "Cooperative",
  tenant_domain: "Web address",
  tenant_policy: "Cooperative rules",
}

function humanize(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[._-]+/g, " ")
    .trim()
    .toLowerCase()
}

function sentenceCase(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value
}

/** "loan_request.approved" -> "Loan request approved". */
export function getActivityActionLabel(action: string) {
  const known = actionWords[action]
  if (known) return known

  const parts = action.split(".")
  const prefix = parts[0] ?? ""
  const last = parts.length > 1 ? (parts.at(-1) ?? "") : ""
  const subject = subjectWords[prefix] ?? sentenceCase(humanize(prefix))
  const middle = parts.slice(1, -1).map(humanize).join(" ")
  const verb = last ? (verbWords[last] ?? humanize(last)) : ""

  return sentenceCase(
    [subject, middle, verb].filter(Boolean).join(" ").replace(/\s+/g, " ")
  )
}

const entityWords: Record<string, string> = {
  AuthChallenge: "Sign-in",
  BackfillMonthRow: "Past month",
  ChargeApplication: "Charge",
  CollectionFollowUp: "Late payment follow-up",
  CollectionSourceContributionBatch: "Workplace payment list",
  Contribution: "Savings payment",
  ContributionPlan: "Monthly savings plan",
  CooperativeMobileAccessTerm: "Mobile app access",
  DashboardError: "Error",
  DashboardUpload: "File",
  DividendPeriod: "Profit period",
  FinancingCycle: "Loan month",
  FoodPurchaseApplication: "Foodstuff request",
  FoodPurchaseCycle: "Foodstuff month",
  LegacyLoanMigrationDraft: "Past loan",
  Loan: "Loan",
  LoanGuarantorApproval: "Guarantor",
  LoanProduct: "Loan type",
  LoanRequest: "Loan request",
  Member: "Member",
  MemberAmountLog: "Member amount",
  MemberOnboardingRequest: "Joining request",
  MemberOpeningBalance: "Opening balance",
  MemberPayment: "Payment",
  MemberPaymentReceipt: "Payment receipt",
  MemberShareApplication: "Share request",
  MemberSignupLink: "Signup link",
  MemberStatementExport: "Statement",
  MobileAdminCommand: "Phone task",
  MobileDeviceSession: "Phone sign-in",
  MobileNotification: "Phone message",
  MonthlyRecord: "Monthly payments",
  NotificationDelivery: "Phone message",
  NotificationEmail: "Email",
  ProcurementRequest: "Item request",
  ProjectFinancingRequest: "Business funding",
  Repayment: "Loan repayment",
  RepaymentScheduleItem: "Loan instalment",
  ShareBusiness: "Business",
  ShareBusinessProfitEntry: "Business profit",
  SupportCase: "Support request",
  Tenant: "Cooperative",
  TenantPolicy: "Cooperative rules",
  TenantOperationProfile: "Services",
  mobile_app_review_grant: "App review access",
  tenant_subscription: "Plan",
}

/** "ChargeApplication" -> "Charge". */
export function getActivityEntityLabel(entityType: string) {
  return entityWords[entityType] ?? sentenceCase(humanize(entityType))
}

/** Who did it, when there is no named person. */
export function getActivityActorFallback(actorType: string) {
  if (actorType === "integration") return "Connected service"
  if (actorType === "user") return "Someone"
  return "System"
}
