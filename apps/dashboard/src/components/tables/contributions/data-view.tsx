"use client"

import { Suspense } from "react"
import { ResponsiveDataView } from "@/components/tables/core/responsive-data-view"
import type { TableSettings } from "@/utils/table-settings"
import { ContributionsDataTable } from "./data-table"
import { ContributionsDataErrorBoundary } from "./error-boundary"
import { ContributionsMobileList } from "./mobile-list"
import { ContributionsMobileSkeleton } from "./mobile-skeleton"
import { ContributionsSkeleton } from "./skeleton"

function ContributionsLoading() {
  return (
    <>
      <div className="md:hidden">
        <ContributionsMobileSkeleton />
      </div>
      <div className="hidden md:block">
        <ContributionsSkeleton />
      </div>
    </>
  )
}

export function ContributionsDataView({
  initialSettings,
}: {
  initialSettings?: Partial<TableSettings>
}) {
  return (
    <ContributionsDataErrorBoundary>
      <Suspense fallback={<ContributionsLoading />}>
        <ResponsiveDataView
          desktop={<ContributionsDataTable initialSettings={initialSettings} />}
          fallback={<ContributionsLoading />}
          mobile={<ContributionsMobileList />}
        />
      </Suspense>
    </ContributionsDataErrorBoundary>
  )
}
