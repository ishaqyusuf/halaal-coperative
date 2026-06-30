import { TableSkeleton } from "@/components/dashboard/static-table"
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
