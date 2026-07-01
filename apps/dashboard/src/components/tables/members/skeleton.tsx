"use client"

import { TableSkeleton } from "@/components/tables/core"
import { STICKY_COLUMNS } from "@/utils/table-configs"
import { columns, type Member } from "./columns"

export function MembersSkeleton() {
  return (
    <TableSkeleton<Member>
      columns={columns}
      rowCount={10}
      stickyColumnIds={STICKY_COLUMNS.members.map((column) => column.id)}
    />
  )
}
