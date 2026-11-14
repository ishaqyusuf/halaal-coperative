import { Suspense } from "react"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import {
  ChargeActivityList,
  ChargeActivitySearch,
} from "@/components/charge-activity-list"
import { ChargeSummaryCards } from "@/components/charge-summary-cards"
import { ChargeTypeList } from "@/components/charge-type-list"
import { PlainListSkeleton } from "@/components/plain-list-skeleton"
import { ChargeViewTabs } from "@/components/charge-view-tabs"
import { OpenChargeOperationButton } from "@/components/open-charge-operation-sheet"
import { ChargeOperationSheet } from "@/components/sheets/charge-operation-sheet"
import { ListLoadErrorBoundary } from "@/components/list-load-error-boundary"
import type { ChargesPageView as ChargesView } from "@/hooks/use-charges-page-params"

export function ChargesUnavailableView() {
  return (
    <WorkspacePageShell description="" eyebrow="Charges" title="Charges">
      <WorkspaceEmptyState
        body="Charges show here once the cooperative's data is connected."
        title="Charges are not available yet."
      />
    </WorkspacePageShell>
  )
}

export function ChargesPageView({
  activeView,
  canManageCharges,
  quickFillEnabled,
  recentPostedCount,
}: {
  activeView: ChargesView
  canManageCharges: boolean
  quickFillEnabled: boolean
  recentPostedCount: number
}) {
  return (
    <WorkspacePageShell
      description="Levies and fees, and who has been charged."
      eyebrow="Charges"
      title="Charges"
    >
      <div className="grid gap-6">
        <ListLoadErrorBoundary>
          <Suspense fallback={null}>
            <ChargeSummaryCards recentPostedCount={recentPostedCount} />
          </Suspense>
        </ListLoadErrorBoundary>

        <div className="grid gap-4">
          <ChargeViewTabs activeView={activeView} />
          <div
            aria-labelledby={`charges-${activeView}-tab`}
            className="grid gap-4"
            id="charges-active-view"
            role="tabpanel"
          >
            {activeView === "definitions" ? (
              <>
                {canManageCharges ? (
                  <OpenChargeOperationButton type="definition" />
                ) : null}
                <ListLoadErrorBoundary>
                  <Suspense fallback={<PlainListSkeleton />}>
                    <ChargeTypeList canManageCharges={canManageCharges} />
                  </Suspense>
                </ListLoadErrorBoundary>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <ChargeActivitySearch />
                  {canManageCharges ? (
                    <OpenChargeOperationButton type="application" />
                  ) : null}
                </div>
                <ListLoadErrorBoundary>
                  <Suspense fallback={<PlainListSkeleton />}>
                    <ChargeActivityList canManageCharges={canManageCharges} />
                  </Suspense>
                </ListLoadErrorBoundary>
              </>
            )}
          </div>
        </div>
      </div>

      <ChargeOperationSheet
        canManageCharges={canManageCharges}
        devMode={quickFillEnabled}
      />
    </WorkspacePageShell>
  )
}
