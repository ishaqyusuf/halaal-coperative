import { TableSkeleton } from "@/components/tables/core"
import { columns, type ProcurementRequest } from "./columns"
import { ProcurementMobileSkeleton } from "./mobile-skeleton"

export function ProcurementSkeleton({
  initialSettings,
}: {
  initialSettings?: Partial<import("@/utils/table-settings").TableSettings>
}) {
  return (
    <>
      <div className="md:hidden">
        <ProcurementMobileSkeleton />
      </div>
      <div className="hidden md:block">
        <TableSkeleton<ProcurementRequest>
          columnOrder={initialSettings?.order ?? []}
          columnSizing={initialSettings?.sizing ?? {}}
          columnVisibility={initialSettings?.columns ?? {}}
          columns={columns}
          rowCount={8}
          stickyColumnIds={["request"]}
        />
      </div>
    </>
  )
}
