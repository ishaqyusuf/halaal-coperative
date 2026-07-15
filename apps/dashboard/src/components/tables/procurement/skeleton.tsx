import { TableSkeleton } from "@/components/tables/core"
import { columns, type ProcurementRequest } from "./columns"

export function ProcurementSkeleton() {
  return (
    <TableSkeleton<ProcurementRequest>
      columns={columns}
      rowCount={8}
      stickyColumnIds={["request"]}
    />
  )
}
