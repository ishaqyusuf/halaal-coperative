"use client"

import { ResponsiveDataView } from "@/components/tables/core/responsive-data-view"
import type { TableSettings } from "@/utils/table-settings"
import { BusinessDataTable } from "./data-table"
import { BusinessMobileList } from "./mobile-list"
import { BusinessSkeleton } from "./skeleton"

export function BusinessDataView({
  initialSettings,
  isLocked,
}: {
  initialSettings?: Partial<TableSettings>
  isLocked: boolean
}) {
  return (
    <ResponsiveDataView
      desktop={
        <BusinessDataTable
          initialSettings={initialSettings}
          isLocked={isLocked}
        />
      }
      fallback={<BusinessSkeleton initialSettings={initialSettings} />}
      mobile={<BusinessMobileList isLocked={isLocked} />}
    />
  )
}
