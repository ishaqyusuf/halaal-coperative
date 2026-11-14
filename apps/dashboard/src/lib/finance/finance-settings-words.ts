import { formatCurrency } from "@halaalvest/utils"

/** Plain words for the Finance setup pages. */

type Frequency = "ad_hoc" | "annual" | "quarterly" | "semi_annual"

const profitFrequencyWords: Record<Frequency, string> = {
  ad_hoc: "Shared when the board decides",
  annual: "Shared once a year",
  quarterly: "Shared every three months",
  semi_annual: "Shared twice a year",
}

export const profitFrequencyOptions: ReadonlyArray<{
  label: string
  value: Frequency
}> = [
  { label: "Once a year", value: "annual" },
  { label: "Twice a year", value: "semi_annual" },
  { label: "Every three months", value: "quarterly" },
  { label: "When the board decides", value: "ad_hoc" },
]

export function getProfitFrequencyWords(frequency: Frequency) {
  return profitFrequencyWords[frequency] ?? "Shared once a year"
}

const monthFormatter = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  timeZone: "UTC",
})

export function getMonthName(month: number) {
  return monthFormatter.format(new Date(Date.UTC(2026, month - 1, 1)))
}

export function getShareModelWords(policy: {
  compulsoryShareUnits: number
  configurationMode: "monthly_history" | "unit_based"
  maximumShareUnits: number
  unitAmount: number
}) {
  if (policy.configurationMode === "unit_based") {
    return {
      detail: `Each member holds ${policy.compulsoryShareUnits} to ${policy.maximumShareUnits} units.`,
      title: `Members buy units of ${formatCurrency(policy.unitAmount)}`,
    }
  }

  return {
    detail: "Part of each monthly payment goes to shares.",
    title: "Members add to shares every month",
  }
}

export function getMonthlyShareWords(
  share: { amount: number; valueType: "fixed_amount" | "percentage" } | null
) {
  if (!share) return "No monthly share amount yet"

  return share.valueType === "percentage"
    ? `${share.amount}% of each payment, after charges`
    : `${formatCurrency(share.amount)} a month`
}

export function getShareAmountWords(share: {
  amount: number
  valueType: "fixed_amount" | "percentage"
}) {
  return share.valueType === "percentage"
    ? `${share.amount}% after charges`
    : formatCurrency(share.amount)
}

const cycleStatusWords: Record<string, string> = {
  closed: "Closed for this month",
  draft: "Not open yet",
  open: "Open",
  paused: "Paused",
}

/** "Loan requests this month: …" */
export function getLoanWindowWords(status: string | null | undefined) {
  return cycleStatusWords[status ?? "draft"] ?? "Not open yet"
}

export function getLoanTypeName(loanType: "normal" | "quick") {
  return loanType === "quick" ? "Quick loan" : "Normal loan"
}

export function getLoanProductWords(product: {
  isActive: boolean
  maxSavingsMultiple: number
  termMonths: number
}) {
  const facts = `Up to ${product.termMonths} month${product.termMonths === 1 ? "" : "s"} · up to ${formatMultiple(product.maxSavingsMultiple)} savings`

  return product.isActive ? facts : `${facts} · Off`
}

export function formatMultiple(value: number) {
  return `${Number(value.toFixed(2))}×`
}

/**
 * One line that says why past rules can't change. `null` while past setup
 * is still open.
 */
export function getFinanceLockWords(lock: {
  hasAppliedMemberBackfill: boolean
  isLive: boolean
  isLocked: boolean
}) {
  if (!lock.isLocked) return null

  if (lock.isLive) {
    return "Your cooperative is live, so its start date and past charge, share and profit records can't change. New rules start from today."
  }

  return "Members' past records have been added, so the start date and past charge, share and profit records can't change."
}

const shortMonthFormatter = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  timeZone: "UTC",
})

function shortMonth(month: number) {
  return shortMonthFormatter.format(
    new Date(Date.UTC(2026, (((month - 1) % 12) + 12) % 12, 1))
  )
}

/** "Jan–Jun and Jul–Dec": the profit seasons a frequency makes in a year. */
export function getProfitSeasonPattern(
  frequency: Frequency,
  financialYearStartMonth: number
) {
  const seasonLength =
    frequency === "semi_annual" ? 6 : frequency === "quarterly" ? 3 : 12

  if (frequency === "ad_hoc") return "When the board decides"

  const seasons: string[] = []

  for (let start = 0; start < 12; start += seasonLength) {
    const first = financialYearStartMonth + start
    const last = first + seasonLength - 1
    seasons.push(`${shortMonth(first)}–${shortMonth(last)}`)
  }

  return seasons.length === 1
    ? `${seasons[0]} each year`
    : `${seasons.slice(0, -1).join(", ")} and ${seasons.at(-1)}`
}
