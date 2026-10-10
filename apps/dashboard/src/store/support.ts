import type { Column } from "@tanstack/react-table"
import { create } from "zustand"
import type { SupportCase } from "@/components/tables/support/columns"

interface SupportState {
  columns: Column<SupportCase, unknown>[]
  setColumns: (columns?: Column<SupportCase, unknown>[]) => void
}

export const useSupportStore = create<SupportState>()((set) => ({
  columns: [],
  setColumns: (columns) => set({ columns: columns || [] }),
}))
