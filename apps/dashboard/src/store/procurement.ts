import type { Column, RowSelectionState, Updater } from "@tanstack/react-table"
import { create } from "zustand"
import type { ProcurementRequest } from "@/components/tables/procurement/columns"

interface ProcurementState {
  columns: Column<ProcurementRequest, unknown>[]
  rowSelection: RowSelectionState
  setColumns: (columns?: Column<ProcurementRequest, unknown>[]) => void
  setRowSelection: (updater: Updater<RowSelectionState>) => void
}

export const useProcurementStore = create<ProcurementState>()((set) => ({
  columns: [],
  rowSelection: {},
  setColumns: (columns) => set({ columns: columns || [] }),
  setRowSelection: (updater) =>
    set((state) => ({
      rowSelection:
        typeof updater === "function" ? updater(state.rowSelection) : updater,
    })),
}))
