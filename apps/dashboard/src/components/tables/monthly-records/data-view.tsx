"use client"

import { Suspense } from "react"
import { ResponsiveDataView } from "@/components/tables/core/responsive-data-view"
import type { TableSettings } from "@/utils/table-settings"
import { MonthlyRecordsDataTable } from "./data-table"
import { MonthlyRecordsDataErrorBoundary } from "./error-boundary"
import { MonthlyRecordsMobileList } from "./mobile-list"
import { MonthlyRecordsSkeleton } from "./skeleton"

type MonthlyRecordsDataViewProps = {
  initialSettings?: Partial<TableSettings>
  month?: number
  monthlyRecordId?: string | null
  periodLabel?: string
  year?: number
}

// Desktop table and phone list share one query (`useMonthlyRecordsQuery`).
export function MonthlyRecordsDataView({
  initialSettings,
  ...props
}: MonthlyRecordsDataViewProps) {
  return (
    <MonthlyRecordsDataErrorBoundary>
      <Suspense fallback={<MonthlyRecordsSkeleton />}>
        <ResponsiveDataView
          desktop={
            <MonthlyRecordsDataTable initialSettings={initialSettings} {...props} />
          }
          fallback={<MonthlyRecordsSkeleton />}
          mobile={<MonthlyRecordsMobileList {...props} />}
        />
      </Suspense>
    </MonthlyRecordsDataErrorBoundary>
  )
}
