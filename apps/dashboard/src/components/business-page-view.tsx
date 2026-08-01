"use client"

import { Suspense } from "react"
import { useSuspenseQuery } from "@tanstack/react-query"
import {
  CollapsibleSummary,
  ScrollableContent,
} from "@/components/dashboard"
import { BusinessHeader } from "@/components/business-header"
import { BusinessSheet } from "@/components/sheets/business-sheet"
import { BusinessSummary, BusinessSummarySkeleton } from "./business-summary"
import { BusinessDataView } from "./tables/business/data-view"
import { BusinessSkeleton } from "./tables/business/skeleton"
import { useTRPC } from "@/trpc/client"
import type { TableSettings } from "@/utils/table-settings"

export function BusinessPageView({
  initialSettings,
}: {
  initialSettings: Partial<TableSettings>
}) {
  const trpc = useTRPC()
  const { data: setup } = useSuspenseQuery(trpc.business.setup.queryOptions())

  return (
    <ScrollableContent>
      <div className="flex flex-col gap-6">
        <div className="hidden md:block">
          <CollapsibleSummary>
            <Suspense fallback={<BusinessSummarySkeleton />}>
              <BusinessSummary />
            </Suspense>
          </CollapsibleSummary>
        </div>

        <BusinessPageTitle />

        {setup.isLocked ? (
          <div className="border-b border-border/70 pb-6 text-sm text-muted-foreground">
            Business records are locked until migration reaches live
            operations.
          </div>
        ) : null}

        <BusinessHeader
          canRecordBusiness={!setup.isLocked}
          canReviewNoProfit={setup.canReviewNoProfit}
          dividendPeriods={setup.dividendPeriods}
        />

        <Suspense
          fallback={<BusinessSkeleton initialSettings={initialSettings} />}
        >
          <BusinessDataView
            initialSettings={initialSettings}
            isLocked={setup.isLocked}
          />
        </Suspense>

        <BusinessSheet />
      </div>
    </ScrollableContent>
  )
}

function BusinessPageTitle() {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase">
        Finance
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-foreground">Business</h1>
    </div>
  )
}
