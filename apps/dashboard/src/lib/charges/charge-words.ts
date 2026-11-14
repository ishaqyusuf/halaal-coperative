import { formatCurrency } from "@halaalvest/utils"

// Plain words for the charges page. Staff read these on phones, so each is
// short and avoids posting/ledger jargon.

export type ChargeValueType = "fixed_amount" | "percentage"

export type ChargeFrequency =
  | "manual"
  | "one_time"
  | "per_contribution"
  | "recurring_monthly"

export type ChargeAppliesTo =
  | "food_purchase"
  | "loan"
  | "loan_request"
  | "monthly_collection"
  | "procurement"
  | "project_financing"

export type ChargeActivityStatus = "pending" | "posted" | "reversed" | "waived"

export type ChargeCollectionMode = "deduct_from_savings" | "pay_separately"

export type ChargeActivitySource = ChargeAppliesTo | "manual"

/** "₦2,500" or "2%" (a percentage charge is a share of the amount it rides on). */
export function formatChargeAmount(amount: number, valueType: ChargeValueType) {
  return valueType === "percentage"
    ? `${Number(amount.toFixed(2))}%`
    : formatCurrency(amount)
}

const frequencyWords: Record<ChargeFrequency, string> = {
  manual: "When staff add it",
  one_time: "Once",
  per_contribution: "Each payment",
  recurring_monthly: "Every month",
}

export function getChargeFrequencyWord(frequency: ChargeFrequency) {
  return frequencyWords[frequency] ?? "When staff add it"
}

const appliesToWords: Record<ChargeAppliesTo, string> = {
  food_purchase: "Food purchases",
  loan: "Loans",
  loan_request: "Loan requests",
  monthly_collection: "Monthly payments",
  procurement: "Procurement",
  project_financing: "Project financing",
}

/** Who pays: the workflows that add this charge on their own, or staff. */
export function getChargeAppliesToWords(appliesTo: ChargeAppliesTo[]) {
  if (!appliesTo.length) return "Added by staff"

  return appliesTo.map((value) => appliesToWords[value]).join(", ")
}

export function getChargeSourceWord(source: ChargeActivitySource) {
  return source === "manual" ? "Added by staff" : appliesToWords[source]
}

export type ChargeStatusTone = "good" | "muted" | "warning"

/** One status word per member charge. */
export function getChargeStatusWord(
  status: ChargeActivityStatus,
  collectionMode: ChargeCollectionMode
): { label: string; tone: ChargeStatusTone } {
  if (status === "pending") return { label: "Not paid yet", tone: "warning" }
  if (status === "waived") return { label: "Waived", tone: "muted" }
  if (status === "reversed") return { label: "Undone", tone: "muted" }

  return collectionMode === "pay_separately"
    ? { label: "Paid", tone: "good" }
    : { label: "Taken from savings", tone: "good" }
}

export type ChargeCorrection = "settle" | "waive" | "reverse"

/** What staff can still do with a member charge. */
export function getChargeCorrections(
  status: ChargeActivityStatus,
  collectionMode: ChargeCollectionMode
): ChargeCorrection[] {
  if (status === "pending") {
    return collectionMode === "pay_separately" ? ["settle", "waive"] : ["waive"]
  }

  return status === "posted" ? ["waive", "reverse"] : []
}
