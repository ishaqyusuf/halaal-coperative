import { TableSkeleton } from "@/components/tables/core"
import { columns } from "./columns"

export function ShareSkeleton() {
  return (
    <TableSkeleton
      columns={columns}
      rowCount={6}
      stickyColumnIds={["effectiveFrom"]}
    />
  )
}
