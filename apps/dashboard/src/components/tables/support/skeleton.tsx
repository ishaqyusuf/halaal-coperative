import { TableSkeleton } from "@/components/tables/core"
import { columns, type SupportCase } from "./columns"

export function SupportSkeleton() {
  return (
    <TableSkeleton<SupportCase>
      columns={columns}
      rowCount={8}
      stickyColumnIds={["case"]}
    />
  )
}
