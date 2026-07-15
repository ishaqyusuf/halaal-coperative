"use client"

import type {
  SupportCaseRow,
  SupportCaseSummary,
} from "@halaalvest/db"
import { OpenMemberSupportCaseCreateSheet } from "@/components/open-support-case-sheet"
import {
  type MemberSupportCaseInitialValues,
  type SupportCaseOption,
} from "@/components/support-case-content"
import { SupportCaseSheet } from "@/components/sheets/support-case-sheet"
import { SupportHeader } from "@/components/support-header"
import { SupportDataTable } from "@/components/tables/support/data-table"
import type { TableSettings } from "@/utils/table-settings"

export function SupportCasesView({
  assignees,
  canReviewFinancialAdjustments = false,
  cases,
  initialSettings,
  memberOptions,
  summary,
}: {
  assignees: SupportCaseOption[]
  canReviewFinancialAdjustments?: boolean
  cases: SupportCaseRow[]
  initialSettings?: Partial<TableSettings>
  memberOptions: SupportCaseOption[]
  summary: SupportCaseSummary
}) {
  return (
    <div className="space-y-6">
      <SupportCaseSheet
        assignees={assignees}
        cases={cases}
        memberOptions={memberOptions}
      />
      <section className="grid gap-4 md:grid-cols-5">
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

      <section className="overflow-hidden rounded-md border border-border bg-card">
        <SupportHeader />
        <SupportDataTable
          canReviewFinancialAdjustments={canReviewFinancialAdjustments}
          cases={cases}
          initialSettings={initialSettings}
        />
      </section>
    </div>
  )
}

export function MemberSupportCasesView({
  cases,
  initialCase,
  initialSettings,
  member,
  summary,
}: {
  cases: SupportCaseRow[]
  initialCase?: MemberSupportCaseInitialValues
  initialSettings?: Partial<TableSettings>
  member: {
    fullName: string
    id: string
    memberNumber: string
  }
  summary: SupportCaseSummary
}) {
  return (
    <div className="space-y-6">
      <SupportCaseSheet cases={cases} initialCase={initialCase} />
      <section className="grid gap-4 md:grid-cols-5">
        <SummaryTile label="Open" value={summary.openCases} />
        <SummaryTile
          label="Feature requests"
          value={summary.featureRequestOpenCases}
        />
        <SummaryTile label="Resolved" value={summary.closedCases} />
        <SummaryTile label="Total" value={summary.totalCases} />
        <SummaryTile label="Urgent" value={summary.urgentOpenCases} />
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              Open support case
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {member.fullName} ({member.memberNumber})
            </p>
          </div>
          <OpenMemberSupportCaseCreateSheet />
        </div>
      </section>

      <section className="overflow-hidden rounded-md border border-border bg-card">
        <SupportHeader
          action={null}
          description="Track your support cases, staff replies, and resolution status."
          title="My support cases"
        />
        <SupportDataTable
          canReviewFinancialAdjustments={false}
          cases={cases}
          initialSettings={initialSettings}
          mode="member"
        />
      </section>
    </div>
  )
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  )
}
