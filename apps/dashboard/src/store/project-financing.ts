import type { Column, RowSelectionState, Updater } from "@tanstack/react-table"
import { create } from "zustand"
import type { ProjectFinancingRequest } from "@/components/tables/project-financing/columns"

interface ProjectFinancingState {
  columns: Column<ProjectFinancingRequest, unknown>[]
  rowSelection: RowSelectionState
  setColumns: (columns?: Column<ProjectFinancingRequest, unknown>[]) => void
  setRowSelection: (updater: Updater<RowSelectionState>) => void
}

export const useProjectFinancingStore = create<ProjectFinancingState>()(
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
