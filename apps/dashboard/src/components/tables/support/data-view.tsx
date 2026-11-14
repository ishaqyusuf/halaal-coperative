"use client"

import { ResponsiveDataView } from "@/components/tables/core/responsive-data-view"
import type { TableSettings } from "@/utils/table-settings"
import { SupportDataTable } from "./data-table"
import { SupportMobileList } from "./mobile-list"
import { SupportSkeleton } from "./skeleton"

export function SupportDataView({
  initialSettings,
  mode,
}: {
  initialSettings?: Partial<TableSettings>
  mode: "member" | "staff"
}) {
  return (
    <ResponsiveDataView
      desktop={
        <SupportDataTable
          initialSettings={initialSettings}
          mode={mode}
        />
      }
      fallback={<SupportSkeleton initialSettings={initialSettings} />}
      mobile={
<SupportMobileList mode={mode} />
      }
    />
  )
}
