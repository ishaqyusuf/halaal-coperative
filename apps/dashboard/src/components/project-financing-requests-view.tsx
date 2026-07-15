"use client"

import { formatCurrency } from "@halaalvest/utils"
import type {
  ProjectFinancingRequestRow,
  ProjectFinancingSummary,
} from "@halaalvest/db"
import { OpenMemberProjectFinancingRequestSheet } from "@/components/open-project-financing-sheet"
import { ProjectFinancingHeader } from "@/components/project-financing-header"
import type { ProjectFinancingMemberOption } from "@/components/project-financing-content"
import { ProjectFinancingSheet } from "@/components/sheets/project-financing-sheet"
import { ProjectFinancingDataTable } from "@/components/tables/project-financing/data-table"
import type { WorkflowChargeOption } from "@/components/workflow-charge-summary"
import type { TableSettings } from "@/utils/table-settings"

export function ProjectFinancingRequestsView({
  approvalChargeOptions,
  canReview,
  initialSettings,
  memberOptions,
  requests,
  submissionChargeOptions,
  summary,
}: {
  approvalChargeOptions: WorkflowChargeOption[]
  canReview: boolean
  initialSettings?: Partial<TableSettings>
  memberOptions: ProjectFinancingMemberOption[]
  requests: ProjectFinancingRequestRow[]
  submissionChargeOptions: WorkflowChargeOption[]
  summary: ProjectFinancingSummary
}) {
  return (
    <div className="space-y-6">
      <ProjectFinancingSheet
        approvalChargeOptions={approvalChargeOptions}
        memberOptions={memberOptions}
        requests={requests}
        submissionChargeOptions={submissionChargeOptions}
      />
      <section className="grid gap-4 md:grid-cols-4">
        <SummaryTile label="Pending" value={summary.pendingRequests} />
        <SummaryTile label="Approved" value={summary.approvedRequests} />
        <SummaryTile
          label="Requested value"
          value={formatCurrency(summary.totalRequestedAmount)}
        />
        <SummaryTile
          label="Approved value"
          value={formatCurrency(summary.totalApprovedAmount)}
        />
      </section>

      <section className="overflow-hidden rounded-md border border-border bg-card">
        <ProjectFinancingHeader />
        <ProjectFinancingDataTable
          canReview={canReview}
          initialSettings={initialSettings}
          requests={requests}
        />
      </section>
    </div>
  )
}

export function MemberProjectFinancingRequestsView({
  chargeOptions,
  initialSettings,
  member,
  requests,
}: {
  chargeOptions: WorkflowChargeOption[]
  initialSettings?: Partial<TableSettings>
  member: {
    fullName: string
    memberNumber: string
  }
  requests: ProjectFinancingRequestRow[]
}) {
  const pendingRequests = requests.filter((request) =>
    ["submitted", "under_review"].includes(request.status)
  )
  const approvedRequests = requests.filter((request) =>
    ["approved", "active", "completed"].includes(request.status)
  )

  return (
    <div className="space-y-6">
      <ProjectFinancingSheet
        requests={requests}
        selfServiceChargeOptions={chargeOptions}
      />
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryTile label="Pending" value={pendingRequests.length} />
        <SummaryTile label="Approved" value={approvedRequests.length} />
        <SummaryTile label="Total requests" value={requests.length} />
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              Request business funding
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {member.fullName} ({member.memberNumber})
            </p>
          </div>
          <OpenMemberProjectFinancingRequestSheet />
        </div>
      </section>

      <section className="overflow-hidden rounded-md border border-border bg-card">
        <ProjectFinancingHeader
          action={null}
          description="Track your business funding requests, approved structure, and disbursement status."
          title="My project financing requests"
        />
        <ProjectFinancingDataTable
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
