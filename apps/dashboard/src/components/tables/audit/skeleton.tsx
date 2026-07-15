import { TableSkeleton } from "@/components/tables/core"
import type { AuditTableRow } from "./data-table"
import { columns } from "./columns"

export function AuditSkeleton() {
  return (
    <TableSkeleton<AuditTableRow>
      columns={columns}
      rowCount={8}
      stickyColumnIds={["action"]}
    />
  )
}
