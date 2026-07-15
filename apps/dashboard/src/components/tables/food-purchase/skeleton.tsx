import { TableSkeleton } from "@/components/tables/core"
import { columns, type FoodPurchaseApplication } from "./columns"

export function FoodPurchaseSkeleton() {
  return (
    <TableSkeleton<FoodPurchaseApplication>
      columns={columns}
      rowCount={8}
      stickyColumnIds={["application"]}
    />
  )
}
