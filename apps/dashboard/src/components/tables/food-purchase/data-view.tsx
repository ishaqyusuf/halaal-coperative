"use client"

import { Suspense } from "react"
import { ResponsiveDataView } from "@/components/tables/core/responsive-data-view"
import type { TableSettings } from "@/utils/table-settings"
import { FoodPurchaseDataTable } from "./data-table"
import { FoodPurchaseDataErrorBoundary } from "./error-boundary"
import { FoodPurchaseMobileList } from "./mobile-list"
import { FoodPurchaseSkeleton } from "./skeleton"

export function FoodPurchaseDataView({
  canReviewApplications,
  initialSettings,
}: {
  canReviewApplications: boolean
  initialSettings?: Partial<TableSettings>
}) {
  return (
    <FoodPurchaseDataErrorBoundary>
      <Suspense
        fallback={<FoodPurchaseSkeleton initialSettings={initialSettings} />}
      >
        <ResponsiveDataView
          desktop={
            <FoodPurchaseDataTable
              canReviewApplications={canReviewApplications}
              initialSettings={initialSettings}
            />
          }
          fallback={<FoodPurchaseSkeleton initialSettings={initialSettings} />}
          mobile={
            <FoodPurchaseMobileList
              canReviewApplications={canReviewApplications}
            />
          }
        />
      </Suspense>
    </FoodPurchaseDataErrorBoundary>
  )
}
