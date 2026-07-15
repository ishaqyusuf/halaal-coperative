import type { Column } from "@tanstack/react-table"
import { create } from "zustand"
import type { Share } from "@/components/tables/shares/columns"

interface ShareTableState {
  columns: Column<Share, unknown>[]
  setColumns: (columns?: Column<Share, unknown>[]) => void
}

export const useShareTableStore = create<ShareTableState>()((set) => ({
  columns: [],
  setColumns: (columns) => set({ columns: columns || [] }),
}))
