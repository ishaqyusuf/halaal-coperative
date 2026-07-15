import { TableSkeleton } from "@/components/tables/core"
import { columns, type ShareApplication } from "./columns"

export function ShareApplicationsSkeleton() {
  return (
    <TableSkeleton<ShareApplication>
      columns={columns}
      rowCount={8}
      stickyColumnIds={["application"]}
    />
  )
}
