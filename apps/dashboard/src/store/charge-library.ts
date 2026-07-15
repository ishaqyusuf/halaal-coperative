import type { Column } from "@tanstack/react-table"
import { create } from "zustand"
import type { ChargeLibraryRow } from "@/components/tables/charge-library/data-table"

interface ChargeLibraryTableState {
  columns: Column<ChargeLibraryRow, unknown>[]
  setColumns: (columns?: Column<ChargeLibraryRow, unknown>[]) => void
}

export const useChargeLibraryTableStore = create<ChargeLibraryTableState>()(
  (set) => ({
    columns: [],
    setColumns: (columns) => set({ columns: columns || [] }),
  })
)
