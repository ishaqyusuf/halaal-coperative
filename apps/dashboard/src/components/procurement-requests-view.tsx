"use client"

import { formatCurrency } from "@halaalvest/utils"
import type { ProcurementSummary } from "@halaalvest/db"
import { OpenMemberProcurementRequestCreateSheet } from "@/components/open-procurement-request-sheet"
import { ProcurementHeader } from "@/components/procurement-header"
import { ProcurementMobileToolbar } from "@/components/procurement-mobile-toolbar"
import type { ProcurementMemberOption } from "@/components/procurement-request-content"
import { ProcurementRequestSheet } from "@/components/sheets/procurement-request-sheet"
import { ProcurementDataView } from "@/components/tables/procurement/data-view"
import type { WorkflowChargeOption } from "@/components/workflow-charge-summary"
import type { TableSettings } from "@/utils/table-settings"

export function ProcurementRequestsView({
  approvalChargeOptions,
  canCreate,
  canReview,
  initialSettings,
  memberOptions,
  submissionChargeOptions,
  summary,
}: {
  approvalChargeOptions: WorkflowChargeOption[]
  canCreate: boolean
  canReview: boolean
  initialSettings?: Partial<TableSettings>
  memberOptions: ProcurementMemberOption[]
  submissionChargeOptions: WorkflowChargeOption[]
  summary: ProcurementSummary
}) {
  return (
    <div className="space-y-6">
      <ProcurementRequestSheet
        approvalChargeOptions={approvalChargeOptions}
        memberOptions={memberOptions}
        submissionChargeOptions={submissionChargeOptions}
      />
      <section className="hidden border-y border-border/70 md:block">
        <div className="grid grid-cols-3 divide-x divide-border/70 xl:grid-cols-6">
          <SummaryMetric label="Pending" value={summary.pendingRequests} />
          <SummaryMetric label="Approved" value={summary.approvedRequests} />
          <SummaryMetric label="Active" value={summary.activeRequests} />
          <SummaryMetric label="Due" value={summary.dueScheduleItems} />
          <SummaryMetric label="Overdue" value={summary.overdueScheduleItems} />
          <SummaryMetric
            label="Outstanding"
            value={formatCurrency(summary.outstandingAmount)}
          />
        </div>
      </section>

      {!canCreate ? (
        <section className="border-y border-border bg-muted/20 px-4 py-3">
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

      <section className="min-w-0">
        <ProcurementMobileToolbar
          canCreate={canCreate}
          createDisabled={memberOptions.length === 0}
        />
        <ProcurementHeader
          canCreate={canCreate}
          hasMemberOptions={memberOptions.length > 0}
        />
        <ProcurementDataView
          canReview={canReview}
          initialSettings={initialSettings}
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
  summary,
}: {
  chargeOptions: WorkflowChargeOption[]
  canCreate: boolean
  initialSettings?: Partial<TableSettings>
  member: {
    fullName: string
    memberNumber: string
  }
  summary: ProcurementSummary
}) {
  return (
    <div className="space-y-6">
      <ProcurementRequestSheet selfServiceChargeOptions={chargeOptions} />
      <section className="hidden border-y border-border/70 md:block">
        <div className="grid grid-cols-5 divide-x divide-border/70">
          <SummaryMetric label="Pending" value={summary.pendingRequests} />
          <SummaryMetric
            label="Approved"
            value={summary.approvedRequests + summary.activeRequests}
          />
          <SummaryMetric label="Due" value={summary.dueScheduleItems} />
          <SummaryMetric label="Overdue" value={summary.overdueScheduleItems} />
          <SummaryMetric label="Total requests" value={summary.totalRequests} />
        </div>
      </section>

      {canCreate ? (
        <section className="hidden items-center justify-between gap-3 border-y border-border py-4 md:flex">
          <div>
            <p className="text-sm font-medium text-foreground">
              Request item purchase
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {member.fullName} ({member.memberNumber})
            </p>
          </div>
          <OpenMemberProcurementRequestCreateSheet />
        </section>
      ) : (
        <section className="border-y border-border py-4">
          <p className="text-sm font-medium text-foreground">
            Procurement requests are handled by the cooperative office
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Existing procurement requests and repayment schedules remain visible
            here.
          </p>
        </section>
      )}

      <section className="min-w-0">
        <ProcurementMobileToolbar canCreate={canCreate} selfService />
        <ProcurementHeader canCreate={false} hasMemberOptions={false} />
        <ProcurementDataView
          canReview={false}
          initialSettings={initialSettings}
        />
      </section>
    </div>
  )
}

function SummaryMetric({
  label,
  value,
}: {
  label: string
  value: number | string
}) {
  return (
    <div className="min-w-0 px-4 py-4">
      <p className="text-xs text-muted-foreground uppercase">{label}</p>
      <p className="mt-2 truncate text-xl font-semibold text-foreground">
        {value}
      </p>
    </div>
  )
}
