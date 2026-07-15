import { TableSkeleton } from "@/components/tables/core"
import { columns, type ContributionLedgerRow } from "./columns"

export function ContributionsSkeleton() {
  return (
    <TableSkeleton<ContributionLedgerRow>
      columns={columns}
      rowCount={8}
      stickyColumnIds={["member"]}
    />
  )
}
