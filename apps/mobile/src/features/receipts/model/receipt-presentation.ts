import { todayDateOnly } from "@/lib/date-only"
import type {
  MobilePaymentReceipt,
  MobileReceiptAllocationCategory,
  MobileReceiptPeriodIntent,
} from "./member-receipt-types"

export const receiptCategories: Record<
  MobileReceiptAllocationCategory,
  string
> = {
  commitment: "Commitment",
  special_savings: "Special savings",
  loan_servicing: "Loan servicing",
  loan_extra_payment: "Extra loan payment",
  shares: "Shares",
  procurement: "Procurement",
  project_financing: "Project financing",
  food_purchase: "Foodstuff Purchase",
  other: "Other",
}

export const receiptStatuses = {
  submitted: { icon: "Clock", label: "Pending review", tone: "warning" },
  under_review: { icon: "Search", label: "In review", tone: "info" },
  correction_requested: {
    icon: "CircleAlert",
    label: "Needs correction",
    tone: "danger",
  },
  approved: { icon: "Check", label: "Approved", tone: "success" },
  rejected: { icon: "X", label: "Rejected", tone: "neutral" },
} as const

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
    (receipt.channel === "cash" ? "Cash payment" : "Payment receipt")
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

export const periods = [
  { label: "This month", value: "current_period", offset: 0 },
  { label: "Next month", value: "future_period", offset: 1 },
  { label: "Last month", value: "back_period", offset: -1 },
  { label: "Not specified", value: "unspecified", offset: null },
] as const

export function periodMonth(
  intent: MobileReceiptPeriodIntent,
  date = new Date()
) {
  const offset = periods.find((period) => period.value === intent)?.offset
  if (offset == null) return ""
  return todayDateOnly(
    new Date(date.getFullYear(), date.getMonth() + offset, 1)
  ).slice(0, 7)
}

export type ReceiptSplit = {
  amount: string
  category: MobileReceiptAllocationCategory
  id: string
  notes: string
  periodIntent: MobileReceiptPeriodIntent
  targetId: string
  targetMonth: string
}

export function newReceiptSplit(): ReceiptSplit {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    amount: "",
    category: "commitment",
    notes: "",
    periodIntent: "current_period",
    targetId: "",
    targetMonth: periodMonth("current_period"),
  }
}

export function newReceiptDraft() {
  return {
    allocations: [newReceiptSplit()],
    memberNotes: "",
    paidAt: todayDateOnly(new Date()),
    paymentReference: "",
    proofDocumentName: "",
    proofDocumentUrl: "",
    supportDescription: "",
    supportReceiptId: null as string | null,
    totalAmount: "",
  }
}

export type ReceiptDraft = ReturnType<typeof newReceiptDraft>

export function hasReceiptDraft(draft: ReceiptDraft) {
  return Boolean(
    draft.totalAmount ||
    draft.paymentReference ||
    draft.memberNotes ||
    draft.proofDocumentUrl ||
    draft.allocations.length > 1 ||
    draft.allocations.some(
      (split) =>
        split.amount ||
        split.category !== "commitment" ||
        split.targetId ||
        split.notes ||
        split.periodIntent !== "current_period"
    )
  )
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
