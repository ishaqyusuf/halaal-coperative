"use client"

import { ResponsiveDataView } from "@/components/tables/core/responsive-data-view"
import type { TableSettings } from "@/utils/table-settings"
import { MembersDataTable } from "./data-table"
import { MembersMobileList } from "./mobile-list"
import { MembersSkeleton } from "./skeleton"

export function MembersDataView({
  canManageMembers,
  initialSettings,
}: {
  canManageMembers: boolean
  initialSettings?: Partial<TableSettings>
}) {
  return (
    <ResponsiveDataView
      desktop={
        <MembersDataTable
          canManageMembers={canManageMembers}
          initialSettings={initialSettings}
        />
      }
      fallback={<MembersSkeleton />}
      mobile={<MembersMobileList canManageMembers={canManageMembers} />}
    />
  )
}
