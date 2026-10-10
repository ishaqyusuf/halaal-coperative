import type { Column } from "@tanstack/react-table"
import { create } from "zustand"
import type { ProjectFinancingRequest } from "@/components/tables/project-financing/columns"

interface ProjectFinancingState {
  columns: Column<ProjectFinancingRequest, unknown>[]
  setColumns: (columns?: Column<ProjectFinancingRequest, unknown>[]) => void
}

export const useProjectFinancingStore = create<ProjectFinancingState>()(
  (set) => ({
    columns: [],
    setColumns: (columns) => set({ columns: columns || [] }),
  })
)
