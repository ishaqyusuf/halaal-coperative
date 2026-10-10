import type { SubscriptionEntitlements } from "./subscriptions"

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
export type MobileReportDepth = SubscriptionEntitlements["reportDepth"]
export type MobileAuditDepth = SubscriptionEntitlements["auditDepth"]

export type MobileReportCatalogDefinition = {
  category: "finance" | "governance" | "members" | "operations"
  detail: string
  key: MobileReportKey
  minimumDepth: "advanced" | "basic" | "full"
  title: string
}

const DEPTH_RANK = {
  advanced: 3,
  basic: 1,
  custom: 4,
  full: 2,
} as const

export const MOBILE_REPORT_CATALOG = [
  {
    category: "members",
    detail: "Membership status and cooperative profile data.",
    key: "members",
    minimumDepth: "basic",
    title: "Member register",
  },
  {
    category: "members",
    detail: "Member balances, obligations and posted activity.",
    key: "memberStatements",
    minimumDepth: "basic",
    title: "Member statements",
  },
  {
    category: "finance",
    detail: "Committed contributions and posted payments.",
    key: "contributions",
    minimumDepth: "basic",
    title: "Contributions",
  },
  {
    category: "finance",
    detail: "Voluntary and extra savings posted for members.",
    key: "specialSavings",
    minimumDepth: "full",
    title: "Special savings",
  },
  {
    category: "finance",
    detail: "Assessed charges, settlement state and source.",
    key: "charges",
    minimumDepth: "full",
    title: "Charges",
  },
  {
    category: "finance",
    detail: "Financing requests, facilities and outstanding principal.",
    key: "financing",
    minimumDepth: "basic",
    title: "Financing",
  },
  {
    category: "finance",
    detail: "Posted repayments and collection references.",
    key: "repayments",
    minimumDepth: "basic",
    title: "Repayments",
  },
  {
    category: "finance",
    detail: "Member payment receipts and review outcomes.",
    key: "paymentReceipts",
    minimumDepth: "basic",
    title: "Payment receipts",
  },
  {
    category: "operations",
    detail: "Procurement requests, fulfillment and payment evidence.",
    key: "procurement",
    minimumDepth: "full",
    title: "Procurement",
  },
  {
    category: "operations",
    detail: "Foodstuff Purchase applications and monthly cycles.",
    key: "foodPurchase",
    minimumDepth: "full",
    title: "Foodstuff Purchase",
  },
  {
    category: "operations",
    detail: "Project financing structure, review and release evidence.",
    key: "projectFinancing",
    minimumDepth: "full",
    title: "Project financing",
  },
  {
    category: "finance",
    detail: "Compulsory and optional share-capital positions.",
    key: "shares",
    minimumDepth: "full",
    title: "Shares",
  },
  {
    category: "finance",
    detail: "Approved profit periods and published allocations.",
    key: "profit",
    minimumDepth: "full",
    title: "Profit and dividends",
  },
  {
    category: "operations",
    detail: "Support cases, priority and resolution state.",
    key: "support",
    minimumDepth: "full",
    title: "Support",
  },
  {
    category: "governance",
    detail: "Brought-forward member balances and review state.",
    key: "openingBalances",
    minimumDepth: "full",
    title: "Opening balances",
  },
  {
    category: "governance",
    detail: "Actor, authorizer and redacted before-and-after evidence.",
    key: "audit",
    minimumDepth: "advanced",
    title: "Audit activity",
  },
] satisfies MobileReportCatalogDefinition[]

export function getMobileReportRowLimit(
  reportDepth: MobileReportDepth,
  auditDepth: MobileAuditDepth,
  key: MobileReportKey,
) {
  const depth = key === "audit" ? auditDepth : reportDepth

  return {
    advanced: 5_000,
    basic: key === "audit" ? 100 : 500,
    custom: 10_000,
    full: key === "audit" ? 500 : 2_500,
  }[depth]
}

export function canGenerateMobileReport(
  reportDepth: MobileReportDepth,
  auditDepth: MobileAuditDepth,
  definition: MobileReportCatalogDefinition,
) {
  const depth = definition.key === "audit" ? auditDepth : reportDepth
  return DEPTH_RANK[depth] >= DEPTH_RANK[definition.minimumDepth]
}

export function getMobileReportCatalog(entitlements: SubscriptionEntitlements) {
  return MOBILE_REPORT_CATALOG.map((definition) => ({
    ...definition,
    available: canGenerateMobileReport(
      entitlements.reportDepth,
      entitlements.auditDepth,
      definition,
    ),
    rowLimit: getMobileReportRowLimit(
      entitlements.reportDepth,
      entitlements.auditDepth,
      definition.key,
    ),
  }))
}
