import type { DateFilterPreset } from "@halaalvest/utils"

export type ReportGroup = "money" | "members" | "loans" | "activity"

export type ReportExport = {
  /** The CSV route. */
  href: string
  key: string
  /** One short line: what is in it. */
  line: string
  title: string
  group: ReportGroup
  /** Optional services: hidden when the cooperative never used them. */
  optional?: boolean
}

export const reportGroups: Array<{ key: ReportGroup; title: string }> = [
  { key: "money", title: "Money" },
  { key: "members", title: "Members" },
  { key: "loans", title: "Loans and requests" },
  { key: "activity", title: "Activity and messages" },
]

export const reportExports: ReportExport[] = [
  {
    group: "money",
    href: "/reports/contributions-export",
    key: "savings",
    line: "Every savings payment.",
    title: "Savings payments",
  },
  {
    group: "money",
    href: "/reports/special-savings-export",
    key: "extra-savings",
    line: "Extra savings, apart from monthly savings.",
    title: "Extra savings",
  },
  {
    group: "money",
    href: "/reports/charges-export",
    key: "charges",
    line: "Every charge added to a member.",
    title: "Charges",
  },
  {
    group: "money",
    href: "/reports/payment-receipts-export",
    key: "receipts",
    line: "Payment receipts members sent in.",
    optional: true,
    title: "Payment receipts",
  },
  {
    group: "money",
    href: "/reports/member-ledgers-export",
    key: "money-movements",
    line: "Every money movement, by date.",
    title: "Money movements",
  },
  {
    group: "members",
    href: "/reports/members-export",
    key: "members",
    line: "Name, contact, workplace and status.",
    title: "Members list",
  },
  {
    group: "members",
    href: "/reports/member-statements-export",
    key: "member-balances",
    line: "One line per member: savings, loans, what they owe.",
    title: "Member balances",
  },
  {
    group: "members",
    href: "/reports/shares-export",
    key: "shares",
    line: "Shares each member holds.",
    title: "Shares",
  },
  {
    group: "members",
    href: "/reports/opening-balances-export",
    key: "opening-balances",
    line: "Balances brought in when you started.",
    title: "Opening balances",
  },
  {
    group: "loans",
    href: "/reports/loans-export",
    key: "loans",
    line: "Loans by the day paid out; requests not paid out yet by the day asked.",
    title: "Loans",
  },
  {
    group: "loans",
    href: "/reports/repayments-export",
    key: "repayments",
    line: "Every loan repayment recorded.",
    title: "Loan repayments",
  },
  {
    group: "loans",
    href: "/reports/collections-export",
    key: "late-payments",
    line: "Instalments due, paid and late.",
    title: "Instalments and late payments",
  },
  {
    group: "loans",
    href: "/reports/project-financing-export",
    key: "business-funding",
    line: "Business funding requests.",
    title: "Business funding",
  },
  {
    group: "loans",
    href: "/reports/procurement-export",
    key: "item-requests",
    line: "Requests to buy items.",
    optional: true,
    title: "Item requests",
  },
  {
    group: "loans",
    href: "/reports/food-purchase-export",
    key: "foodstuff",
    line: "Foodstuff months and requests.",
    optional: true,
    title: "Foodstuff",
  },
  {
    group: "activity",
    href: "/reports/audit-export",
    key: "activity",
    line: "Who did what, and when.",
    title: "Activity log",
  },
  {
    group: "activity",
    href: "/reports/notifications-export",
    key: "emails",
    line: "Emails sent, waiting or failed.",
    title: "Emails",
  },
  {
    group: "activity",
    href: "/reports/support-export",
    key: "support",
    line: "Support requests and how they ended.",
    optional: true,
    title: "Support requests",
  },
]

export function getReportExport(key: string | null | undefined) {
  return reportExports.find((report) => report.key === key) ?? null
}

/** Reports to list: optional services only when the summary allows them. */
export function getVisibleReportExports(visibility: Record<string, boolean>) {
  return reportExports.filter(
    (report) => !report.optional || visibility[report.href] !== false
  )
}

export type ReportPeriodChoice = "all" | DateFilterPreset | "page"

export const reportPeriodChoices: Array<{
  label: string
  value: Exclude<ReportPeriodChoice, "page">
}> = [
  { label: "All time", value: "all" },
  { label: "This month", value: "this month" },
  { label: "Last month", value: "last month" },
  { label: "Last 3 months", value: "last 3 months" },
  { label: "Last 6 months", value: "last 6 months" },
]

/** The period choice that matches the page's own date range. */
export function getPeriodChoiceForRange(
  dateRange: string[] | null | undefined
): ReportPeriodChoice {
  if (!dateRange?.length) return "all"
  const [first, second] = dateRange
  const preset = reportPeriodChoices.find(
    (choice) => choice.value === first && !second
  )
  return preset ? preset.value : "page"
}

/** The CSV link for a report and a period choice. */
export function getReportDownloadHref(
  report: ReportExport,
  choice: ReportPeriodChoice,
  pageDateRange: string[] | null | undefined
) {
  const dateRange =
    choice === "all"
      ? null
      : choice === "page"
        ? (pageDateRange ?? null)
        : [choice]

  if (!dateRange?.length) return report.href

  const params = new URLSearchParams()
  params.set("dateRange", dateRange.join(","))
  return `${report.href}?${params.toString()}`
}
