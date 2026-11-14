"use client"

import { Suspense, type ReactNode } from "react"
import type { SupportCaseSummary } from "@halaalvest/db"
import { OpenSupportCaseCreateSheet } from "@/components/open-support-case-sheet"
import { RequestClosedNotice } from "@/components/requests/request-summary"
import { SupportCaseSheet } from "@/components/sheets/support-case-sheet"
import { SummaryCard } from "@/components/summary-card"
import type {
  MemberSupportCaseInitialValues,
  SupportCaseOption,
} from "@/components/support/support-create-form"
import { SupportHeader } from "@/components/support-header"
import { SupportDataView } from "@/components/tables/support/data-view"
import { SupportDataErrorBoundary } from "@/components/tables/support/error-boundary"
import { SupportSkeleton } from "@/components/tables/support/skeleton"
import { useSupportFilterParams } from "@/hooks/use-support-filter-params"
import type { TableSettings } from "@/utils/table-settings"

function SupportList({
  action,
  assignees,
  initialSettings,
  mode,
}: {
  action?: ReactNode
  assignees: SupportCaseOption[]
  initialSettings?: Partial<TableSettings>
  mode: "member" | "staff"
}) {
  return (
    <section className="min-w-0">
      <SupportHeader action={action} assignees={assignees} mode={mode} />
      <SupportDataErrorBoundary>
        <Suspense fallback={<SupportSkeleton initialSettings={initialSettings} />}>
          <SupportDataView initialSettings={initialSettings} mode={mode} />
        </Suspense>
      </SupportDataErrorBoundary>
    </section>
  )
}

/** Staff: what's open, what's urgent, what's solved; tap a card to filter. */
function StaffSupportSummary({ summary }: { summary: SupportCaseSummary }) {
  const { filter, setFilter } = useSupportFilterParams()
  const showOpen = filter.status === "active" && !filter.priority
  const showUrgent = filter.status === "active" && filter.priority === "urgent"
  const showSolved = filter.status === "finished" && !filter.priority

  function show(status: string, priority: string | null = null) {
    const isSame = filter.status === status && filter.priority === priority
    void setFilter(
      isSame ? { priority: null, status: null } : { priority, status }
    )
  }

  return (
    <section aria-label="Summary" className="grid grid-cols-3 gap-3">
      <SummaryCard
        compact
        label="Open"
        onClick={() => show("active")}
        selected={showOpen}
        tone={summary.openCases ? "attention" : "default"}
        value={String(summary.openCases)}
      />
      <SummaryCard
        compact
        label="Urgent"
        onClick={() => show("active", "urgent")}
        selected={showUrgent}
        tone={summary.urgentOpenCases ? "attention" : "default"}
        value={String(summary.urgentOpenCases)}
      />
      <SummaryCard
        compact
        label="Solved"
        onClick={() => show("finished")}
        selected={showSolved}
        tone="good"
        value={String(summary.closedCases)}
      />
    </section>
  )
}

export function SupportCasesView({
  assignees,
  canCreateSupportCases,
  canReviewFinancialAdjustments = false,
  initialSettings,
  summary,
}: {
  assignees: SupportCaseOption[]
  canCreateSupportCases: boolean
  canReviewFinancialAdjustments?: boolean
  initialSettings?: Partial<TableSettings>
  summary: SupportCaseSummary
}) {
  return (
    <div className="space-y-6">
      <SupportCaseSheet
        assignees={assignees}
        canCreateSupportCases={canCreateSupportCases}
        canReviewFinancialAdjustments={canReviewFinancialAdjustments}
        viewer="staff"
      />
      {canCreateSupportCases ? (
        <OpenSupportCaseCreateSheet className="w-full md:hidden" mode="staff" />
      ) : null}
      <StaffSupportSummary summary={summary} />
      <SupportList
        action={
          canCreateSupportCases ? (
            <OpenSupportCaseCreateSheet mode="staff" />
          ) : null
        }
        assignees={assignees}
        initialSettings={initialSettings}
        mode="staff"
      />
    </div>
  )
}

export function MemberSupportCasesView({
  canCreateSupportCases,
  initialCase,
  initialSettings,
}: {
  canCreateSupportCases: boolean
  initialCase?: MemberSupportCaseInitialValues
  initialSettings?: Partial<TableSettings>
}) {
  return (
    <div className="space-y-6">
      <SupportCaseSheet
        canCreateSupportCases={canCreateSupportCases}
        initialCase={initialCase}
        viewer="member"
      />
      {canCreateSupportCases ? (
        <OpenSupportCaseCreateSheet className="w-full sm:w-auto" mode="member" />
      ) : (
        <RequestClosedNotice>
          To ask for help, contact the cooperative office.
        </RequestClosedNotice>
      )}
      <SupportList assignees={[]} initialSettings={initialSettings} mode="member" />
    </div>
  )
}
