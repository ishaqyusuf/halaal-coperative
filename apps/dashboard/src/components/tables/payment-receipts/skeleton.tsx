import { TableSkeleton } from "@/components/tables/core"
import { columns, type PaymentReceipt } from "./columns"

export function PaymentReceiptsSkeleton() {
  return (
    <TableSkeleton<PaymentReceipt>
      columns={columns}
      rowCount={8}
      stickyColumnIds={["receipt"]}
    />
  )
}
