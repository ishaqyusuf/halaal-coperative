import type {
  MobileMemberPayable,
  MobileMemberPayableKind,
  MobileReceiptAllocationCategory,
  MobileReceiptCreateAllocation,
} from "./member-receipt-types"

/**
 * Record payment (T30 · 02). Members don't split a payment any more:
 * - picked badges pay those items in full; "Add more" sends extra to savings;
 * - nothing picked: the typed slip amount is applied in the cooperative's
 *   order (the payables already arrive in that order), anything left to
 *   special savings. The server applies the same order at approval, so this
 *   preview is advisory.
 */

export type PaymentLineKind = MobileMemberPayableKind | "savings"

export type PaymentLine = {
  amount: number
  kind: PaymentLineKind
  /** The payable this pays, or null for the savings line. */
  payable: MobileMemberPayable | null
}

export type PaymentPlan = {
  lines: PaymentLine[]
  mode: "picked" | "auto"
  /** Kobo. */
  total: number
}

export const payableKindLabels: Record<PaymentLineKind, string> = {
  commitment: "Commitment",
  food_purchase: "Foodstuff",
  loan: "Loan",
  procurement: "Procurement",
  savings: "Savings",
  shares: "Shares",
}

/** Kobo from a typed amount ("12,500.5" → 1250050). */
export function koboFromInput(input: string) {
  const amount = Number(input.replace(/,/g, ""))
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) : 0
}

const kobo = (naira: number) => Math.round(naira * 100)

/** Spreads kobo over ordered payables; the rest goes to savings. */
export function spreadOverPayables(
  total: number,
  payables: readonly MobileMemberPayable[]
): PaymentLine[] {
  let left = total
  const lines: PaymentLine[] = []
  for (const payable of payables) {
    if (left <= 0) break
    const due = kobo(payable.amount)
    if (due <= 0) continue
    const amount = Math.min(left, due)
    lines.push({ amount, kind: payable.kind, payable })
    left -= amount
  }
  if (left > 0) lines.push({ amount: left, kind: "savings", payable: null })
  return lines
}

export function paymentPlan(input: {
  extra: string
  payables: readonly MobileMemberPayable[]
  selected: readonly string[]
  typed: string
}): PaymentPlan {
  const picked = input.payables.filter((payable) =>
    input.selected.includes(payable.id)
  )
  if (picked.length) {
    const lines: PaymentLine[] = picked.map((payable) => ({
      amount: kobo(payable.amount),
      kind: payable.kind,
      payable,
    }))
    const extra = koboFromInput(input.extra)
    if (extra > 0) lines.push({ amount: extra, kind: "savings", payable: null })
    return {
      lines,
      mode: "picked",
      total: lines.reduce((sum, line) => sum + line.amount, 0),
    }
  }
  const total = koboFromInput(input.typed)
  return {
    lines: total ? spreadOverPayables(total, input.payables) : [],
    mode: "auto",
    total,
  }
}

/** Keeps only selections that are still payable (a refresh may settle one). */
export function liveSelection(
  selected: readonly string[],
  payables: readonly MobileMemberPayable[]
) {
  return selected.filter((id) => payables.some((payable) => payable.id === id))
}

/**
 * The `payable` deep-link param (`<kind>:<id>`) when it names a current
 * payable; anything unknown or already paid selects nothing.
 */
export function preselectedPayable(
  param: string | string[] | undefined,
  payables: readonly MobileMemberPayable[]
) {
  const value = Array.isArray(param) ? param[0] : param
  if (!value) return null
  return payables.some((payable) => payable.id === value) ? value : null
}

const categoryFor: Record<
  MobileMemberPayableKind,
  MobileReceiptAllocationCategory
> = {
  commitment: "commitment",
  food_purchase: "food_purchase",
  loan: "loan_servicing",
  procurement: "procurement",
  shares: "shares",
}

/**
 * Receipt allocations for the create call. Automatic mode sends none: the
 * server applies the amount in its order at approval.
 */
export function createAllocations(
  plan: PaymentPlan,
  paidAt: string
): MobileReceiptCreateAllocation[] {
  if (plan.mode === "auto") return []
  const periodStart = `${paidAt.slice(0, 7)}-01T00:00:00.000Z`
  return plan.lines.map(({ amount, payable }) => {
    const base = { amount: amount / 100 }
    if (!payable) {
      return {
        ...base,
        category: "special_savings",
        periodIntent: "current_period",
        targetPeriodStart: periodStart,
      }
    }
    const category = categoryFor[payable.kind]
    switch (payable.kind) {
      case "procurement":
        return {
          ...base,
          category,
          procurementRepaymentScheduleItemId: payable.targetId,
        }
      case "food_purchase":
        return { ...base, category, foodPurchaseApplicationId: payable.targetId }
      case "loan":
        return {
          ...base,
          category,
          loanId: payable.targetId,
          periodIntent: "current_period",
          targetPeriodStart: periodStart,
        }
      case "shares":
        return { ...base, category, memberShareApplicationId: payable.targetId }
      case "commitment":
        return {
          ...base,
          category,
          contributionPlanId: payable.targetId,
          periodIntent: "current_period",
          targetPeriodStart: periodStart,
        }
    }
  })
}

export function newPaymentDraft(today: string) {
  return {
    extra: "",
    memberNotes: "",
    paidAt: today,
    paymentReference: "",
    proofDocumentName: "",
    proofDocumentUrl: "",
    selected: [] as string[],
    showMore: false,
    supportDescription: "",
    supportReceiptId: null as string | null,
    typed: "",
  }
}

export type PaymentDraft = ReturnType<typeof newPaymentDraft>

export function hasPaymentDraft(draft: PaymentDraft) {
  return Boolean(
    draft.typed ||
    draft.selected.length ||
    draft.extra ||
    draft.paymentReference ||
    draft.memberNotes ||
    draft.proofDocumentUrl
  )
}
