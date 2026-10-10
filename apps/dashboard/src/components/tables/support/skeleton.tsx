import { TableSkeleton } from "@/components/tables/core"
import type { TableSettings } from "@/utils/table-settings"
import { columns, type SupportCase } from "./columns"
import { SupportMobileSkeleton } from "./mobile-skeleton"

export function SupportSkeleton({
  initialSettings,
}: {
  initialSettings?: Partial<TableSettings>
}) {
  return (
    <>
      <div className="md:hidden">
        <SupportMobileSkeleton />
      </div>
      <div className="hidden md:block">
        <TableSkeleton<SupportCase>
          columnOrder={initialSettings?.order ?? []}
          columnSizing={initialSettings?.sizing ?? {}}
          columnVisibility={initialSettings?.columns ?? {}}
          columns={columns}
          rowCount={8}
          stickyColumnIds={["case"]}
        />
      </div>
    </>
  )
}
