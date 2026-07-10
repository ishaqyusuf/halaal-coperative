import type { RouterOutputs } from "@halaalvest/api/trpc/routers/_app"

export type ReportsSummary = RouterOutputs["reports"]["summary"]

export const reportExports = [
  {
    body: "Activity evidence with performer, authorizer, entity, date, and detail summary.",
    category: "Activity",
    href: "/reports/audit-export",
    title: "Activity CSV",
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
    body: "Support cases, linked records, resolution evidence, and money-impact flags.",
    category: "Support",
    href: "/reports/support-export",
    title: "Support cases CSV",
  },
  {
    body: "Submitted receipts, review status, proof metadata, and allocation posting links.",
    category: "Payments",
    href: "/reports/payment-receipts-export",
    title: "Payment receipts CSV",
  },
  {
    body: "Savings, commitments, and extra-savings records for finance review.",
    category: "Contributions",
    href: "/reports/contributions-export",
    title: "Contributions CSV",
  },
  {
    body: "Member extra-savings rows separated from monthly commitment records.",
    category: "Special savings",
    href: "/reports/special-savings-export",
    title: "Special savings CSV",
  },
  {
    body: "Financing requests and active-principal servicing details.",
    category: "Financing",
    href: "/reports/loans-export",
    title: "Financing CSV",
  },
  {
    body: "Member business funding requests, approval structure, and review evidence.",
    category: "Project financing",
    href: "/reports/project-financing-export",
    title: "Project financing CSV",
  },
  {
    body: "Item-purchase requests, approval costs, repayment estimates, and review notes.",
    category: "Procurement",
    href: "/reports/procurement-export",
    title: "Procurement CSV",
  },
  {
    body: "Monthly foodstuff cycles, released funds, applications, accounting, and profit evidence.",
    category: "Foodstuff Purchase",
    href: "/reports/food-purchase-export",
    title: "Foodstuff Purchase CSV",
  },
  {
    body: "Member register with contact, KYC, deduction source, status, and linked-login evidence.",
    category: "Members",
    href: "/reports/members-export",
    title: "Members CSV",
  },
  {
    body: "Brought-forward opening balances, source documents, review, apply, and reversal evidence.",
    category: "Migration",
    href: "/reports/opening-balances-export",
    title: "Opening balances CSV",
  },
  {
    body: "Share ledger balances, active share model, unit totals, and request counts.",
    category: "Shares",
    href: "/reports/shares-export",
    title: "Share positions CSV",
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
