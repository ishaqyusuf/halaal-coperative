"use client"

import type { PageFilterData } from "@halaalvest/utils"
import { Suspense } from "react"
import { ActivityList } from "@/components/activity/activity-list"
import { AuditSearchFilter } from "@/components/audit-search-filter"
import { DashboardPageTitle, WorkspaceEmptyState } from "@/components/dashboard"
import { ListLoadErrorBoundary } from "@/components/list-load-error-boundary"
import { PlainListSkeleton } from "@/components/plain-list-skeleton"
import { ActivityEntrySheet } from "@/components/sheets/activity-entry-sheet"

export function AuditReportUnavailableView() {
  return (
    <WorkspaceEmptyState
      body="Only cooperative admins can see the activity log."
      title="You cannot see the activity log"
    />
  )
}

/** /reports/audit: who did what, and when. */
export function AuditReportView({
  filterList,
}: {
  filterList: PageFilterData[]
}) {
  return (
    <div className="grid min-w-0 gap-5">
      <DashboardPageTitle title="Activity" />
      <div className="min-w-0 max-md:[&_button]:min-h-11 max-md:[&_input]:min-h-11">
        <AuditSearchFilter initialFilterList={filterList} />
      </div>
      <ListLoadErrorBoundary>
        <Suspense fallback={<PlainListSkeleton />}>
          <ActivityList />
        </Suspense>
      </ListLoadErrorBoundary>
      <ActivityEntrySheet />
    </div>
  )
}
