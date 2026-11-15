/**
 * Halaalvest's monthly bill to a cooperative: seat fee, website assistant
 * usage above the free allowance, and mobile access terms. Pure rules only;
 * the database owns counting and posting. See .brain/features/platform-billing.md.
 */
export const platformBillingPrices = {
  currencyCode: "NGN",
  /** Per active member per month. */
  seatFee: 35,
  /** Website assistant messages a cooperative's staff share each month. */
  assistantFreeMessages: 500,
  /** Per message above the free allowance, with automatic billing on. */
  assistantMessagePrice: 15,
} as const

export type PlatformSeatFeePayer = "cooperative" | "members"

export type PlatformAssistantBillingSettings = {
  assistantAutoBilling: boolean
  /** Most the cooperative pays for messages above the allowance in a month (₦). */
  assistantMonthlyCap: number
}

export type PlatformBillLineDraft = {
  kind: "seat_fee" | "ai_overage" | "mobile_access"
  description: string
  quantity: number
  unitAmount: number
  amount: number
}

function money(value: number) {
  return Math.round(value * 100) / 100
}

/** "2026-11" for the Lagos calendar month containing `now`. */
export function platformBillingPeriod(now: Date, timeZone = "Africa/Lagos") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now)
  const year = parts.find((part) => part.type === "year")?.value
  const month = parts.find((part) => part.type === "month")?.value
  return `${year}-${month}`
}

/** The month before `period` ("2026-01" → "2025-12"). */
export function previousPlatformBillingPeriod(period: string) {
  const [year, month] = period.split("-").map(Number) as [number, number]
  return month === 1
    ? `${year - 1}-12`
    : `${year}-${String(month - 1).padStart(2, "0")}`
}

/** "November 2026". */
export function formatPlatformBillingPeriod(period: string) {
  const [year, month] = period.split("-").map(Number) as [number, number]
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)))
}

/** Most assistant messages the cooperative may send this month. */
export function assistantMessageLimit(settings: PlatformAssistantBillingSettings) {
  const free = platformBillingPrices.assistantFreeMessages
  if (!settings.assistantAutoBilling) return free
  const cap = Number.isFinite(settings.assistantMonthlyCap)
    ? Math.max(0, settings.assistantMonthlyCap)
    : 0
  return free + Math.floor(cap / platformBillingPrices.assistantMessagePrice)
}

export function validateAssistantMonthlyCap(cap: number) {
  if (!Number.isFinite(cap) || cap < 0)
    return "Enter a cap of ₦0 or more."
  if (cap > 10_000_000) return "Enter a cap of ₦10,000,000 or less."
  if (Math.round(cap * 100) !== cap * 100)
    return "Use at most two decimal places."
  return null
}

export function seatFeeLine(seats: number): PlatformBillLineDraft | null {
  if (seats <= 0) return null
  const unitAmount = platformBillingPrices.seatFee
  return {
    kind: "seat_fee",
    description: `Seat fee: ${seats} active ${seats === 1 ? "member" : "members"} × ₦${unitAmount}`,
    quantity: seats,
    unitAmount,
    amount: money(seats * unitAmount),
  }
}

export function assistantOverageLine(
  billableMessages: number
): PlatformBillLineDraft | null {
  if (billableMessages <= 0) return null
  const unitAmount = platformBillingPrices.assistantMessagePrice
  return {
    kind: "ai_overage",
    description: `Assistant: ${billableMessages} ${billableMessages === 1 ? "message" : "messages"} over the free ${platformBillingPrices.assistantFreeMessages} × ₦${unitAmount}`,
    quantity: billableMessages,
    unitAmount,
    amount: money(billableMessages * unitAmount),
  }
}

export function mobileAccessLine(
  terms: Array<{ amount: number }>
): PlatformBillLineDraft | null {
  if (!terms.length) return null
  const amount = money(terms.reduce((sum, term) => sum + term.amount, 0))
  const prices = new Set(terms.map((term) => term.amount))
  const unitAmount = prices.size === 1 ? terms[0]!.amount : money(amount / terms.length)
  return {
    kind: "mobile_access",
    description: `Mobile app access: ${terms.length} ${terms.length === 1 ? "member" : "members"}`,
    quantity: terms.length,
    unitAmount,
    amount,
  }
}

export function platformBillTotal(lines: PlatformBillLineDraft[]) {
  return money(lines.reduce((sum, line) => sum + line.amount, 0))
}

/** This month so far, as the billing page shows it. */
export function estimatePlatformBill(input: {
  seats: number
  assistantBillableMessages: number
  mobileTerms: Array<{ amount: number }>
}) {
  const lines = [
    seatFeeLine(input.seats),
    assistantOverageLine(input.assistantBillableMessages),
    mobileAccessLine(input.mobileTerms),
  ].filter((line): line is PlatformBillLineDraft => line !== null)
  return { lines, total: platformBillTotal(lines) }
}
