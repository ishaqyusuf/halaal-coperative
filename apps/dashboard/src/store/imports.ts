import type { Column } from "@tanstack/react-table"
import { create } from "zustand"
import type { ImportBatchRow } from "@/components/tables/imports/data-table"

interface ImportState {
  columns: Column<ImportBatchRow, unknown>[]
  setColumns: (columns?: Column<ImportBatchRow, unknown>[]) => void
}

export const useImportStore = create<ImportState>()((set) => ({
  columns: [],
  setColumns: (columns) => set({ columns: columns || [] }),
}))
