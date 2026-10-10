type ChargeLibrarySortField =
  | "amount"
  | "currentEffectiveFrom"
  | "isActive"
  | "kind"
  | "name"

export type ChargeLibraryFilterParams = {
  frequency: string | null
  q: string | null
  status: string | null
  valueType: string | null
}

const sortFieldMap: Record<string, ChargeLibrarySortField> = {
  amount: "amount",
  charge: "name",
  currentEffectiveFrom: "currentEffectiveFrom",
  effectiveFrom: "currentEffectiveFrom",
  kind: "kind",
  name: "name",
  status: "isActive",
}

export function getChargeLibrarySort(
  sort?: string[] | null
): [ChargeLibrarySortField, "asc" | "desc"] | null {
  if (!sort || sort.length !== 2) return null
  const field = sortFieldMap[sort[0] ?? ""]
  const direction = sort[1]
  if (!field || (direction !== "asc" && direction !== "desc")) return null
  return [field, direction]
}

export function getChargeLibraryListInput(
  filter: ChargeLibraryFilterParams,
  sort?: string[] | null,
  search = filter.q
) {
  return {
    frequency: filter.frequency || undefined,
    q: search || undefined,
    sort: getChargeLibrarySort(sort),
    status: filter.status || undefined,
    valueType: filter.valueType || undefined,
  }
}
