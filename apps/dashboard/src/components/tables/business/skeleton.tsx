import { TableSkeleton } from "@/components/tables/core"
import type { TableSettings } from "@/utils/table-settings"
import { columns, type Business } from "./columns"
import { BusinessMobileSkeleton } from "./mobile-skeleton"

export function BusinessSkeleton({
  initialSettings,
}: {
  initialSettings?: Partial<TableSettings>
}) {
  return (
    <>
      <div className="md:hidden">
        <BusinessMobileSkeleton />
      </div>
      <div className="hidden md:block">
        <TableSkeleton<Business>
          columnOrder={initialSettings?.order ?? []}
          columnSizing={initialSettings?.sizing ?? {}}
          columnVisibility={initialSettings?.columns ?? {}}
          columns={columns}
          rowCount={8}
          stickyColumnIds={["select", "business"]}
        />
      </div>
    </>
  )
}
