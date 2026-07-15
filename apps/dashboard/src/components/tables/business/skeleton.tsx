import { TableSkeleton } from "@/components/tables/core"
import { columns, type Business } from "./columns"

export function BusinessSkeleton() {
  return (
    <TableSkeleton<Business>
      columns={columns}
      rowCount={8}
      stickyColumnIds={["select", "business"]}
    />
  )
}
