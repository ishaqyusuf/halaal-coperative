"use client"

import { Suspense } from "react"
import type { SupportCaseSummary } from "@halaalvest/db"
import {
  type MemberSupportCaseInitialValues,
  type SupportCaseOption,
} from "@/components/support-case-content"
import { SupportCaseSheet } from "@/components/sheets/support-case-sheet"
import { SupportHeader } from "@/components/support-header"
import { SupportDataView } from "@/components/tables/support/data-view"
import { SupportDataErrorBoundary } from "@/components/tables/support/error-boundary"
import { SupportSkeleton } from "@/components/tables/support/skeleton"
import type { TableSettings } from "@/utils/table-settings"

export function SupportCasesView({
  assignees,
  canCreateSupportCases,
  canReviewFinancialAdjustments = false,
  initialSettings,
  memberOptions,
  summary,
}: {
  assignees: SupportCaseOption[]
  canCreateSupportCases: boolean
  canReviewFinancialAdjustments?: boolean
  initialSettings?: Partial<TableSettings>
  memberOptions: SupportCaseOption[]
  summary: SupportCaseSummary
}) {
  return (
    <div className="space-y-6">
      <SupportCaseSheet
        assignees={assignees}
        canCreateSupportCases={canCreateSupportCases}
        memberOptions={memberOptions}
      />
      <section className="hidden divide-x divide-border border-y border-border md:grid md:grid-cols-5">
        <SummaryTile label="Open" value={summary.openCases} />
        <SummaryTile
          label="Feature requests"
          value={summary.featureRequestOpenCases}
        />
        <SummaryTile
          label="High priority"
          value={summary.highPriorityOpenCases}
        />
        <SummaryTile label="Urgent" value={summary.urgentOpenCases} />
        <SummaryTile label="Resolved" value={summary.closedCases} />
      </section>

      <section>
        <SupportHeader
          assignees={assignees}
          canCreateSupportCases={canCreateSupportCases}
          mode="staff"
        />
        <SupportDataErrorBoundary>
          <Suspense
            fallback={<SupportSkeleton initialSettings={initialSettings} />}
          >
            <SupportDataView
              canReviewFinancialAdjustments={canReviewFinancialAdjustments}
              initialSettings={initialSettings}
              mode="staff"
            />
          </Suspense>
        </SupportDataErrorBoundary>
      </section>
    </div>
  )
}

export function MemberSupportCasesView({
  canCreateSupportCases,
  initialCase,
  initialSettings,
  summary,
}: {
  canCreateSupportCases: boolean
  initialCase?: MemberSupportCaseInitialValues
  initialSettings?: Partial<TableSettings>
  summary: SupportCaseSummary
}) {
  return (
    <div className="space-y-6">
      <SupportCaseSheet
        canCreateSupportCases={canCreateSupportCases}
        initialCase={initialCase}
      />
      <section className="hidden divide-x divide-border border-y border-border md:grid md:grid-cols-5">
        <SummaryTile label="Open" value={summary.openCases} />
        <SummaryTile
          label="Feature requests"
          value={summary.featureRequestOpenCases}
        />
        <SummaryTile label="Resolved" value={summary.closedCases} />
        <SummaryTile label="Total" value={summary.totalCases} />
        <SummaryTile label="Urgent" value={summary.urgentOpenCases} />
      </section>

      <section>
        <SupportHeader
          assignees={[]}
          canCreateSupportCases={canCreateSupportCases}
          mode="member"
        />
        <SupportDataErrorBoundary>
          <Suspense
            fallback={<SupportSkeleton initialSettings={initialSettings} />}
          >
            <SupportDataView
              canReviewFinancialAdjustments={false}
              initialSettings={initialSettings}
              mode="member"
            />
          </Suspense>
        </SupportDataErrorBoundary>
      </section>
    </div>
  )
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-4 py-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  )
}
