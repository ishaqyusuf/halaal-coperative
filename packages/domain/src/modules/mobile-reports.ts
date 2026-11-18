export const MOBILE_REPORT_KEYS = [
  "members",
  "memberStatements",
  "contributions",
  "specialSavings",
  "charges",
  "financing",
  "repayments",
  "paymentReceipts",
  "procurement",
  "foodPurchase",
  "projectFinancing",
  "shares",
  "profit",
  "support",
  "openingBalances",
  "audit",
] as const

export type MobileReportKey = (typeof MOBILE_REPORT_KEYS)[number]

export type MobileReportCatalogDefinition = {
  category: "finance" | "governance" | "members" | "operations"
  detail: string
  key: MobileReportKey
  title: string
}

/**
 * Every workspace can generate every report (triage 2.8 retired the old plan
 * report and audit depths). The row limit is a payload safety bound, the same
 * for all workspaces, not a plan feature.
 */
export const MOBILE_REPORT_ROW_LIMIT = 5_000

export const MOBILE_REPORT_CATALOG = [
  {
    category: "members",
    detail: "Membership status and cooperative profile data.",
    key: "members",
    title: "Member register",
  },
  {
    category: "members",
    detail: "Member balances, obligations and posted activity.",
    key: "memberStatements",
    title: "Member statements",
  },
  {
    category: "finance",
    detail: "Committed contributions and posted payments.",
    key: "contributions",
    title: "Contributions",
  },
  {
    category: "finance",
    detail: "Voluntary and extra savings posted for members.",
    key: "specialSavings",
    title: "Special savings",
  },
  {
    category: "finance",
    detail: "Assessed charges, settlement state and source.",
    key: "charges",
    title: "Charges",
  },
  {
    category: "finance",
    detail: "Financing requests, facilities and outstanding principal.",
    key: "financing",
    title: "Financing",
  },
  {
    category: "finance",
    detail: "Posted repayments and collection references.",
    key: "repayments",
    title: "Repayments",
  },
  {
    category: "finance",
    detail: "Member payment receipts and review outcomes.",
    key: "paymentReceipts",
    title: "Payment receipts",
  },
  {
    category: "operations",
    detail: "Procurement requests, fulfillment and payment evidence.",
    key: "procurement",
    title: "Procurement",
  },
  {
    category: "operations",
    detail: "Foodstuff Purchase applications and monthly cycles.",
    key: "foodPurchase",
    title: "Foodstuff Purchase",
  },
  {
    category: "operations",
    detail: "Project financing structure, review and release evidence.",
    key: "projectFinancing",
    title: "Project financing",
  },
  {
    category: "finance",
    detail: "Compulsory and optional share-capital positions.",
    key: "shares",
    title: "Shares",
  },
  {
    category: "finance",
    detail: "Approved profit periods and published allocations.",
    key: "profit",
    title: "Profit and dividends",
  },
  {
    category: "operations",
    detail: "Support cases, priority and resolution state.",
    key: "support",
    title: "Support",
  },
  {
    category: "governance",
    detail: "Brought-forward member balances and review state.",
    key: "openingBalances",
    title: "Opening balances",
  },
  {
    category: "governance",
    detail: "Actor, authorizer and redacted before-and-after evidence.",
    key: "audit",
    title: "Audit activity",
  },
] satisfies MobileReportCatalogDefinition[]

export function getMobileReportCatalog() {
  return MOBILE_REPORT_CATALOG.map((definition) => ({
    ...definition,
    available: true as const,
    rowLimit: MOBILE_REPORT_ROW_LIMIT,
  }))
}
