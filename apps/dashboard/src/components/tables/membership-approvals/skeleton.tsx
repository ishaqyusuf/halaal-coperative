import { TableSkeleton } from "@/components/tables/core"
import { columns } from "./columns"
import type { MembershipApprovalRow } from "./data-table"

export function MembershipApprovalsSkeleton() {
  return (
    <TableSkeleton<MembershipApprovalRow>
      columns={columns}
      rowCount={8}
      stickyColumnIds={["applicant", "actions"]}
    />
  )
}
