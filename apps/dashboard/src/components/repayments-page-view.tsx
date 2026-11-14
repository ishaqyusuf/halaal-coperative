"use client"

import { formatCurrency } from "@halaalvest/utils"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import { OpenRepaymentPostSheet } from "@/components/open-repayment-sheet"
import { RepaymentsHeader } from "@/components/repayments-header"
import { RepaymentsMobileToolbar } from "@/components/repayments-mobile-toolbar"
import { RepaymentSheet } from "@/components/sheets/repayment-sheet"
import { SummaryCard } from "@/components/summary-card"
import { RepaymentsDataView } from "@/components/tables/repayments/data-view"
import { useRepaymentsFilterParams } from "@/hooks/use-repayments-filter-params"
import type { RepaymentsPageData } from "@/lib/repayments/load-repayments-page"
import type { TableSettings } from "@/utils/table-settings"

export function RepaymentsUnavailableView() {
  return (
    <WorkspacePageShell
      description="Repayments are not available right now."
      eyebrow="Repayments"
      title="Repayments"
    >
      <WorkspaceEmptyState
        body="Please try again later."
        title="Repayments cannot be shown right now."
      />
    </WorkspacePageShell>
  )
}

export function RepaymentsPageView({
  data,
  historyInitialSettings,
  scheduleInitialSettings,
}: {
  data: RepaymentsPageData
  historyInitialSettings?: Partial<TableSettings>
  scheduleInitialSettings?: Partial<TableSettings>
}) {
  const { filters, setFilters } = useRepaymentsFilterParams()

  if (data.state === "unavailable") {
    return <RepaymentsUnavailableView />
  }

  const view = filters.view ?? "collections"
  const { summary } = data
  const showView = (next: "collections" | "history") =>
    void setFilters(
      {
        assignedToUserId: null,
        repaymentStatus: null,
        resolutionStatus: null,
        scheduleStatus: null,
        stage: null,
        view: next,
      },
      { shallow: false }
    )

  return (
    <WorkspacePageShell
      actions={
        data.canPostRepayment ? (
          <OpenRepaymentPostSheet className="hidden md:inline-flex" />
        ) : undefined
      }
      description="Who is behind with loan payments, and money received."
      eyebrow="Repayments"
      title="Repayments"
    >
      <RepaymentSheet
        assignees={data.assignees}
        canPostRepayment={data.canPostRepayment}
        devMode={data.quickFillEnabled}
        loans={data.loans}
      />

      {data.canPostRepayment ? (
        <OpenRepaymentPostSheet className="h-12 w-full md:hidden" />
      ) : null}

      <section
        aria-label="Repayments summary"
        className="grid grid-cols-2 gap-3 md:grid-cols-3"
      >
        <div className="col-span-2 md:col-span-1">
          <SummaryCard
            detail={
              summary.overdueScheduleItems > 0
                ? `${summary.overdueScheduleItems} late payment${summary.overdueScheduleItems === 1 ? "" : "s"}`
                : "Nobody is behind"
            }
            label="Late"
            onClick={() => showView("collections")}
            selected={view === "collections"}
            tone={summary.overdueScheduleItems > 0 ? "attention" : "good"}
            value={formatCurrency(summary.lateAmount)}
          />
        </div>
        <SummaryCard
          compact
          label="Still owed"
          value={formatCurrency(summary.totalOutstandingAmount)}
        />
        <SummaryCard
          compact
          label="Received"
          onClick={() => showView("history")}
          selected={view === "history"}
          value={formatCurrency(summary.totalRepaidAmount)}
        />
      </section>

      <section className="min-w-0 overflow-hidden border-b border-border md:border-y">
        <div className="px-0 py-4 md:px-4">
          <RepaymentsMobileToolbar />
          <RepaymentsHeader />
        </div>
        <RepaymentsDataView
          canPostRepayment={data.canPostRepayment}
          initialHistorySettings={historyInitialSettings}
          initialScheduleSettings={scheduleInitialSettings}
        />
      </section>
    </WorkspacePageShell>
  )
}
