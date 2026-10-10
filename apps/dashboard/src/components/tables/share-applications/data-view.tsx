"use client"

import { Suspense } from "react"
import { ResponsiveDataView } from "@/components/tables/core/responsive-data-view"
import type { TableSettings } from "@/utils/table-settings"
import { ShareApplicationsDataTable } from "./data-table"
import { ShareApplicationsDataErrorBoundary } from "./error-boundary"
import { ShareApplicationsMobileList } from "./mobile-list"
import { ShareApplicationsSkeleton } from "./skeleton"

export function ShareApplicationsDataView({
  canReview = false,
  initialSettings,
}: {
  canReview?: boolean
  initialSettings?: Partial<TableSettings>
}) {
  return (
    <ShareApplicationsDataErrorBoundary>
      <Suspense
        fallback={<ShareApplicationsSkeleton initialSettings={initialSettings} />}
      >
        <ResponsiveDataView
          desktop={
            <ShareApplicationsDataTable
              canReview={canReview}
              initialSettings={initialSettings}
            />
          }
          fallback={
            <ShareApplicationsSkeleton initialSettings={initialSettings} />
          }
          mobile={<ShareApplicationsMobileList canReview={canReview} />}
        />
      </Suspense>
    </ShareApplicationsDataErrorBoundary>
  )
}
