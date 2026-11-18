import { formatMoney } from "@/lib/money"
import { formatDateOnly } from "@/lib/date-only"
import type {
  ChargeCollectionMode,
  ChargeRuleRow,
} from "./admin-charge-operations-types"

export const chargeLanes = [
  { label: "Applications", value: "applications" },
  { label: "Levies", value: "levies" },
  { label: "Rules", value: "rules" },
] as const

export function chargeLabel(value: string) {
  return value
    .replace(/^charge[._]/, "")
    .replace(/[._]/g, " ")
    .replace(/^\w/, (letter) => letter.toUpperCase())
}

export function collectionLabel(value: ChargeCollectionMode) {
  return value === "deduct_from_savings" ? "From savings" : "Pay separately"
}

export function chargeDate(value: string | Date) {
  return formatDateOnly(new Date(value).toISOString().slice(0, 10))
}

export function isRuleRow<T>(row: T | ChargeRuleRow): row is ChargeRuleRow {
  return typeof row === "object" && row !== null && "versions" in row
}

export function chargeMoney(amount: number, currencyCode: string) {
  return formatMoney(amount, {
    currencyCode,
    fractionDigits: Number.isInteger(amount) ? 0 : 2,
  })
}
