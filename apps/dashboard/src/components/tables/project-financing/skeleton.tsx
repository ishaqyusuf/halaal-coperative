import { TableSkeleton } from "@/components/tables/core"
import { columns, type ProjectFinancingRequest } from "./columns"

export function ProjectFinancingSkeleton() {
  return (
    <TableSkeleton<ProjectFinancingRequest>
      columns={columns}
      rowCount={8}
      stickyColumnIds={["request"]}
    />
  )
}
