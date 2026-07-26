export type WorkflowPresentation = "sheet" | "dialog" | "alert-dialog"

export type WorkflowPresentationWidth =
  | "compact"
  | "form"
  | "review"
  | "wide"

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
    postBatchRow: dialog("compact"),
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
    disburse: dialog("form"),
    guarantor: dialog("form"),
    request: sheet("review"),
    review: dialog("review"),
  },
  member: {
    create: sheet(),
    status: dialog("compact"),
  },
  memberBackfill: {
    apply: alertDialog(),
    baselineEdit: dialog("form"),
    capture: sheet("review"),
    finalize: alertDialog(),
    historicalEntry: sheet("review"),
    legacyLoanEdit: sheet("review"),
    noHistory: dialog("compact"),
    reverse: dialog("form"),
    review: dialog("review"),
    saveDraft: dialog("compact"),
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
    create: dialog("form"),
  },
  memberSignupLink: {
    access: dialog("form"),
    create: sheet(),
    edit: sheet(),
  },
  monthlyRecord: {
    apply: dialog("form"),
    cancel: alertDialog(),
    create: sheet(),
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
    purchase: dialog("form"),
    review: dialog("review"),
    "self-service": sheet("review"),
  },
  profile: {
    edit: dialog("form"),
  },
  projectFinancing: {
    create: sheet("review"),
    disbursement: dialog("form"),
    review: dialog("review"),
    "self-service": sheet("review"),
  },
  repayment: {
    followUp: dialog("form"),
    post: sheet("review"),
    refresh: alertDialog(),
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
    edit: dialog("form"),
  },
} as const satisfies Record<
  string,
  Record<string, WorkflowPresentationConfig>
>

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

  return modes[mode] ?? sheet()
}
