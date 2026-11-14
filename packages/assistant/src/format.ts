import type { AssistantMoney } from "./contracts"

export function money(amount: number | string | { toString(): string }): AssistantMoney {
  const value = Number(String(amount))
  return {
    amount: Number.isFinite(value) ? value.toFixed(2) : "0.00",
    currency: "NGN",
  }
}

/** Display form shared by every surface, e.g. "₦25,000" or "₦25,000.50". */
export function formatMoney(value: AssistantMoney) {
  const amount = Number(value.amount)
  const hasKobo = !Number.isInteger(amount)
  return `₦${amount.toLocaleString("en-NG", {
    minimumFractionDigits: hasKobo ? 2 : 0,
    maximumFractionDigits: 2,
  })}`
}

/** Tenant-date display; Africa/Lagos for the Nigerian pilot. */
export function formatAssistantDate(iso: string, timeZone = "Africa/Lagos") {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone,
  })
}
