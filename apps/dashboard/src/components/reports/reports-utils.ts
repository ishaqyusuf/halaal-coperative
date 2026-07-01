import type { RouterOutputs } from "@halaalvest/api/trpc/routers/_app"

export type ReportsSummary = RouterOutputs["reports"]["summary"]

export const reportExports = [
  {
    body: "Recent audit activity for external review.",
    category: "Audit",
    href: "/reports/audit-export",
    title: "Audit CSV",
  },
  {
    body: "Installment status, overdue exposure, and outstanding balances.",
    category: "Collections",
    href: "/reports/collections-export",
    title: "Collections CSV",
  },
  {
    body: "Notification delivery outcomes for support and compliance follow-up.",
    category: "Notifications",
    href: "/reports/notifications-export",
    title: "Notifications CSV",
  },
  {
    body: "Savings, commitments, and extra-savings records for finance review.",
    category: "Contributions",
    href: "/reports/contributions-export",
    title: "Contributions CSV",
  },
  {
    body: "Financing requests and active-principal servicing details.",
    category: "Financing",
    href: "/reports/loans-export",
    title: "Financing CSV",
  },
  {
    body: "One row per member with commitments, savings, exposure, and repayments.",
    category: "Members",
    href: "/reports/member-statements-export",
    title: "Member statements CSV",
  },
  {
    body: "Chronological ledger transactions across member money movements.",
    category: "Ledger",
    href: "/reports/member-ledgers-export",
    title: "Member ledgers CSV",
  },
  {
    body: "Assessed charges, levy activity, and member-level charge records.",
    category: "Charges",
    href: "/reports/charges-export",
    title: "Charges CSV",
  },
  {
    body: "Posted repayment evidence for reconciliation and servicing review.",
    category: "Repayments",
    href: "/reports/repayments-export",
    title: "Repayments CSV",
  },
] as const

export function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value))
}

export function getCountTone(value: number) {
  return value > 0 ? "warning" : "positive"
}

export function withReportFilters(
  pathname: string,
  filters: { from?: string | null; to?: string | null },
) {
  const params = new URLSearchParams()

  if (filters.from) {
    params.set("from", filters.from)
  }

  if (filters.to) {
    params.set("to", filters.to)
  }

  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}
