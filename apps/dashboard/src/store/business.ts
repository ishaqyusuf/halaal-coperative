import type { Column, RowSelectionState, Updater } from "@tanstack/react-table"
import { create } from "zustand"
import type { Business } from "@/components/tables/business/columns"

interface BusinessState {
  columns: Column<Business, unknown>[]
  rowSelection: RowSelectionState
  setColumns: (columns?: Column<Business, unknown>[]) => void
  setRowSelection: (updater: Updater<RowSelectionState>) => void
}

export const useBusinessStore = create<BusinessState>()((set) => ({
  columns: [],
  rowSelection: {},
  setColumns: (columns) => set({ columns: columns || [] }),
  setRowSelection: (updater) =>
    set((state) => ({
      rowSelection:
        typeof updater === "function" ? updater(state.rowSelection) : updater,
    })),
}))
