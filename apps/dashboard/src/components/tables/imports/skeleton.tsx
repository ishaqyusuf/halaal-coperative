import { TableSkeleton } from "@/components/tables/core"
import { columns } from "./columns"
import type { ImportBatchRow } from "./data-table"
import { ImportMobileSkeleton } from "./mobile-skeleton"

export function Loading() {
  return (
    <>
      <div className="md:hidden">
        <ImportMobileSkeleton />
      </div>
      <div className="hidden md:block">
        <TableSkeleton<ImportBatchRow>
          columns={columns}
          rowCount={8}
          stickyColumnIds={["import"]}
        />
      </div>
    </>
  )
}
