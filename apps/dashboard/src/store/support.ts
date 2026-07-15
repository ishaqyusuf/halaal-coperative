import type { Column, RowSelectionState, Updater } from "@tanstack/react-table"
import { create } from "zustand"
import type { SupportCase } from "@/components/tables/support/columns"

interface SupportState {
  columns: Column<SupportCase, unknown>[]
  rowSelection: RowSelectionState
  setColumns: (columns?: Column<SupportCase, unknown>[]) => void
  setRowSelection: (updater: Updater<RowSelectionState>) => void
}

export const useSupportStore = create<SupportState>()((set) => ({
  columns: [],
  rowSelection: {},
  setColumns: (columns) => set({ columns: columns || [] }),
  setRowSelection: (updater) =>
    set((state) => ({
      rowSelection:
        typeof updater === "function" ? updater(state.rowSelection) : updater,
    })),
}))
