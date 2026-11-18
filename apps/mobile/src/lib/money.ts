/**
 * Display-only money formatting for the mobile design system. Amounts are
 * authoritative on the server; these helpers only group digits for reading
 * and typing.
 *
 * Deliberately avoids `Intl.NumberFormat#formatToParts`: Hermes on iOS
 * does not implement it, and it crashed the contributions sheet (16 Nov 2026).
 */

const SYMBOLS: Record<string, string> = { NGN: "₦", USD: "$", GBP: "£", EUR: "€" }

export function currencySymbol(currencyCode = "NGN") {
  return SYMBOLS[currencyCode.toUpperCase()] ?? `${currencyCode.toUpperCase()} `
}

/** "1234567" -> "1,234,567". Accepts a digit-only string. */
export function groupDigits(digits: string) {
  const trimmed = digits.replace(/^0+(?=\d)/, "")
  return trimmed.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

/**
 * 25000 -> "₦25,000"; 1250.5 with `fractionDigits: 2` -> "₦1,250.50".
 * Whole naira by default, matching the T00 kit.
 */
export function formatMoney(
  amount: number,
  {
    currencyCode = "NGN",
    fractionDigits = 0,
    signDisplay = "negative",
  }: {
    currencyCode?: string
    fractionDigits?: 0 | 1 | 2
    signDisplay?: "negative" | "always"
  } = {}
) {
  if (!Number.isFinite(amount)) return `${currencySymbol(currencyCode)}0`
  const negative = amount < 0
  const fixed = Math.abs(amount).toFixed(fractionDigits)
  const [whole = "0", fraction] = fixed.split(".")
  const sign = negative ? "-" : signDisplay === "always" && amount > 0 ? "+" : ""
  return `${sign}${currencySymbol(currencyCode)}${groupDigits(whole)}${
    fraction ? `.${fraction}` : ""
  }`
}

/** 1_250_000 -> "₦1.25m", 85_000 -> "₦85k"; under 1,000 stays exact. */
export function formatCompactMoney(amount: number, currencyCode = "NGN") {
  const absolute = Math.abs(amount)
  if (absolute < 1_000) return formatMoney(amount, { currencyCode })
  const [divisor, suffix] =
    absolute >= 1_000_000_000
      ? [1_000_000_000, "bn"]
      : absolute >= 1_000_000
        ? [1_000_000, "m"]
        : [1_000, "k"]
  const scaled = (absolute / divisor).toFixed(2).replace(/\.?0+$/, "")
  return `${amount < 0 ? "-" : ""}${currencySymbol(currencyCode)}${scaled}${suffix}`
}

export type MoneyInputState = {
  /** Grouped text for the field, e.g. "25,000" or "1,250." while typing. */
  display: string
  /** Canonical value for forms and the API: "25000", "1250.5", or "". */
  raw: string
  /** Parsed number, or null while empty. */
  value: number | null
}

/**
 * Normalizes whatever the keyboard or a paste produced into a grouped
 * display value and a canonical raw value. Kobo are opt-in.
 */
export function parseMoneyInput(
  text: string,
  { allowDecimals = false, maxDigits = 13 }: { allowDecimals?: boolean; maxDigits?: number } = {}
): MoneyInputState {
  const cleaned = text.replace(allowDecimals ? /[^\d.]/g : /[^\d]/g, "")
  const firstDot = cleaned.indexOf(".")
  const wholePart = (firstDot >= 0 ? cleaned.slice(0, firstDot) : cleaned)
    .replace(/^0+(?=\d)/, "")
    .slice(0, maxDigits)
  const fractionPart =
    allowDecimals && firstDot >= 0
      ? cleaned.slice(firstDot + 1).replace(/\./g, "").slice(0, 2)
      : undefined

  if (!wholePart && fractionPart === undefined) {
    return { display: "", raw: "", value: null }
  }
  const whole = wholePart || "0"
  const raw = fractionPart ? `${whole}.${fractionPart}` : whole
  const display =
    fractionPart !== undefined
      ? `${groupDigits(whole)}.${fractionPart}`
      : groupDigits(whole)
  return { display, raw, value: Number(raw) }
}

/** The grouped display for a stored raw value (for controlled fields). */
export function formatMoneyInput(raw: string, allowDecimals = false) {
  return parseMoneyInput(raw, { allowDecimals }).display
}
