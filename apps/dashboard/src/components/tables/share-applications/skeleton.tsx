import { TableSkeleton } from "@/components/tables/core"
import { columns, type ShareApplication } from "./columns"
import { ShareApplicationsMobileSkeleton } from "./mobile-skeleton"

export function ShareApplicationsSkeleton({
  initialSettings,
}: {
  initialSettings?: Partial<import("@/utils/table-settings").TableSettings>
}) {
  return (
    <>
      <div className="md:hidden">
        <ShareApplicationsMobileSkeleton />
      </div>
      <div className="hidden md:block">
        <TableSkeleton<ShareApplication>
          columnOrder={initialSettings?.order ?? []}
          columnSizing={initialSettings?.sizing ?? {}}
          columnVisibility={initialSettings?.columns ?? {}}
          columns={columns}
          rowCount={8}
          stickyColumnIds={["application"]}
        />
      </div>
    </>
  )
}
