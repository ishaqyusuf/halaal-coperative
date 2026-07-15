import type { Column, RowSelectionState, Updater } from "@tanstack/react-table"
import { create } from "zustand"
import type { ShareApplication } from "@/components/tables/share-applications/columns"

interface ShareApplicationsState {
  columns: Column<ShareApplication, unknown>[]
  rowSelection: RowSelectionState
  setColumns: (columns?: Column<ShareApplication, unknown>[]) => void
  setRowSelection: (updater: Updater<RowSelectionState>) => void
}

export const useShareApplicationsStore = create<ShareApplicationsState>()(
  (set) => ({
    columns: [],
    rowSelection: {},
    setColumns: (columns) => set({ columns: columns || [] }),
    setRowSelection: (updater) =>
      set((state) => ({
        rowSelection:
          typeof updater === "function" ? updater(state.rowSelection) : updater,
      })),
  })
)
