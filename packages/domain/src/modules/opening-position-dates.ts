/**
 * Date rules for a member's brought-forward opening position. A member cannot
 * hold a balance, or have taken on financing, procurement or a food purchase,
 * before they joined the cooperative. Dates are ISO calendar dates
 * (`YYYY-MM-DD`), which compare correctly as strings.
 */

export type OpeningPositionDateField =
  | "activeFinancingOpenedAt"
  | "foodPurchaseOpenedAt"
  | "openingDate"
  | "procurementOpenedAt"

export type OpeningPositionDates = Partial<
  Record<OpeningPositionDateField, string | null | undefined>
>

export type OpeningPositionDateIssue = {
  field: OpeningPositionDateField
  message: string
}

const openingPositionDateLabels: Record<OpeningPositionDateField, string> = {
  activeFinancingOpenedAt: "Financing start date",
  foodPurchaseOpenedAt: "Food purchase start date",
  openingDate: "Opening date",
  procurementOpenedAt: "Procurement start date",
}

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/

function toIsoDate(value: string | null | undefined) {
  const date = value?.trim().slice(0, 10) ?? ""

  return isoDatePattern.test(date) ? date : null
}

function formatIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)

  return new Date(Date.UTC(year!, month! - 1, day!)).toLocaleDateString(
    "en-GB",
    { day: "numeric", month: "short", timeZone: "UTC", year: "numeric" }
  )
}

function addMonths(value: string, months: number) {
  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(Date.UTC(year!, month! - 1 + months, day!))

  return date.toISOString().slice(0, 10)
}

function latest(...values: Array<string | null>) {
  return values
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null
}

/**
 * The opening date to suggest: the later of the cooperative's first month of
 * records and the day the member joined.
 */
export function getDefaultOpeningPositionDate({
  joinedAt,
  tenantStartDate,
}: {
  joinedAt: string | null | undefined
  tenantStartDate: string | null | undefined
}) {
  return latest(toIsoDate(tenantStartDate), toIsoDate(joinedAt)) ?? ""
}

/** Lists every opening-position date that falls before the member joined. */
export function findOpeningPositionDateIssues({
  dates,
  joinedAt,
}: {
  dates: OpeningPositionDates
  joinedAt: string | null | undefined
}): OpeningPositionDateIssue[] {
  const joined = toIsoDate(joinedAt)

  if (!joined) {
    return []
  }

  const issues: OpeningPositionDateIssue[] = []

  for (const field of Object.keys(
    openingPositionDateLabels
  ) as OpeningPositionDateField[]) {
    const value = toIsoDate(dates[field])

    if (value && value < joined) {
      issues.push({
        field,
        message: `${openingPositionDateLabels[field]} (${formatIsoDate(value)}) is before this member joined on ${formatIsoDate(joined)}.`,
      })
    }
  }

  return issues
}

/**
 * Quick Fill start dates for the sample obligations, counted back from the
 * opening date to match the sample instalments already paid, and never
 * earlier than the member's joined date.
 */
export function getOpeningPositionQuickFillDates({
  joinedAt,
  openingDate,
}: {
  joinedAt: string | null | undefined
  openingDate: string
}) {
  const opening = toIsoDate(openingDate)
  const joined = toIsoDate(joinedAt)

  if (!opening) {
    return {
      activeFinancingOpenedAt: "",
      foodPurchaseOpenedAt: "",
      procurementOpenedAt: "",
    }
  }

  const clamp = (value: string) => latest(value, joined) ?? value

  return {
    activeFinancingOpenedAt: clamp(addMonths(opening, -5)),
    foodPurchaseOpenedAt: clamp(addMonths(opening, -1)),
    procurementOpenedAt: opening,
  }
}
