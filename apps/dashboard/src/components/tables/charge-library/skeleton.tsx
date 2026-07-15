import { TableSkeleton } from "@/components/tables/core"
import { columns } from "./columns"
import type { ChargeLibraryRow } from "./data-table"

export function ChargeLibrarySkeleton() {
  return (
    <TableSkeleton<ChargeLibraryRow>
      columns={columns}
      rowCount={8}
      stickyColumnIds={["charge"]}
    />
  )
}
