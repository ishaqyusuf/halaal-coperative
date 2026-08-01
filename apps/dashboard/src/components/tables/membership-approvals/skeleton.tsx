import { TableSkeleton } from "@/components/tables/core"
import type { TableSettings } from "@/utils/table-settings"
import { columns } from "./columns"
import type { MembershipApprovalRow } from "./columns"
import { MembershipApprovalsMobileSkeleton } from "./mobile-skeleton"

export function MembershipApprovalsSkeleton({
  initialSettings,
}: {
  initialSettings?: Partial<TableSettings>
}) {
  return (
    <>
      <div className="md:hidden">
        <MembershipApprovalsMobileSkeleton />
      </div>
      <div className="hidden md:block">
        <TableSkeleton<MembershipApprovalRow>
          columnOrder={initialSettings?.order ?? []}
          columnSizing={initialSettings?.sizing ?? {}}
          columnVisibility={initialSettings?.columns ?? {}}
          columns={columns}
          rowCount={16}
          stickyColumnIds={["applicant", "actions"]}
        />
      </div>
    </>
  )
}
