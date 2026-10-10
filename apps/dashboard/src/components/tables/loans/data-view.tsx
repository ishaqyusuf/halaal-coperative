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
          mobile={
            <LoanRequestsMobileList canReview={canReview} memberId={memberId} />
          }
        />
      </Suspense>
    </LoansDataErrorBoundary>
  )
}

export function LoanPortfolioDataView({
  availablePool,
  canReview,
  initialSettings,
  memberId,
}: {
  availablePool: number
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
              availablePool={availablePool}
              canReview={canReview}
              initialSettings={initialSettings}
              memberId={memberId}
            />
          }
          fallback={<PortfolioLoading />}
          mobile={
            <LoanPortfolioMobileList
              availablePool={availablePool}
              canReview={canReview}
              memberId={memberId}
            />
          }
        />
      </Suspense>
    </LoansDataErrorBoundary>
  )
}

export function LoansDataView({
  availablePool,
  canReview,
  initialPortfolioSettings,
  initialRequestSettings,
  memberId,
}: {
  availablePool: number
  canReview: boolean
  initialPortfolioSettings?: Partial<TableSettings>
  initialRequestSettings?: Partial<TableSettings>
  memberId?: string
}) {
  const { filter } = useLoanFilterParams()
  const view = filter.view ?? "requests"

  return (
    <section className="min-w-0">
      <LoanViewTabs activeView={view} />
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
            availablePool={availablePool}
            canReview={canReview}
            initialSettings={initialPortfolioSettings}
            memberId={memberId}
          />
        )}
      </div>
    </section>
  )
}
