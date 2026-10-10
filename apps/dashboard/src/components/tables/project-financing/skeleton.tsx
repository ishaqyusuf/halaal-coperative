import { TableSkeleton } from "@/components/tables/core"
import { columns, type ProjectFinancingRequest } from "./columns"
import { ProjectFinancingMobileSkeleton } from "./mobile-skeleton"

export function ProjectFinancingSkeleton({
  initialSettings,
}: {
  initialSettings?: Partial<import("@/utils/table-settings").TableSettings>
}) {
  return (
    <>
      <div className="md:hidden">
        <ProjectFinancingMobileSkeleton />
      </div>
      <div className="hidden md:block">
        <TableSkeleton<ProjectFinancingRequest>
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
