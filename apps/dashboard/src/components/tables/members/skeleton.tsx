import { TableSkeleton } from "@/components/tables/core"
import { memberColumns, type MemberTableRow } from "./columns"

export function MembersSkeleton() {
  return <TableSkeleton<MemberTableRow> columns={memberColumns} rowCount={10} />
}
