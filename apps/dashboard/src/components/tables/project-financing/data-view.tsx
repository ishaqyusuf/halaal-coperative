"use client"

import { Suspense } from "react"
import { ResponsiveDataView } from "@/components/tables/core/responsive-data-view"
import type { TableSettings } from "@/utils/table-settings"
import { ProjectFinancingDataTable } from "./data-table"
import { ProjectFinancingDataErrorBoundary } from "./error-boundary"
import { ProjectFinancingMobileList } from "./mobile-list"
import { ProjectFinancingSkeleton } from "./skeleton"

export function ProjectFinancingDataView({
  canReview,
  initialSettings,
}: {
  canReview: boolean
  initialSettings?: Partial<TableSettings>
}) {
  return (
    <ProjectFinancingDataErrorBoundary>
      <Suspense
        fallback={<ProjectFinancingSkeleton initialSettings={initialSettings} />}
      >
        <ResponsiveDataView
          desktop={
            <ProjectFinancingDataTable
              canReview={canReview}
              initialSettings={initialSettings}
            />
          }
          fallback={<ProjectFinancingSkeleton initialSettings={initialSettings} />}
          mobile={<ProjectFinancingMobileList canReview={canReview} />}
        />
      </Suspense>
    </ProjectFinancingDataErrorBoundary>
  )
}
