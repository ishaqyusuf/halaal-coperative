import { TableSkeleton } from "@/components/tables/core"
import { Skeleton } from "@halaalvest/ui/components/skeleton"
import type { TableSettings } from "@/utils/table-settings"
import { columns, type PaymentReceipt } from "./columns"

export function PaymentReceiptsSkeleton({
  initialSettings,
}: {
  initialSettings?: Partial<TableSettings>
}) {
  return (
    <>
      <div className="divide-y divide-border border-y border-border md:hidden">
        {Array.from({ length: 5 }, (_, index) => (
          <div className="space-y-4 py-4" key={index}>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="size-11" />
            </div>
            <Skeleton className="h-6 w-24" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="ml-auto h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
      <div className="hidden md:block">
        <TableSkeleton<PaymentReceipt>
          columns={columns}
          columnOrder={initialSettings?.order}
          columnSizing={initialSettings?.sizing}
          columnVisibility={initialSettings?.columns}
          rowCount={8}
          stickyColumnIds={["receipt"]}
        />
      </div>
    </>
  )
}
