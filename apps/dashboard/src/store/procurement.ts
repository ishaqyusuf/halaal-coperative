import type { Column } from "@tanstack/react-table"
import { create } from "zustand"
import type { ProcurementRequest } from "@/components/tables/procurement/columns"

interface ProcurementState {
  columns: Column<ProcurementRequest, unknown>[]
  setColumns: (columns?: Column<ProcurementRequest, unknown>[]) => void
}

export const useProcurementStore = create<ProcurementState>()((set) => ({
  columns: [],
  setColumns: (columns) => set({ columns: columns || [] }),
}))
