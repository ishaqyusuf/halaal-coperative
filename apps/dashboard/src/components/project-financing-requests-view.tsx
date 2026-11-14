"use client"

import type { ProjectFinancingSummary } from "@halaalvest/db"
import { formatCurrency } from "@halaalvest/utils"
import { ProjectFinancingHeader } from "@/components/project-financing-header"
import { ProjectFinancingMobileToolbar } from "@/components/project-financing-mobile-toolbar"
import {
  RequestClosedNotice,
  RequestSummaryGrid,
  RequestSummaryWide,
  memberNeedsVerificationNotice,
} from "@/components/requests/request-summary"
import { ProjectFinancingSheet } from "@/components/sheets/project-financing-sheet"
import { SummaryCard } from "@/components/summary-card"
import { ProjectFinancingDataView } from "@/components/tables/project-financing/data-view"
import type { TableSettings } from "@/utils/table-settings"

export function ProjectFinancingRequestsView({
  canCreate,
  canReview,
  initialSettings,
  hasMembers,
  summary,
}: {
  canCreate: boolean
  canReview: boolean
  initialSettings?: Partial<TableSettings>
  hasMembers: boolean
  summary: ProjectFinancingSummary
}) {
  return (
    <div className="space-y-6">
      <ProjectFinancingSheet canReview={canReview} />
      <RequestSummaryGrid>
        <SummaryCard
          label="To check"
          tone={summary.pendingRequests ? "attention" : "default"}
          value={String(summary.pendingRequests)}
        />
        <SummaryCard
          label="Approved"
          value={String(summary.approvedRequests)}
        />
        <RequestSummaryWide>
          <SummaryCard
            label="Approved money"
            value={formatCurrency(summary.totalApprovedAmount)}
          />
        </RequestSummaryWide>
        <RequestSummaryWide>
          <SummaryCard
            label="Still owed"
            value={formatCurrency(summary.outstandingAmount)}
          />
        </RequestSummaryWide>
      </RequestSummaryGrid>

      <section className="min-w-0">
        <ProjectFinancingMobileToolbar
          canCreate={canCreate}
          createDisabled={!hasMembers}
        />
        <ProjectFinancingHeader
          canCreate={canCreate}
          hasMemberOptions={hasMembers}
        />
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
  initialSettings,
  needsVerification = false,
  summary,
}: {
  canCreate: boolean
  initialSettings?: Partial<TableSettings>
  needsVerification?: boolean
  summary: ProjectFinancingSummary
}) {
  return (
    <div className="space-y-6">
      <ProjectFinancingSheet />
      <RequestSummaryGrid>
        <SummaryCard
          label="Waiting"
          tone={summary.pendingRequests ? "attention" : "default"}
          value={String(summary.pendingRequests)}
        />
        <SummaryCard
          label="Approved"
          value={String(summary.approvedRequests)}
        />
        <RequestSummaryWide>
          <SummaryCard
            label="You owe"
            value={formatCurrency(summary.outstandingAmount)}
          />
        </RequestSummaryWide>
      </RequestSummaryGrid>

      {canCreate ? null : (
        <RequestClosedNotice>
          {needsVerification
            ? memberNeedsVerificationNotice
            : "To ask for funding, contact the cooperative office."}
        </RequestClosedNotice>
      )}

      <section className="min-w-0">
        <ProjectFinancingMobileToolbar canCreate={canCreate} selfService />
        <ProjectFinancingHeader canCreate={canCreate} selfService />
        <ProjectFinancingDataView
          canReview={false}
          initialSettings={initialSettings}
        />
      </section>
    </div>
  )
}
