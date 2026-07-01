import type { Column } from "@tanstack/react-table"
import { create } from "zustand"

interface MembersState {
  columns: Column<any, unknown>[]
  setColumns: (columns?: Column<any, unknown>[]) => void
}

export const useMembersStore = create<MembersState>()((set) => ({
  columns: [],
  setColumns: (columns) => set({ columns: columns || [] }),
}))

