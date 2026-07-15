import type { Column } from "@tanstack/react-table"
import { create } from "zustand"
import type { AuditTableRow } from "@/components/tables/audit/data-table"

interface AuditTableState {
  columns: Column<AuditTableRow, unknown>[]
  setColumns: (columns?: Column<AuditTableRow, unknown>[]) => void
}

export const useAuditTableStore = create<AuditTableState>()((set) => ({
  columns: [],
  setColumns: (columns) => set({ columns: columns || [] }),
}))
