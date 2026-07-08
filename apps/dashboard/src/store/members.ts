import type { Column, RowSelectionState, Updater } from "@tanstack/react-table"
import { create } from "zustand"

interface MembersState {
  columns: Column<any, unknown>[]
  rowSelection: RowSelectionState
  setColumns: (columns?: Column<any, unknown>[]) => void
  setRowSelection: (updater: Updater<RowSelectionState>) => void
}

export const useMembersStore = create<MembersState>()((set) => ({
  columns: [],
  rowSelection: {},
  setColumns: (columns) => set({ columns: columns || [] }),
  setRowSelection: (updater) =>
    set((state) => ({
      rowSelection:
        typeof updater === "function" ? updater(state.rowSelection) : updater,
    })),
}))
