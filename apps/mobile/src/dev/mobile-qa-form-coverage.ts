/**
 * Mobile QA form coverage.
 *
 * Every mobile form declares a Quick Fill recipe, a prerequisite, or an
 * explicit exclusion, and names the source files that own its fields.
 * `mobile-qa-form-coverage.test.ts` discovers field-bearing sources and fails
 * when a new form or field file is not classified here. This module is
 * test-only: app code must not import it.
 */
import type { QaFormCoverage } from "@halaalvest/domain/qa-accelerator"
import type { mobileDevQuickFill } from "./mobile-dev-quick-fill"

export type MobileQuickFillRecipeKey = keyof typeof mobileDevQuickFill

export type MobileQaFormCoverage = QaFormCoverage & {
  /** Recipe group in `mobileDevQuickFill`; required for recipe forms. */
  recipe?: MobileQuickFillRecipeKey
  /** Source files that render the form's fields or its Quick Fill control. */
  sources: readonly string[]
}

const feature = (path: string) => `src/features/${path}`

const memberFinancing = feature("financing/screens/member-financing-screen.tsx")
const memberProcurement = feature(
  "procurement/screens/member-procurement-screen.tsx"
)
const memberProjectFinancing = feature(
  "project-financing/screens/member-project-financing-screen.tsx"
)
const memberFoodPurchase = [
  feature("food-purchase/components/member-food-purchase-application-form.tsx"),
  feature("food-purchase/hooks/use-member-food-purchase-controller.ts"),
]
const memberReceipts = feature("receipts/screens/member-receipts-screen.tsx")
const memberSupport = feature("support/screens/member-support-screen.tsx")
const memberShares = feature("shares-profit/screens/member-shares-screen.tsx")
const memberGuarantor = [
  feature("guarantors/screens/member-guarantor-approvals-screen.tsx"),
  feature("guarantors/components/member-guarantor-response-form.tsx"),
]
const recovery = [
  feature("auth/screens/recovery-screen.tsx"),
  feature("auth/components/recovery-step-content.tsx"),
]
const adminMembers = feature(
  "admin-member-lifecycle/screens/admin-members-screen.tsx"
)
const adminMemberDetail = feature(
  "admin-member-lifecycle/screens/admin-member-detail-screen.tsx"
)
const adminFinanceSupport = [
  feature("admin-finance-support/components/admin-finance-action-form.tsx"),
  feature("admin-finance-support/components/admin-finance-action-stack.tsx"),
  feature(
    "admin-finance-support/hooks/use-admin-finance-support-controller.ts"
  ),
]
const adminContributions = feature(
  "admin-contribution-operations/screens/admin-contribution-operations-screen.tsx"
)
const adminContributionPayment = [
  adminContributions,
  feature(
    "admin-contribution-operations/components/post-contribution-payment-sheet.tsx"
  ),
]
const adminCharges = feature(
  "admin-charge-operations/screens/admin-charge-operations-screen.tsx"
)
const adminFinancing = feature(
  "admin-financing-operations/screens/admin-financing-operations-screen.tsx"
)
const adminFoodPurchase = feature(
  "admin-food-purchase-operations/screens/admin-food-purchase-operations-screen.tsx"
)
const adminProcurement = feature(
  "admin-procurement-operations/screens/admin-procurement-operations-screen.tsx"
)
const adminProjectFinancing = feature(
  "admin-project-financing-operations/screens/admin-project-financing-operations-screen.tsx"
)
const adminRepayments = feature(
  "admin-repayment-operations/screens/admin-repayment-operations-screen.tsx"
)
const adminShareProfit = feature(
  "admin-share-profit-governance/screens/admin-share-profit-governance-screen.tsx"
)

export const mobileQaFormCoverage = [
  // Member self-service
  {
    formId: "mobile.member.financing-request",
    kind: "recipe",
    recipe: "financing",
    sources: [memberFinancing],
  },
  {
    formId: "mobile.member.procurement-request",
    kind: "recipe",
    recipe: "procurement",
    sources: [memberProcurement],
  },
  {
    formId: "mobile.member.project-financing-request",
    kind: "recipe",
    recipe: "projectFinancing",
    sources: [memberProjectFinancing],
  },
  {
    formId: "mobile.member.food-purchase-application",
    kind: "recipe",
    recipe: "foodPurchase",
    sources: memberFoodPurchase,
  },
  {
    formId: "mobile.member.receipt-draft",
    kind: "recipe",
    recipe: "receipt",
    sources: [memberReceipts],
  },
  {
    formId: "mobile.member.receipt-support",
    kind: "recipe",
    recipe: "receiptSupport",
    sources: [memberReceipts],
  },
  {
    formId: "mobile.member.support-case",
    kind: "recipe",
    recipe: "support",
    sources: [memberSupport],
  },
  {
    formId: "mobile.member.support-reply",
    kind: "recipe",
    recipe: "support",
    sources: [memberSupport],
  },
  {
    formId: "mobile.member.share-request",
    kind: "recipe",
    recipe: "shareRequest",
    sources: [memberShares],
  },
  {
    formId: "mobile.member.guarantor-response",
    kind: "recipe",
    recipe: "guarantor",
    sources: memberGuarantor,
  },

  // Authentication and device security
  {
    formId: "mobile.auth.recovery-identity",
    kind: "recipe",
    recipe: "recovery",
    sources: recovery,
  },
  {
    formId: "mobile.auth.sign-in",
    kind: "excluded",
    reason: "Passwords stay manual; the QA profile chooser enters QA sessions.",
    sources: [feature("auth/components/sign-in-form.tsx")],
  },
  {
    formId: "mobile.auth.recovery-code",
    kind: "excluded",
    reason: "OTP evidence stays manual.",
    sources: recovery,
  },
  {
    formId: "mobile.auth.recovery-password",
    kind: "excluded",
    reason: "Passwords stay manual.",
    sources: recovery,
  },
  {
    formId: "mobile.auth.qa-domain",
    kind: "excluded",
    reason:
      "The QA Domain selects the environment scope and is never fixture data.",
    sources: [feature("auth/components/qa-domain-composer.tsx")],
  },
  {
    formId: "mobile.app-lock.pin",
    kind: "excluded",
    reason: "App PINs are device secrets and stay manual.",
    sources: [feature("app-lock/screens/app-lock-screen.tsx")],
  },

  // Administrator operations
  {
    formId: "mobile.admin.member-create",
    kind: "recipe",
    recipe: "adminMember",
    sources: [adminMembers],
  },
  {
    formId: "mobile.admin.member-onboarding-review",
    kind: "recipe",
    recipe: "adminMemberReview",
    sources: [adminMembers],
  },
  {
    formId: "mobile.admin.member-status-kyc",
    kind: "recipe",
    recipe: "adminMemberReview",
    sources: [adminMemberDetail],
  },
  {
    formId: "mobile.admin.access-invite",
    kind: "recipe",
    recipe: "adminInvite",
    sources: [feature("settings-access/screens/more-screen.tsx")],
  },
  {
    formId: "mobile.admin.operation-profile-change",
    kind: "recipe",
    recipe: "operationProfile",
    sources: [
      feature("operation-profile/components/operation-profile-edit-sheet.tsx"),
    ],
  },
  {
    formId: "mobile.admin.finance-action",
    kind: "recipe",
    recipe: "adminFinance",
    sources: adminFinanceSupport,
  },
  {
    formId: "mobile.admin.support-reply",
    kind: "recipe",
    recipe: "adminSupport",
    sources: adminFinanceSupport,
  },
  {
    formId: "mobile.admin.contribution-payment",
    kind: "recipe",
    recipe: "adminContributions",
    sources: adminContributionPayment,
  },
  {
    formId: "mobile.admin.contribution-plan",
    kind: "recipe",
    recipe: "adminContributions",
    sources: [adminContributions],
  },
  {
    formId: "mobile.admin.contribution-batch",
    kind: "recipe",
    recipe: "adminContributions",
    sources: [adminContributions],
  },
  {
    formId: "mobile.admin.contribution-batch-row",
    kind: "recipe",
    recipe: "adminContributions",
    sources: [adminContributions],
  },
  {
    formId: "mobile.admin.charge-application",
    kind: "recipe",
    recipe: "adminCharges",
    sources: [adminCharges],
  },
  {
    formId: "mobile.admin.charge-settlement",
    kind: "recipe",
    recipe: "adminCharges",
    sources: [adminCharges],
  },
  {
    formId: "mobile.admin.charge-correction",
    kind: "recipe",
    recipe: "adminCharges",
    sources: [adminCharges],
  },
  {
    formId: "mobile.admin.financing-cycle",
    kind: "recipe",
    recipe: "adminFinancingOperations",
    sources: [adminFinancing],
  },
  {
    formId: "mobile.admin.financing-review",
    kind: "recipe",
    recipe: "adminFinancingOperations",
    sources: [adminFinancing],
  },
  {
    // Fills only the first repayment date; the disbursement itself stays a
    // human confirmation behind the server liquidity gate.
    formId: "mobile.admin.financing-disbursement",
    kind: "recipe",
    recipe: "adminFinancingOperations",
    sources: [adminFinancing],
  },
  {
    formId: "mobile.admin.food-purchase-release",
    kind: "recipe",
    recipe: "adminFoodPurchaseOperations",
    sources: [adminFoodPurchase],
  },
  {
    formId: "mobile.admin.food-purchase-application-review",
    kind: "recipe",
    recipe: "adminFoodPurchaseOperations",
    sources: [adminFoodPurchase],
  },
  {
    formId: "mobile.admin.food-purchase-cycle-accounting",
    kind: "recipe",
    recipe: "adminFoodPurchaseOperations",
    sources: [adminFoodPurchase],
  },
  {
    formId: "mobile.admin.food-purchase-accounting-review",
    kind: "recipe",
    recipe: "adminFoodPurchaseOperations",
    sources: [adminFoodPurchase],
  },
  {
    formId: "mobile.admin.procurement-review",
    kind: "recipe",
    recipe: "adminProcurementOperations",
    sources: [adminProcurement],
  },
  {
    formId: "mobile.admin.procurement-activation",
    kind: "recipe",
    recipe: "adminProcurementOperations",
    sources: [adminProcurement],
  },
  {
    formId: "mobile.admin.procurement-payment",
    kind: "recipe",
    recipe: "adminProcurementOperations",
    sources: [adminProcurement],
  },
  {
    formId: "mobile.admin.project-financing-review",
    kind: "recipe",
    recipe: "adminProjectFinancingOperations",
    sources: [adminProjectFinancing],
  },
  {
    formId: "mobile.admin.project-financing-activation",
    kind: "recipe",
    recipe: "adminProjectFinancingOperations",
    sources: [adminProjectFinancing],
  },
  {
    formId: "mobile.admin.project-financing-release",
    kind: "recipe",
    recipe: "adminProjectFinancingOperations",
    sources: [adminProjectFinancing],
  },
  {
    formId: "mobile.admin.repayment-entry",
    kind: "recipe",
    recipe: "adminRepaymentOperations",
    sources: [adminRepayments],
  },
  {
    formId: "mobile.admin.collection-follow-up",
    kind: "recipe",
    recipe: "adminRepaymentOperations",
    sources: [adminRepayments],
  },
  {
    formId: "mobile.admin.share-review",
    kind: "recipe",
    recipe: "adminShareProfitGovernance",
    sources: [adminShareProfit],
  },
  {
    formId: "mobile.admin.profit-approval",
    kind: "recipe",
    recipe: "adminShareProfitGovernance",
    sources: [adminShareProfit],
  },
  {
    formId: "mobile.admin.profit-publication",
    kind: "excluded",
    reason: "Publishing profit is irreversible and takes no draft values.",
    sources: [adminShareProfit],
  },

  // Account and consent surfaces without draft fields
  {
    formId: "mobile.account.deletion",
    kind: "excluded",
    reason: "Destructive confirmations stay manual.",
    sources: [feature("account-privacy/screens/account-privacy-screen.tsx")],
  },
  {
    formId: "mobile.legal.acceptance",
    kind: "excluded",
    reason: "Legal consent stays manual.",
    sources: [feature("legal/screens/legal-agreements-screen.tsx")],
  },
  {
    formId: "mobile.device-sessions.revoke",
    kind: "excluded",
    reason: "Session revocation is destructive and stays manual.",
    sources: [feature("device-sessions/screens/device-sessions-screen.tsx")],
  },
  {
    formId: "mobile.assistant.proposal-edit",
    kind: "excluded",
    reason:
      "Corrects a draft the assistant built from the person's own words; there are no fixture values to fill.",
    sources: [feature("assistant/components/assistant-proposal-editor.tsx")],
  },
  {
    formId: "mobile.notifications.preferences",
    kind: "excluded",
    reason: "Preference toggles save immediately; there is no draft to fill.",
    sources: [
      feature("notifications/components/notification-preferences-screen.tsx"),
    ],
  },
] as const satisfies readonly MobileQaFormCoverage[]

/**
 * Field-bearing sources that do not own a submitted draft: shared field
 * primitives, list search, and report filters.
 */
export const mobileQaNonFormFieldSources = [
  {
    reason: "Assistant chat composer: a message is sent, not a form draft.",
    source: "src/features/assistant/components/assistant-ui.tsx",
  },
  {
    reason: "Holds a ref to the assistant composer; renders no field itself.",
    source: "src/features/assistant/screens/ask-assistant-screen.tsx",
  },
  {
    reason: "Shared input primitive; the parent form owns coverage.",
    source: "src/components/ui/input.tsx",
  },
  {
    reason: "Shared textarea primitive; the parent form owns coverage.",
    source: "src/components/ui/textarea.tsx",
  },
  {
    reason: "Shared date field; the parent form owns coverage.",
    source: "src/components/app/calendar-date-field.tsx",
  },
  {
    reason: "Shared money primitive (T01); the parent form owns coverage.",
    source: "src/components/ui/money-field.tsx",
  },
  {
    reason: "Shared phone primitive (T01); the parent form owns coverage.",
    source: "src/components/ui/phone-field.tsx",
  },
  {
    reason: "Shared floating search pill (T01); a search query is not a form draft.",
    source: "src/components/search/floating-search-field.tsx",
  },
  {
    reason: "Shared auth field; the parent form owns coverage.",
    source: feature("auth/components/auth-field.tsx"),
  },
  {
    reason: "Shared OTP field; OTP evidence stays manual.",
    source: feature("auth/components/otp-field.tsx"),
  },
  {
    reason: "Shared password field; passwords stay manual.",
    source: feature("auth/components/password-field.tsx"),
  },
  {
    reason: "QA profile search is not a submitted form.",
    source: feature("auth/components/qa-profile-chooser.tsx"),
  },
  {
    reason: "Contribution member search is not a submitted form.",
    source: feature(
      "admin-contribution-operations/components/admin-contribution-workspace.tsx"
    ),
  },
  {
    reason: "Finance work search is not a submitted form.",
    source: feature(
      "admin-finance-support/components/admin-finance-work-queue.tsx"
    ),
  },
  {
    reason: "Report search and date-range filters are not a submitted form.",
    source: feature("admin-reports-access/screens/admin-reports-screen.tsx"),
  },
] as const satisfies readonly { reason: string; source: string }[]
