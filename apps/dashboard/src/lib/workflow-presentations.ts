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
  business: {
    create: sheet("review"),
    details: sheet("review"),
    edit: sheet(),
    editProfit: sheet(),
    profit: sheet(),
    reviewNone: dialog("compact"),
  },
  charge: {
    create: sheet(),
    edit: sheet(),
    update: sheet(),
  },
  chargeOperation: {
    application: sheet("review"),
    definition: sheet("review"),
    reverse: alertDialog(),
    settle: dialog("form"),
    toggle: alertDialog(),
    version: sheet(),
    waive: alertDialog(),
  },
  contribution: {
    editPlan: sheet(),
    markBatchRowCollected: dialog("compact"),
    markBatchRowException: dialog("form"),
    payment: sheet("review"),
    plan: sheet("review"),
    postBatchRow: alertDialog(),
    postBatchRows: dialog("review"),
    preference: sheet(),
    stageBatch: sheet("review"),
  },
  foodPurchase: {
    accounting: sheet("review"),
    "accounting-review": dialog("review"),
    application: sheet("review"),
    release: sheet(),
    review: dialog("review"),
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
    "loan-details": sheet("review"),
    request: sheet("review"),
    "request-details": sheet("review"),
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
    missedMonths: dialog("wide"),
    noHistory: dialog("compact"),
    reverse: alertDialog(),
    review: dialog("form"),
    start: dialog("compact"),
  },
  memberDetail: {
    commitment: sheet(),
    document: sheet(),
    "document-review": dialog("review"),
    kyc: sheet(),
    "portal-access": dialog("compact"),
  },
  memberImport: {
    import: dialog("wide"),
  },
  memberShareApplication: {
    create: sheet("form"),
    details: sheet("review"),
  },
  memberSignupLink: {
    access: dialog("form"),
    create: dialog("form"),
    edit: sheet(),
  },
  monthlyRecord: {
    apply: dialog("form"),
    cancel: alertDialog(),
    create: alertDialog(),
    generate: alertDialog(),
    settings: sheet(),
  },
  notificationPreference: {
    edit: dialog("compact"),
  },
  operationProfile: {
    edit: dialog("form"),
  },
  paymentReceipt: {
    create: sheet("review"),
    "member-create": sheet("review"),
    "member-support": sheet(),
    review: dialog("review"),
    support: sheet(),
  },
  procurement: {
    create: sheet("review"),
    details: sheet("review"),
    purchase: dialog("form"),
    review: dialog("review"),
    "self-service": sheet("review"),
  },
  profile: {
    edit: sheet("form"),
  },
  projectFinancing: {
    create: sheet("review"),
    details: sheet("review"),
    disbursement: dialog("form"),
    review: dialog("review"),
    "self-service": sheet("review"),
  },
  repayment: {
    followUp: sheet("form"),
    post: sheet("review"),
    repaymentDetails: sheet("review"),
    refresh: alertDialog(),
    scheduleDetails: sheet("review"),
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
    create: dialog("form"),
    details: sheet("review"),
    review: dialog("review"),
  },
  support: {
    "adjustment-review": dialog("review"),
    create: sheet("review"),
    "member-create": sheet("review"),
    "member-reply": dialog("form"),
    reply: dialog("form"),
    update: sheet("review"),
  },
  tenantFinance: {
    businessProfitPolicy: sheet("review"),
    financingCycle: sheet(),
    financingPolicy: sheet("review"),
    normalProduct: sheet("review"),
    quickProduct: sheet("review"),
    startDate: sheet(),
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
