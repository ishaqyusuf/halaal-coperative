"use client"

import { Suspense } from "react"
import { ResponsiveDataView } from "@/components/tables/core/responsive-data-view"
import { useRepaymentsFilterParams } from "@/hooks/use-repayments-filter-params"
import type { TableSettings } from "@/utils/table-settings"
import {
  RepaymentHistoryDataTable,
  RepaymentScheduleDataTable,
} from "./data-table"
import { RepaymentsDataErrorBoundary } from "./error-boundary"
import {
  RepaymentHistoryMobileList,
  RepaymentScheduleMobileList,
} from "./mobile-list"
import { RepaymentsSkeleton } from "./skeleton"
import type { RepaymentView } from "./types"
import { RepaymentViewTabs } from "./view-tabs"

function ActiveRepaymentView({
  canPostRepayment,
  initialHistorySettings,
  initialScheduleSettings,
  view,
}: {
  canPostRepayment: boolean
  initialHistorySettings?: Partial<TableSettings>
  initialScheduleSettings?: Partial<TableSettings>
  view: RepaymentView
}) {
  if (view === "history") {
    return (
      <ResponsiveDataView
        desktop={
          <RepaymentHistoryDataTable initialSettings={initialHistorySettings} />
        }
        fallback={<RepaymentsSkeleton />}
        mobile={<RepaymentHistoryMobileList />}
      />
    )
  }

  return (
    <ResponsiveDataView
      desktop={
        <RepaymentScheduleDataTable
          canPostRepayment={canPostRepayment}
          initialSettings={initialScheduleSettings}
          view={view}
        />
      }
      fallback={<RepaymentsSkeleton />}
      mobile={
        <RepaymentScheduleMobileList
          canPostRepayment={canPostRepayment}
          view={view}
        />
      }
    />
  )
}

export function RepaymentsDataView({
  canPostRepayment,
  initialHistorySettings,
  initialScheduleSettings,
}: {
  canPostRepayment: boolean
  initialHistorySettings?: Partial<TableSettings>
  initialScheduleSettings?: Partial<TableSettings>
}) {
  const { filters } = useRepaymentsFilterParams()
  const view = filters.view ?? "collections"

  return (
    <section
      aria-labelledby={`repayments-${view}-tab`}
      className="min-w-0"
      id="repayments-active-view"
      role="tabpanel"
    >
      <RepaymentViewTabs activeView={view} />
      <RepaymentsDataErrorBoundary>
        <Suspense fallback={<RepaymentsSkeleton />}>
          <ActiveRepaymentView
            canPostRepayment={canPostRepayment}
            initialHistorySettings={initialHistorySettings}
            initialScheduleSettings={initialScheduleSettings}
            view={view}
          />
        </Suspense>
      </RepaymentsDataErrorBoundary>
    </section>
  )
}
