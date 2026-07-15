import type { Column } from "@tanstack/react-table"
import { create } from "zustand"
import type { Charge } from "@/components/tables/charges/columns"

interface ChargeTableState {
  columns: Column<Charge, unknown>[]
  setColumns: (columns?: Column<Charge, unknown>[]) => void
}

export const useChargeTableStore = create<ChargeTableState>()((set) => ({
  columns: [],
  setColumns: (columns) => set({ columns: columns || [] }),
}))
