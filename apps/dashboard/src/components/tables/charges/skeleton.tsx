import { TableSkeleton } from "@/components/tables/core"
import { columns } from "./columns"

export function Loading() {
  return (
    <TableSkeleton
      columns={columns}
      rowCount={8}
      stickyColumnIds={["name"]}
    />
  )
}
