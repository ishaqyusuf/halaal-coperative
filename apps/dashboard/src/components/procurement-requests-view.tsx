"use client"

import { formatCurrency } from "@halaalvest/utils"
import type { ProcurementRequestRow, ProcurementSummary } from "@halaalvest/db"
import { OpenMemberProcurementRequestCreateSheet } from "@/components/open-procurement-request-sheet"
import { ProcurementHeader } from "@/components/procurement-header"
import type { ProcurementMemberOption } from "@/components/procurement-request-content"
import { ProcurementRequestSheet } from "@/components/sheets/procurement-request-sheet"
import { ProcurementDataTable } from "@/components/tables/procurement/data-table"
import type { WorkflowChargeOption } from "@/components/workflow-charge-summary"
import type { TableSettings } from "@/utils/table-settings"

function getScheduleCounts(request: ProcurementRequestRow) {
  return request.repaymentScheduleItems.reduce(
    (summary, schedule) => {
      const outstanding = Math.max(0, schedule.amount - schedule.paidAmount)

      if (schedule.status === "due") {
        summary.due += 1
      }

      if (schedule.status === "overdue") {
        summary.overdue += 1
      }

      summary.outstanding += outstanding

      return summary
    },
    { due: 0, outstanding: 0, overdue: 0 }
  )
}

export function ProcurementRequestsView({
  approvalChargeOptions,
  canCreate,
  canReview,
  initialSettings,
  memberOptions,
  requests,
  submissionChargeOptions,
  summary,
}: {
  approvalChargeOptions: WorkflowChargeOption[]
  canCreate: boolean
  canReview: boolean
  initialSettings?: Partial<TableSettings>
  memberOptions: ProcurementMemberOption[]
  requests: ProcurementRequestRow[]
  submissionChargeOptions: WorkflowChargeOption[]
  summary: ProcurementSummary
}) {
  return (
    <div className="space-y-6">
      <ProcurementRequestSheet
        approvalChargeOptions={approvalChargeOptions}
        memberOptions={memberOptions}
        requests={requests}
        submissionChargeOptions={submissionChargeOptions}
      />
      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <SummaryTile label="Pending" value={summary.pendingRequests} />
        <SummaryTile label="Approved" value={summary.approvedRequests} />
        <SummaryTile label="Active" value={summary.activeRequests} />
        <SummaryTile label="Due" value={summary.dueScheduleItems} />
        <SummaryTile label="Overdue" value={summary.overdueScheduleItems} />
        <SummaryTile
          label="Outstanding"
          value={formatCurrency(summary.outstandingAmount)}
        />
      </section>

      {!canCreate ? (
        <section className="rounded-md border border-border bg-muted/20 p-4">
          <p className="text-sm font-medium text-foreground">
            New procurement requests are closed
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Existing procurement requests and repayment schedules remain
            visible. Admins can change access from Settings &gt; Operation
            Profile.
          </p>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-md border border-border bg-card">
        <ProcurementHeader
          canCreate={canCreate}
          hasMemberOptions={memberOptions.length > 0}
        />
        <ProcurementDataTable
          canReview={canReview}
          initialSettings={initialSettings}
          requests={requests}
        />
      </section>
    </div>
  )
}

export function MemberProcurementRequestsView({
  chargeOptions,
  canCreate,
  initialSettings,
  member,
  requests,
}: {
  chargeOptions: WorkflowChargeOption[]
  canCreate: boolean
  initialSettings?: Partial<TableSettings>
  member: {
    fullName: string
    memberNumber: string
  }
  requests: ProcurementRequestRow[]
}) {
  const pendingRequests = requests.filter((request) =>
    ["submitted", "under_review"].includes(request.status)
  )
  const approvedRequests = requests.filter((request) =>
    ["approved", "purchased", "active"].includes(request.status)
  )
  const scheduleSummary = requests.reduce(
    (summary, request) => {
      const counts = getScheduleCounts(request)

      return {
        due: summary.due + counts.due,
        outstanding: summary.outstanding + counts.outstanding,
        overdue: summary.overdue + counts.overdue,
      }
    },
    { due: 0, outstanding: 0, overdue: 0 }
  )

  return (
    <div className="space-y-6">
      <ProcurementRequestSheet
        requests={requests}
        selfServiceChargeOptions={chargeOptions}
      />
      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        <SummaryTile label="Pending" value={pendingRequests.length} />
        <SummaryTile label="Approved" value={approvedRequests.length} />
        <SummaryTile label="Due" value={scheduleSummary.due} />
        <SummaryTile label="Overdue" value={scheduleSummary.overdue} />
        <SummaryTile label="Total requests" value={requests.length} />
      </section>

      {canCreate ? (
        <section className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Request item purchase
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {member.fullName} ({member.memberNumber})
              </p>
            </div>
            <OpenMemberProcurementRequestCreateSheet />
          </div>
        </section>
      ) : (
        <section className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground">
            Procurement requests are handled by the cooperative office
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Existing procurement requests and repayment schedules remain visible
            here.
          </p>
        </section>
      )}

      <section className="overflow-hidden rounded-md border border-border bg-card">
        <ProcurementHeader canCreate={false} hasMemberOptions={false} />
        <ProcurementDataTable
          canReview={false}
          initialSettings={initialSettings}
          requests={requests}
        />
      </section>
    </div>
  )
}

function SummaryTile({
  label,
  value,
}: {
  label: string
  value: number | string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  )
}
