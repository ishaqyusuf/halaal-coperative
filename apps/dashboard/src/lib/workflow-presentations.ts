export type WorkflowPresentation = "sheet" | "dialog" | "alert-dialog"

export type WorkflowPresentationWidth = "compact" | "form" | "review" | "wide"

export type WorkflowPresentationConfig = {
  presentation: WorkflowPresentation
  width: WorkflowPresentationWidth
}

const sheet = (width: WorkflowPresentationWidth = "form") =>
  ({ presentation: "sheet", width }) as const
const dialog = (width: WorkflowPresentationWidth = "form") =>
  ({ presentation: "dialog", width }) as const
const alertDialog = (width: WorkflowPresentationWidth = "compact") =>
  ({ presentation: "alert-dialog", width }) as const

export const workflowPresentations = {
  // /reports/audit: one activity entry, URL-addressed (`activityId`).
  activityEntry: {
    details: sheet("form"),
  },
  // /billing: one Halaalvest bill (`billId`); /platform/bills: Mark paid.
  billing: {
    bill: sheet("form"),
    remittance: dialog("compact"),
  },
  business: {
    create: sheet(),
    details: sheet("review"),
    edit: sheet(),
    editProfit: sheet(),
    profit: sheet(),
    reviewNone: dialog("compact"),
    // A profit-sharing season: totals, profit entries, who gets what.
    season: sheet("review"),
  },
  charge: {
    create: sheet(),
    edit: sheet(),
    update: sheet(),
  },
  chargeOperation: {
    application: sheet("form"),
    definition: sheet("form"),
    details: sheet("form"),
    reverse: alertDialog(),
    settle: dialog("compact"),
    toggle: alertDialog(),
    version: dialog("compact"),
    waive: alertDialog(),
  },
  contribution: {
    // A ledger entry opened from its row (WP15): read-only, a right sheet.
    details: sheet(),
    editPlan: sheet(),
    markBatchRowCollected: dialog("compact"),
    markBatchRowException: dialog("form"),
    payment: sheet("review"),
    plan: sheet("review"),
    postBatchRow: alertDialog(),
    postBatchRows: dialog("review"),
    // One choice for one member: a compact dialog (audit CT3).
    preference: dialog("compact"),
    stageBatch: sheet("review"),
  },
  // Connecting a web address: a short modal, not a record sheet.
  domain: {
    add: dialog("compact"),
  },
  foodPurchase: {
    // Four figures on an existing month: a dialog (audit FP4).
    accounting: dialog("form"),
    "accounting-review": dialog("form"),
    application: sheet("review"),
    details: sheet("review"),
    release: sheet(),
    // Older links open the request's own sheet, where staff decide.
    review: sheet("review"),
    "self-service": sheet("review"),
  },
  guarantorApproval: {
    response: alertDialog(),
  },
  import: {
    apply: dialog("wide"),
    create: dialog("wide"),
    details: dialog("wide"),
  },
  loan: {
    disburse: alertDialog(),
    guarantor: alertDialog(),
    "loan-details": sheet("form"),
    request: sheet("form"),
    "request-details": sheet("form"),
    review: alertDialog(),
  },
  member: {
    create: sheet(),
    status: alertDialog(),
  },
  memberBackfill: {
    adjustment: dialog("compact"),
    apply: alertDialog(),
    baselineEdit: sheet("form"),
    cancel: alertDialog(),
    capture: sheet("wide"),
    dividends: alertDialog(),
    finalize: dialog("review"),
    historicalEntry: dialog("form"),
    legacyLoanCreate: sheet("review"),
    legacyLoanEdit: sheet("review"),
    missedMonths: dialog("review"),
    noHistory: dialog("compact"),
    reverse: alertDialog(),
    review: dialog("form"),
    start: dialog("compact"),
  },
  memberDetail: {
    commitment: dialog("compact"),
    document: sheet(),
    "document-review": dialog("review"),
    edit: sheet(),
    kyc: sheet(),
    "portal-access": dialog("compact"),
  },
  memberImport: {
    import: dialog("wide"),
  },
  membershipApproval: {
    review: sheet("form"),
  },
  memberSignupLink: {
    access: dialog("compact"),
    create: dialog("form"),
    edit: dialog("form"),
  },
  mobileAccess: {
    give: sheet("form"),
  },
  monthlyRecord: {
    apply: dialog("compact"),
    cancel: alertDialog(),
    create: alertDialog(),
    generate: alertDialog(),
    receive: sheet("review"),
    settings: dialog("compact"),
    workplaces: dialog("form"),
  },
  notificationPreference: {
    settings: sheet("form"),
  },
  operationProfile: {
    edit: dialog("form"),
  },
  // /platform/privacy-requests and /platform/refund-reviews: one record each.
  platformPrivacy: {
    request: sheet("form"),
  },
  platformRefund: {
    review: sheet("form"),
  },
  paymentReceipt: {
    create: sheet("review"),
    "member-create": sheet("review"),
    "member-support": dialog("compact"),
    review: sheet("review"),
    support: dialog("compact"),
  },
  procurement: {
    create: sheet("review"),
    details: sheet("review"),
    purchase: dialog("form"),
    // Staff decide inside the request's own sheet (ADR-20261105 rule 3).
    review: sheet("review"),
    "self-service": sheet("review"),
  },
  profile: {
    edit: sheet("form"),
  },
  projectFinancing: {
    create: sheet("review"),
    details: sheet("review"),
    disbursement: dialog("form"),
    // Staff decide inside the request's own sheet (ADR-20261105 rule 3).
    review: sheet("review"),
    "self-service": sheet("review"),
  },
  // /reports: pick a period and download one CSV (export = modal).
  reportExport: {
    download: dialog("compact"),
  },
  repayment: {
    followUp: sheet("form"),
    post: sheet("form"),
    repaymentDetails: sheet("form"),
    scheduleDetails: sheet("form"),
  },
  role: {
    assign: dialog("form"),
  },
  share: {
    create: sheet(),
    details: sheet(),
    edit: sheet(),
    policy: sheet(),
  },
  shareApplication: {
    create: dialog("compact"),
    details: sheet("form"),
    "member-create": dialog("compact"),
  },
  // /support: one case sheet (conversation, reply, staff actions); older
  // update/reply/adjustment-review URLs open it too.
  support: {
    case: sheet("review"),
    create: sheet("form"),
    "member-create": sheet("form"),
  },
  tenantFinance: {
    businessProfitPolicy: sheet("form"),
    // One choice and a note: a short dialog (audit TF4).
    financingCycle: dialog("compact"),
    financingPolicy: sheet("form"),
    normalProduct: sheet("form"),
    quickProduct: sheet("form"),
    // One date: a short dialog (audit TF3).
    startDate: dialog("compact"),
  },
  trust: {
    edit: sheet("form"),
  },
} as const satisfies Record<string, Record<string, WorkflowPresentationConfig>>

export function getWorkflowPresentation(
  workflow: keyof typeof workflowPresentations,
  mode: string | null | undefined
): WorkflowPresentationConfig {
  if (!mode) {
    return sheet()
  }

  const modes = workflowPresentations[workflow] as Record<
    string,
    WorkflowPresentationConfig
  >
  const config = modes[mode]

  if (config) {
    return config
  }

  // An unregistered mode is a wiring bug: fail tests, warn in development.
  const message = `Unknown workflow presentation mode "${mode}" for "${workflow}". Register it in lib/workflow-presentations.ts.`

  if (process.env.NODE_ENV === "test") {
    throw new Error(message)
  }

  if (process.env.NODE_ENV !== "production") {
    console.warn(message)
  }

  return sheet()
}
