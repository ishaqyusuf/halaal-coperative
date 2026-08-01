type BusinessFilters = {
  dividendPeriodId: string | null
  hasProfitEntries: boolean | null
  profitStatus: string | null
  q: string | null
  sourceType: string | null
  startFrom: string | null
  startTo: string | null
  status: string | null
}

type BusinessSortField =
  | "name"
  | "startDate"
  | "capitalAmount"
  | "profitAmount"
  | "status"

function getSort(
  sort?: string[] | null
): [BusinessSortField, "asc" | "desc"] | null {
  if (!sort || sort.length !== 2) return null

  const field = sort[0]
  const direction = sort[1]
  const validFields = new Set<string>([
    "name",
    "startDate",
    "capitalAmount",
    "profitAmount",
    "status",
  ])

  if (!field || !validFields.has(field)) return null
  if (direction !== "asc" && direction !== "desc") return null

  return [field as BusinessSortField, direction]
}

function getEnumValue<TValue extends string>(
  value: string | null,
  validValues: readonly TValue[]
) {
  return validValues.includes(value as TValue) ? (value as TValue) : undefined
}

export function getBusinessesListInput(
  filters: BusinessFilters,
  sort?: string[] | null,
  search = filters.q
) {
  return {
    dividendPeriodId: filters.dividendPeriodId ?? undefined,
    hasProfitEntries: filters.hasProfitEntries ?? undefined,
    profitStatus: getEnumValue(filters.profitStatus, [
      "draft",
      "pending",
      "reviewed",
      "completed",
      "approved",
      "archived",
    ] as const),
    q: search ?? undefined,
    sort: getSort(sort),
    sourceType: getEnumValue(filters.sourceType, [
      "manual",
      "backfill",
      "import",
    ] as const),
    startFrom: filters.startFrom ?? undefined,
    startTo: filters.startTo ?? undefined,
    status: getEnumValue(filters.status, [
      "planned",
      "active",
      "completed",
      "archived",
    ] as const),
  }
}
