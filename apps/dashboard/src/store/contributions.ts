import type { Column } from "@tanstack/react-table"
import { create } from "zustand"
import type { ContributionLedgerRow } from "@/components/tables/contributions/columns"

interface ContributionsTableState {
  columns: Column<ContributionLedgerRow, unknown>[]
  setColumns: (columns?: Column<ContributionLedgerRow, unknown>[]) => void
}

export const useContributionsTableStore =
  create<ContributionsTableState>()((set) => ({
    columns: [],
    setColumns: (columns) => set({ columns: columns || [] }),
  }))
