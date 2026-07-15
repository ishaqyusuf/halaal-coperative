import { TableSkeleton } from "@/components/tables/core"
import { portfolioColumns } from "./portfolio-columns"
import type { LoanPortfolioRow } from "./portfolio-table"
import { requestColumns } from "./request-columns"
import type { LoanRequestRow } from "./requests-table"

export function LoanPortfolioSkeleton() {
  return (
    <TableSkeleton<LoanPortfolioRow>
      columns={portfolioColumns}
      rowCount={8}
      stickyColumnIds={["member", "actions"]}
    />
  )
}

export function LoanRequestsSkeleton() {
  return (
    <TableSkeleton<LoanRequestRow>
      columns={requestColumns}
      rowCount={8}
      stickyColumnIds={["member", "actions"]}
    />
  )
}
