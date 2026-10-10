export type LoanListFilterInput = {
  portfolioStatus?:
    | "active"
    | "approved"
    | "completed"
    | "defaulted"
    | "disbursed"
    | "written_off"
    | null
  q?: string | null
  requestStatus?:
    | "approved"
    | "cancelled"
    | "draft"
    | "expired"
    | "rejected"
    | "submitted"
    | "under_review"
    | null
}

export type LoanRequestSortField = "memberName" | "requestedAt" | "status"

export type LoanPortfolioSortField =
  | "estimatedMonthlyServicing"
  | "loanProductName"
  | "memberName"
  | "status"

type SortDirection = "asc" | "desc"

const requestSortFields = new Set<LoanRequestSortField>([
  "memberName",
  "requestedAt",
  "status",
])

const portfolioSortFields = new Set<LoanPortfolioSortField>([
  "estimatedMonthlyServicing",
  "loanProductName",
  "memberName",
  "status",
])

function normalizeSort<TField extends string>(
  sort: string[] | null | undefined,
  fields: Set<TField>
): [TField, SortDirection] | null {
  if (!sort || sort.length !== 2) return null

  const [field, direction] = sort
  if (!field || !fields.has(field as TField)) return null
  if (direction !== "asc" && direction !== "desc") return null

  return [field as TField, direction]
}

function normalizeSearch(value: string | null | undefined) {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}

export function getLoanRequestListInput(
  filter: LoanListFilterInput,
  sort?: string[] | null,
  memberId?: string
) {
  return {
    memberId,
    q: normalizeSearch(filter.q),
    sort: normalizeSort(sort, requestSortFields),
    status: filter.requestStatus || undefined,
  }
}

export function getLoanPortfolioListInput(
  filter: LoanListFilterInput,
  sort?: string[] | null,
  memberId?: string
) {
  return {
    memberId,
    q: normalizeSearch(filter.q),
    sort: normalizeSort(sort, portfolioSortFields),
    status: filter.portfolioStatus || undefined,
  }
}
