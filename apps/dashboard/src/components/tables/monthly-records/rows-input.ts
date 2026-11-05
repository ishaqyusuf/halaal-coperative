import type {
  MonthlyRecordMemberStatusValue,
  MonthlyRecordRowSortField,
} from "@halaalvest/db"

const sortFields = new Set<string>([
  "allChargesAmount",
  "contributionAmount",
  "currentBalance",
  "finalIncomeAmount",
  "loanRepaymentAmount",
  "loanStatus",
  "memberName",
  "shareChargeAmount",
  "status",
  "totalPaidAmount",
  "totalPayableAmount",
])

function getSort(
  sort?: string[] | null
): [MonthlyRecordRowSortField, "asc" | "desc"] | undefined {
  if (!sort || sort.length !== 2) return undefined

  const [field, direction] = sort
  if (!field || !sortFields.has(field)) return undefined
  if (direction !== "asc" && direction !== "desc") return undefined

  return [field as MonthlyRecordRowSortField, direction]
}

// Built the same way on the server (hydration) and the client (the query), so
// both produce the same query key.
export function getMonthlyRecordRowsInput(input: {
  monthlyRecordId?: string | null
  q?: string | null
  sort?: string[] | null
  status?: MonthlyRecordMemberStatusValue | null
}) {
  return {
    monthlyRecordId: input.monthlyRecordId ?? undefined,
    q: input.q?.trim() || undefined,
    sort: getSort(input.sort),
    status: input.status ?? undefined,
  }
}
