"use client"

import { TableSkeleton } from "@/components/tables/core"
import { STICKY_COLUMNS } from "@/utils/table-configs"
import { columns, type Member } from "./columns"
import { MembersMobileSkeleton } from "./mobile-skeleton"

export function MembersSkeleton() {
  return (
    <>
      <div className="md:hidden">
        <MembersMobileSkeleton />
      </div>
      <div className="hidden md:block">
        <TableSkeleton<Member>
          columns={columns}
          rowCount={10}
          stickyColumnIds={STICKY_COLUMNS.members.map((column) => column.id)}
        />
      </div>
    </>
  )
}
