import { TableSkeleton } from "@/components/tables/core"
import { columns } from "./columns"
import type { NotificationDeliveryRow } from "./data-table"

export function NotificationsSkeleton() {
  return (
    <TableSkeleton<NotificationDeliveryRow>
      columns={columns}
      rowCount={8}
      stickyColumnIds={["subject"]}
    />
  )
}
