"use client"

import { ResponsiveDataView } from "@/components/tables/core/responsive-data-view"
import type { TableSettings } from "@/utils/table-settings"
import { MembershipApprovalsDataTable } from "./data-table"
import { MembershipApprovalsMobileList } from "./mobile-list"
import { MembershipApprovalsSkeleton } from "./skeleton"

export function MembershipApprovalsDataView({
  initialSettings,
}: {
  initialSettings?: Partial<TableSettings>
}) {
  return (
    <ResponsiveDataView
      desktop={
        <MembershipApprovalsDataTable initialSettings={initialSettings} />
      }
      fallback={
        <MembershipApprovalsSkeleton initialSettings={initialSettings} />
      }
      mobile={<MembershipApprovalsMobileList />}
    />
  )
}
