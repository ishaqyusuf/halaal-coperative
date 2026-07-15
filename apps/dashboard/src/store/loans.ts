import type { Column } from "@tanstack/react-table"
import { create } from "zustand"
import type { LoanPortfolioRow } from "@/components/tables/loans/portfolio-table"
import type { LoanRequestRow } from "@/components/tables/loans/requests-table"

interface LoanTableState {
  portfolioColumns: Column<LoanPortfolioRow, unknown>[]
  requestColumns: Column<LoanRequestRow, unknown>[]
  setPortfolioColumns: (columns?: Column<LoanPortfolioRow, unknown>[]) => void
  setRequestColumns: (columns?: Column<LoanRequestRow, unknown>[]) => void
}

export const useLoanTableStore = create<LoanTableState>()((set) => ({
  portfolioColumns: [],
  requestColumns: [],
  setPortfolioColumns: (columns) => set({ portfolioColumns: columns || [] }),
  setRequestColumns: (columns) => set({ requestColumns: columns || [] }),
}))
