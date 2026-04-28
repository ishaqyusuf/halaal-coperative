import { TableSkeleton } from "@/components/tables/core"
import {
  contributionColumns,
  type ContributionLedgerRow,
} from "./columns"

export function ContributionsSkeleton() {
  return (
    <TableSkeleton<ContributionLedgerRow>
      columns={contributionColumns}
      rowCount={8}
    />
  )
}
