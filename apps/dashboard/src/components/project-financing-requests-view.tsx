"use client"

import type { ProjectFinancingSummary } from "@halaalvest/db"
import { formatCurrency } from "@halaalvest/utils"
import { OpenMemberProjectFinancingRequestSheet } from "@/components/open-project-financing-sheet"
import { ProjectFinancingHeader } from "@/components/project-financing-header"
import { ProjectFinancingMobileToolbar } from "@/components/project-financing-mobile-toolbar"
import type { ProjectFinancingMemberOption } from "@/components/project-financing-content"
import { ProjectFinancingSheet } from "@/components/sheets/project-financing-sheet"
import { ProjectFinancingDataView } from "@/components/tables/project-financing/data-view"
import type { WorkflowChargeOption } from "@/components/workflow-charge-summary"
import type { TableSettings } from "@/utils/table-settings"

export function ProjectFinancingRequestsView({
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
  memberOptions: ProjectFinancingMemberOption[]
  submissionChargeOptions: WorkflowChargeOption[]
  summary: ProjectFinancingSummary
}) {
  return (
    <div className="space-y-6">
      <ProjectFinancingSheet
        approvalChargeOptions={approvalChargeOptions}
        memberOptions={memberOptions}
        submissionChargeOptions={submissionChargeOptions}
      />
      <section className="hidden border-y border-border/70 md:block">
        <div className="grid grid-cols-2 divide-x divide-border/70 xl:grid-cols-4">
          <SummaryMetric label="Pending" value={summary.pendingRequests} />
          <SummaryMetric label="Approved" value={summary.approvedRequests} />
          <SummaryMetric
            label="Requested value"
            value={formatCurrency(summary.totalRequestedAmount)}
          />
          <SummaryMetric
            label="Approved value"
            value={formatCurrency(summary.totalApprovedAmount)}
          />
        </div>
      </section>

      <section className="min-w-0">
        <ProjectFinancingMobileToolbar
          canCreate={canCreate}
          createDisabled={memberOptions.length === 0}
        />
        <ProjectFinancingHeader />
        <ProjectFinancingDataView
          canReview={canReview}
          initialSettings={initialSettings}
        />
      </section>
    </div>
  )
}

export function MemberProjectFinancingRequestsView({
  canCreate,
  chargeOptions,
  initialSettings,
  member,
  summary,
}: {
  canCreate: boolean
  chargeOptions: WorkflowChargeOption[]
  initialSettings?: Partial<TableSettings>
  member: {
    fullName: string
    memberNumber: string
  }
  summary: ProjectFinancingSummary
}) {
  return (
    <div className="space-y-6">
      <ProjectFinancingSheet selfServiceChargeOptions={chargeOptions} />
      <section className="hidden border-y border-border/70 md:block">
        <div className="grid grid-cols-3 divide-x divide-border/70">
          <SummaryMetric label="Pending" value={summary.pendingRequests} />
          <SummaryMetric label="Approved" value={summary.approvedRequests} />
          <SummaryMetric label="Total requests" value={summary.totalRequests} />
        </div>
      </section>

      <section className="hidden items-center justify-between gap-3 border-y border-border py-4 md:flex">
        <div>
          <p className="text-sm font-medium text-foreground">
            Request business funding
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {member.fullName} ({member.memberNumber})
          </p>
        </div>
        {canCreate ? <OpenMemberProjectFinancingRequestSheet /> : null}
      </section>

      <section className="min-w-0">
        <ProjectFinancingMobileToolbar canCreate={canCreate} selfService />
        <ProjectFinancingHeader action={null} />
        <ProjectFinancingDataView
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
