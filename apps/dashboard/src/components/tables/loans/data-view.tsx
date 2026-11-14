"use client"

import { Suspense } from "react"
import { ResponsiveDataView } from "@/components/tables/core/responsive-data-view"
import { useLoanFilterParams } from "@/hooks/use-loan-filter-params"
import type { TableSettings } from "@/utils/table-settings"
import { LoansDataErrorBoundary } from "./error-boundary"
import { LoanPortfolioMobileList } from "./mobile-portfolio-list"
import { LoanRequestsMobileList } from "./mobile-request-list"
import { LoansMobileSkeleton } from "./mobile-skeleton"
import { LoanPortfolioTable } from "./portfolio-table"
import { LoanRequestsTable } from "./requests-table"
import { LoanPortfolioSkeleton, LoanRequestsSkeleton } from "./skeleton"
import { LoanViewTabs } from "./view-tabs"

function RequestsLoading() {
  return (
    <>
      <div className="md:hidden">
        <LoansMobileSkeleton />
      </div>
      <div className="hidden md:block">
        <LoanRequestsSkeleton />
      </div>
    </>
  )
}

function PortfolioLoading() {
  return (
    <>
      <div className="md:hidden">
        <LoansMobileSkeleton />
      </div>
      <div className="hidden md:block">
        <LoanPortfolioSkeleton />
      </div>
    </>
  )
}

export function LoanRequestsDataView({
  canReview,
  initialSettings,
  memberId,
}: {
  canReview: boolean
  initialSettings?: Partial<TableSettings>
  memberId?: string
}) {
  return (
    <LoansDataErrorBoundary>
      <Suspense fallback={<RequestsLoading />}>
        <ResponsiveDataView
          desktop={
            <LoanRequestsTable
              canReview={canReview}
              initialSettings={initialSettings}
              memberId={memberId}
            />
          }
          fallback={<RequestsLoading />}
          mobile={<LoanRequestsMobileList memberId={memberId} />}
        />
      </Suspense>
    </LoansDataErrorBoundary>
  )
}

export function LoanPortfolioDataView({
  canReview,
  initialSettings,
  memberId,
}: {
  canReview: boolean
  initialSettings?: Partial<TableSettings>
  memberId?: string
}) {
  return (
    <LoansDataErrorBoundary>
      <Suspense fallback={<PortfolioLoading />}>
        <ResponsiveDataView
          desktop={
            <LoanPortfolioTable
              canReview={canReview}
              initialSettings={initialSettings}
              memberId={memberId}
            />
          }
          fallback={<PortfolioLoading />}
          mobile={
            <LoanPortfolioMobileList memberId={memberId} />
          }
        />
      </Suspense>
    </LoansDataErrorBoundary>
  )
}

export function LoansDataView({
  canReview,
  initialPortfolioSettings,
  initialRequestSettings,
  isMemberView = false,
  memberId,
}: {
  canReview: boolean
  initialPortfolioSettings?: Partial<TableSettings>
  initialRequestSettings?: Partial<TableSettings>
  isMemberView?: boolean
  memberId?: string
}) {
  const { filter } = useLoanFilterParams()
  const view = filter.view ?? "requests"

  return (
    <section className="min-w-0">
      <LoanViewTabs activeView={view} isMemberView={isMemberView} />
      <div
        aria-labelledby={`loans-${view}-tab`}
        id="loans-active-view"
        role="tabpanel"
      >
        {view === "requests" ? (
          <LoanRequestsDataView
            canReview={canReview}
            initialSettings={initialRequestSettings}
            memberId={memberId}
          />
        ) : (
          <LoanPortfolioDataView
            canReview={canReview}
            initialSettings={initialPortfolioSettings}
            memberId={memberId}
          />
        )}
      </div>
    </section>
  )
}
