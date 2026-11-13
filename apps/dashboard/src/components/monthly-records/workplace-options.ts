import type { MonthlyRecordMemberRow } from "@halaalvest/db"

export type WorkplaceOption = {
  id: string
  memberCount: number
  name: string
  unpaidCount: number
}

// A member can be received in bulk while their row is still unpaid and has an
// amount due. The server applies the same rule.
export function isReceivable(row: MonthlyRecordMemberRow) {
  return row.status === "pending" && row.totalPayableAmount > 0
}

// Workplaces come from the month's own rows, so the page needs no extra query.
export function getWorkplaceOptions(
  rows: MonthlyRecordMemberRow[]
): WorkplaceOption[] {
  const byId = new Map<string, WorkplaceOption>()

  for (const row of rows) {
    if (!row.workplaceId || !row.workplaceName) continue
    const option = byId.get(row.workplaceId) ?? {
      id: row.workplaceId,
      memberCount: 0,
      name: row.workplaceName,
      unpaidCount: 0,
    }
    option.memberCount += 1
    if (isReceivable(row)) option.unpaidCount += 1
    byId.set(row.workplaceId, option)
  }

  return [...byId.values()].sort((left, right) =>
    left.name.localeCompare(right.name)
  )
}
