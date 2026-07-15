import type { Column } from "@tanstack/react-table"
import { create } from "zustand"
import type { MonthlyRecordMemberTableRow } from "@/components/tables/monthly-records/data-table"

interface MonthlyRecordsTableState {
  columns: Column<MonthlyRecordMemberTableRow, unknown>[]
  setColumns: (
    columns?: Column<MonthlyRecordMemberTableRow, unknown>[]
  ) => void
}

export const useMonthlyRecordsTableStore =
  create<MonthlyRecordsTableState>()((set) => ({
    columns: [],
    setColumns: (columns) => set({ columns: columns || [] }),
  }))
