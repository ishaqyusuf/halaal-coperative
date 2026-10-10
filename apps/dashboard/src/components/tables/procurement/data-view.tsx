"use client"

import { Suspense } from "react"
import { ResponsiveDataView } from "@/components/tables/core/responsive-data-view"
import type { TableSettings } from "@/utils/table-settings"
import { ProcurementDataTable } from "./data-table"
import { ProcurementDataErrorBoundary } from "./error-boundary"
import { ProcurementMobileList } from "./mobile-list"
import { ProcurementSkeleton } from "./skeleton"

export function ProcurementDataView({
  canReview,
  initialSettings,
}: {
  canReview: boolean
  initialSettings?: Partial<TableSettings>
}) {
  return (
    <ProcurementDataErrorBoundary>
      <Suspense
        fallback={<ProcurementSkeleton initialSettings={initialSettings} />}
      >
        <ResponsiveDataView
          desktop={
            <ProcurementDataTable
              canReview={canReview}
              initialSettings={initialSettings}
            />
          }
          fallback={<ProcurementSkeleton initialSettings={initialSettings} />}
          mobile={<ProcurementMobileList canReview={canReview} />}
        />
      </Suspense>
    </ProcurementDataErrorBoundary>
  )
}
