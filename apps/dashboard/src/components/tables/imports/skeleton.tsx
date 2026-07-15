import { TableSkeleton } from "@/components/tables/core"
import { columns } from "./columns"
import type { ImportBatchRow } from "./data-table"

export function Loading() {
  return (
    <TableSkeleton<ImportBatchRow>
      columns={columns}
      rowCount={8}
      stickyColumnIds={["import"]}
    />
  )
}
