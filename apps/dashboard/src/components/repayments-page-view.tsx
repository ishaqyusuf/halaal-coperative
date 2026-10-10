"use client"

import { formatCurrency } from "@halaalvest/utils"
import {
  WorkspaceEmptyState,
  WorkspacePageShell,
} from "@/components/dashboard"
import {
  OpenRepaymentPostSheet,
  OpenRepaymentRefreshSheet,
} from "@/components/open-repayment-sheet"
import { RepaymentsHeader } from "@/components/repayments-header"
import { RepaymentsMobileToolbar } from "@/components/repayments-mobile-toolbar"
import { RepaymentSheet } from "@/components/sheets/repayment-sheet"
import { RepaymentsDataView } from "@/components/tables/repayments/data-view"
import type { RepaymentsPageData } from "@/lib/repayments/load-repayments-page"
import type { TableSettings } from "@/utils/table-settings"

export function RepaymentsUnavailableView() {
  return (
    <WorkspacePageShell
      eyebrow="Repayments"
      title="Repayment tracking"
      description="Track overdue exposure, repayment progress, and the collections workflow from one route."
    >
      <WorkspaceEmptyState
        title="Repayment workflows need the database runtime."
        body="Once the database-backed environment is active, this route will manage schedule items, repayment posting, and collections follow-up."
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
  if (data.state === "unavailable") {
    return <RepaymentsUnavailableView />
  }

  return (
    <WorkspacePageShell
      actions={
        data.canPostRepayment ? (
          <div className="hidden md:block">
            <OpenRepaymentPostSheet />
          </div>
        ) : undefined
      }
      eyebrow="Repayments"
      title="Repayment tracking"
      description="Service installments, manage overdue follow-up, and review immutable repayment evidence from one focused workspace."
    >
      <RepaymentSheet
        assignees={data.assignees}
        devMode={data.quickFillEnabled}
        loans={data.loans}
      />

      <section
        aria-label="Repayment summary"
        className="hidden border-y border-border/70 md:block"
      >
        <div className="grid grid-cols-2 divide-x divide-y divide-border/70 xl:grid-cols-4 xl:divide-y-0">
          <SummaryMetric
            label="Outstanding"
            value={formatCurrency(data.summary.totalOutstandingAmount)}
          />
          <SummaryMetric
            label="Overdue installments"
            value={data.summary.overdueScheduleItems.toString()}
          />
          <SummaryMetric
            label="Repayments posted"
            value={data.summary.totalRepayments.toString()}
          />
          <SummaryMetric
            label="Principal repaid"
            value={formatCurrency(data.summary.totalRepaidAmount)}
          />
        </div>
      </section>

      <section className="overflow-hidden border-b border-border md:border-y">
        <div className="px-0 py-4 md:px-4">
          <RepaymentsMobileToolbar
            canPostRepayment={data.canPostRepayment}
          />
          <RepaymentsHeader
            actions={
              data.canPostRepayment ? <OpenRepaymentRefreshSheet /> : undefined
            }
          />
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

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-4 py-4">
      <p className="text-xs text-muted-foreground uppercase">{label}</p>
      <p className="mt-2 truncate text-xl font-semibold text-foreground">
        {value}
      </p>
    </div>
  )
}
