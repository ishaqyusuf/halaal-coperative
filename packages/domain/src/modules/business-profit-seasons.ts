export type BusinessProfitSeasonFrequency =
  | "ad_hoc"
  | "annual"
  | "quarterly"
  | "semi_annual"

export type BusinessProfitSeasonPolicy = {
  financialYearStartMonth: number
  profitDistributionFrequency: BusinessProfitSeasonFrequency
}

export type BusinessProfitSeasonPeriod = {
  periodEnd: Date
  periodStart: Date
}

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/

export function toBusinessProfitDateOnly(value: Date | string) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }

  return value.slice(0, 10)
}

export function businessProfitDateFromDateOnly(value: string) {
  if (!dateOnlyPattern.test(value)) {
    throw new Error("Business profit date must use YYYY-MM-DD format.")
  }

  return new Date(`${value}T00:00:00.000Z`)
}

function monthIndexToDate(monthIndex: number) {
  const year = Math.floor(monthIndex / 12)
  const month = monthIndex % 12

  return new Date(Date.UTC(year, month, 1))
}

function monthIndexToPeriodEnd(monthIndex: number) {
  const year = Math.floor(monthIndex / 12)
  const month = monthIndex % 12

  return new Date(Date.UTC(year, month + 1, 0))
}

function getSeasonSpanMonths(frequency: BusinessProfitSeasonFrequency) {
  if (frequency === "quarterly") return 3
  if (frequency === "semi_annual") return 6
  if (frequency === "annual") return 12

  return 0
}

export function getBusinessProfitSeasonPeriod(
  dateValue: Date | string,
  policy: BusinessProfitSeasonPolicy
): BusinessProfitSeasonPeriod {
  const profitDate = businessProfitDateFromDateOnly(
    toBusinessProfitDateOnly(dateValue)
  )

  if (policy.profitDistributionFrequency === "ad_hoc") {
    return {
      periodEnd: profitDate,
      periodStart: profitDate,
    }
  }

  const spanMonths = getSeasonSpanMonths(policy.profitDistributionFrequency)
  const financialYearStartMonth = Math.min(
    Math.max(Math.trunc(policy.financialYearStartMonth), 1),
    12
  )
  const profitMonthIndex =
    profitDate.getUTCFullYear() * 12 + profitDate.getUTCMonth()
  const fiscalStartMonthIndex = financialYearStartMonth - 1
  let fiscalStartIndex =
    profitDate.getUTCFullYear() * 12 + fiscalStartMonthIndex

  if (profitMonthIndex < fiscalStartIndex) {
    fiscalStartIndex -= 12
  }

  const offset = profitMonthIndex - fiscalStartIndex
  const seasonStartIndex =
    fiscalStartIndex + Math.floor(offset / spanMonths) * spanMonths

  return {
    periodEnd: monthIndexToPeriodEnd(seasonStartIndex + spanMonths - 1),
    periodStart: monthIndexToDate(seasonStartIndex),
  }
}

function formatSeasonDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(value)
}

export function getBusinessProfitSeasonLabel(
  policy: BusinessProfitSeasonPolicy,
  period: BusinessProfitSeasonPeriod
) {
  const range = `${formatSeasonDate(period.periodStart)} - ${formatSeasonDate(
    period.periodEnd
  )}`

  if (policy.profitDistributionFrequency === "quarterly") {
    return `Quarterly dividend (${range})`
  }

  if (policy.profitDistributionFrequency === "semi_annual") {
    return `Bi-annual dividend (${range})`
  }

  if (policy.profitDistributionFrequency === "ad_hoc") {
    return `Ad hoc dividend (${formatSeasonDate(period.periodEnd)})`
  }

  return `Yearly dividend (${range})`
}

export function getBusinessProfitSeasonKey(
  periodStart: Date | string,
  periodEnd: Date | string
) {
  return `${toBusinessProfitDateOnly(periodStart)}:${toBusinessProfitDateOnly(
    periodEnd
  )}`
}

export function isBusinessProfitDateWithinPeriod(
  dateValue: Date | string,
  period: BusinessProfitSeasonPeriod
) {
  const date = toBusinessProfitDateOnly(dateValue)

  return (
    date >= toBusinessProfitDateOnly(period.periodStart) &&
    date <= toBusinessProfitDateOnly(period.periodEnd)
  )
}
