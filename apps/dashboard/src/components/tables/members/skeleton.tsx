import { TableSkeleton } from "@/components/dashboard/static-table"
import { memberColumns, type MemberTableRow } from "./columns"

export function MembersSkeleton() {
  return <TableSkeleton<MemberTableRow> columns={memberColumns} rowCount={10} />
}
