import type {
  MobilePaymentReceipt,
  MobileReceiptAllocationCategory,
} from "./member-receipt-types"

export const receiptCategories: Record<
  MobileReceiptAllocationCategory,
  string
> = {
  commitment: "Commitment",
  special_savings: "Savings",
  loan_servicing: "Loan",
  loan_extra_payment: "Loan",
  shares: "Shares",
  procurement: "Procurement",
  project_financing: "Project financing",
  food_purchase: "Foodstuff",
  other: "Other",
}

/** Solid colours for the "where it went" bar and legend (T30 · 02). */
export const receiptCategoryColors: Record<
  MobileReceiptAllocationCategory,
  string
> = {
  commitment: "bg-brand",
  special_savings: "bg-success",
  loan_servicing: "bg-tint-sky-foreground",
  loan_extra_payment: "bg-tint-sky-foreground",
  shares: "bg-brand-warm",
  procurement: "bg-tint-lilac-foreground",
  project_financing: "bg-tint-sky-foreground",
  food_purchase: "bg-brand-vivid",
  other: "bg-muted-foreground",
}

/** Owner wording (T30): Checking · Fix needed · Applied · Declined. */
export const receiptStatuses = {
  submitted: { icon: "Clock", label: "Checking", tone: "warning" },
  under_review: { icon: "Clock", label: "Checking", tone: "warning" },
  correction_requested: {
    icon: "CircleAlert",
    label: "Fix needed",
    tone: "danger",
  },
  approved: { icon: "Check", label: "Applied", tone: "success" },
  rejected: { icon: "X", label: "Declined", tone: "neutral" },
} as const

/** Allocation categories in one line ("Procurement + Savings"). */
export function receiptPartsLine(receipt: MobilePaymentReceipt) {
  if (!receipt.allocations.length) return "Applied in the cooperative’s order"
  return Array.from(
    new Set(receipt.allocations.map((split) => receiptCategories[split.category]))
  ).join(" + ")
}

export function receiptStatus(status: string) {
  if (status === "pending_review") return receiptStatuses.submitted
  return (
    receiptStatuses[status as keyof typeof receiptStatuses] ?? {
      icon: undefined,
      label: status.replace(/_/g, " "),
      tone: "neutral" as const,
    }
  )
}

export function receiptTitle(receipt: MobilePaymentReceipt) {
  return (
    receipt.paymentReference ??
    (receipt.channel === "cash" ? "Cash payment" : "Payment")
  )
}

export function receiptMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-NG", {
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    style: "currency",
  }).format(amount)
}

export function receiptDate(value: string, short = false) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    ...(short ? {} : { year: "numeric" }),
  }).format(new Date(value))
}

export function receiptMonth(month: string, short = false) {
  return new Intl.DateTimeFormat("en-GB", {
    month: short ? "short" : "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`))
}

export function receiptMatches(
  receipt: MobilePaymentReceipt,
  search: string,
  currency: string
) {
  const text = [
    receiptTitle(receipt),
    receiptMoney(receipt.totalAmount, currency),
    receipt.totalAmount,
    receiptDate(receipt.paidAt),
    receiptStatus(receipt.status).label,
    ...receipt.allocations.map((split) => receiptCategories[split.category]),
  ]
    .join(" ")
    .toLowerCase()
  return text.includes(search.toLowerCase())
}
