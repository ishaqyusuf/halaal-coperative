import { TableSkeleton } from "@/components/tables/core"
import { Skeleton } from "@halaalvest/ui/components/skeleton"
import { columns } from "./columns"
import type { ChargeLibraryRow } from "./data-table"

export function ChargeLibrarySkeleton() {
  return (
    <>
      <div className="divide-y divide-border border-y border-border md:hidden">
        {Array.from({ length: 6 }).map((_, index) => (
          <div className="space-y-3 py-4" key={index}>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="size-11" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
      <div className="hidden md:block">
        <TableSkeleton<ChargeLibraryRow>
          columns={columns}
          rowCount={8}
          stickyColumnIds={["charge"]}
        />
      </div>
    </>
  )
}
