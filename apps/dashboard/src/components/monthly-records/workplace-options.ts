import type { MonthlyRecordActionRow } from "@halaalvest/db"

// A member can be received in bulk while their row is unpaid and has an amount due.
export function isReceivable(row: MonthlyRecordActionRow) {
  return row.status === "pending" && row.totalPayableAmount > 0
}
