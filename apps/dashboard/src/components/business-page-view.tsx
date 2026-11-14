"use client"

import { useSuspenseQuery } from "@tanstack/react-query"
import { Suspense } from "react"
import { BusinessList, BusinessSearch, BusinessStatusFilter } from "@/components/business/business-list"
import { BusinessSummaryCards } from "@/components/business/business-summary-cards"
import { BusinessViewTabs } from "@/components/business/business-view-tabs"
import { ProfitSeasonList } from "@/components/business/profit-season-list"
import { WorkspacePageShell } from "@/components/dashboard"
import { ListLoadErrorBoundary } from "@/components/list-load-error-boundary"
import { OpenBusinessSheet, OpenReviewNoBusinessProfitSheet } from "@/components/open-business-sheet"
import { PlainListSkeleton } from "@/components/plain-list-skeleton"
import { RequestClosedNotice } from "@/components/requests/request-summary"
import { BusinessSheet } from "@/components/sheets/business-sheet"
import { ProfitSeasonSheet } from "@/components/sheets/profit-season-sheet"
import { useBusinessPageParams } from "@/hooks/use-business-page-params"
import { useTRPC } from "@/trpc/client"

/**
 * `/business`: three totals, then two lists — the businesses, and the
 * profit-sharing seasons. A business and a season each open in a sheet.
 */
export function BusinessPageView({ canManage }: { canManage: boolean }) {
  const trpc = useTRPC()
  // The tab lives in the URL; switching is a client update (the list loads
  // through its own query), so read it here rather than from the server.
  const { view: activeView } = useBusinessPageParams()
  const { data: setup } = useSuspenseQuery(trpc.business.setup.queryOptions())
  const canRecord = canManage && !setup.isLocked

  return (
    <WorkspacePageShell
      description="What the cooperative runs, and the profit it shares."
      eyebrow="Business"
      title="Business"
    >
      <div className="grid gap-6">
        <ListLoadErrorBoundary>
          <Suspense fallback={null}>
            <BusinessSummaryCards />
          </Suspense>
        </ListLoadErrorBoundary>

        {setup.isLocked ? (
          <RequestClosedNotice>
            Businesses can be added once the cooperative is set up.
          </RequestClosedNotice>
        ) : null}

        <div className="grid gap-4">
          <BusinessViewTabs activeView={activeView} />
          <div
            aria-labelledby={`business-${activeView}-tab`}
            className="grid gap-4"
            id="business-active-view"
            role="tabpanel"
          >
            {activeView === "businesses" ? (
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <BusinessSearch />
                  {canManage ? (
                    <div className="grid gap-3 sm:flex">
                      <OpenBusinessSheet disabled={!canRecord} />
                      {setup.canReviewNoProfit ? (
                        <OpenReviewNoBusinessProfitSheet />
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <BusinessStatusFilter />
                <ListLoadErrorBoundary>
                  <Suspense fallback={<PlainListSkeleton />}>
                    <BusinessList canRecord={canRecord} />
                  </Suspense>
                </ListLoadErrorBoundary>
              </>
            ) : (
              <ListLoadErrorBoundary>
                <Suspense fallback={<PlainListSkeleton />}>
                  <ProfitSeasonList />
                </Suspense>
              </ListLoadErrorBoundary>
            )}
          </div>
        </div>
      </div>

      <BusinessSheet />
      <ProfitSeasonSheet canManage={canManage} />
    </WorkspacePageShell>
  )
}
