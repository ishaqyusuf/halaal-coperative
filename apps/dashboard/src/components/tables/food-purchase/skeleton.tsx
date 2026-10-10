import { TableSkeleton } from "@/components/tables/core"
import type { TableSettings } from "@/utils/table-settings"
import { columns, type FoodPurchaseApplication } from "./columns"
import { FoodPurchaseMobileSkeleton } from "./mobile-skeleton"

export function FoodPurchaseSkeleton({
  initialSettings,
}: {
  initialSettings?: Partial<TableSettings>
}) {
  return (
    <>
      <div className="md:hidden">
        <FoodPurchaseMobileSkeleton />
      </div>
      <div className="hidden md:block">
        <TableSkeleton<FoodPurchaseApplication>
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
