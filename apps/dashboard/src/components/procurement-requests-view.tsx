"use client"

import { formatCurrency } from "@halaalvest/utils"
import type { ProcurementSummary } from "@halaalvest/db"
import { ProcurementHeader } from "@/components/procurement-header"
import { ProcurementMobileToolbar } from "@/components/procurement-mobile-toolbar"
import type { ServiceGate } from "@halaalvest/utils/service-request-gate"
import { Package } from "lucide-react"
import { MemberActiveRequest } from "@/components/requests/member-active-request"
import {
  RequestClosedNotice,
  RequestSummaryGrid,
  RequestSummaryWide,
} from "@/components/requests/request-summary"
import { ServiceStateCard } from "@/components/requests/service-state-card"
import { ProcurementRequestSheet } from "@/components/sheets/procurement-request-sheet"
import { SummaryCard } from "@/components/summary-card"
import { ProcurementDataView } from "@/components/tables/procurement/data-view"
import type { MemberActiveItem } from "@/lib/requests/member-service-state"
import type { TableSettings } from "@/utils/table-settings"

export function ProcurementRequestsView({
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
  summary: ProcurementSummary
}) {
  return (
    <div className="space-y-6">
      <ProcurementRequestSheet canReview={canReview} />
      <RequestSummaryGrid>
        <SummaryCard
          label="To check"
          tone={summary.pendingRequests ? "attention" : "default"}
          value={String(summary.pendingRequests)}
        />
        <SummaryCard
          detail="Not bought yet"
          label="Approved"
          value={String(summary.approvedRequests)}
        />
        <SummaryCard
          detail={
            summary.overdueScheduleItems
              ? `${summary.overdueScheduleItems} late payments`
              : undefined
          }
          label="Repaying"
          tone={summary.overdueScheduleItems ? "attention" : "default"}
          value={String(summary.activeRequests)}
        />
        <RequestSummaryWide>
          <SummaryCard
            label="Still owed"
            value={formatCurrency(summary.outstandingAmount)}
          />
        </RequestSummaryWide>
      </RequestSummaryGrid>

      {canCreate ? null : (
        <RequestClosedNotice>New item requests are closed.</RequestClosedNotice>
      )}

      <section className="min-w-0">
        <ProcurementMobileToolbar
          canCreate={canCreate}
          createDisabled={!hasMembers}
        />
        <ProcurementHeader
          canCreate={canCreate}
          hasMemberOptions={hasMembers}
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
  active,
  canCreate,
  gate,
  initialSettings,
  summary,
}: {
  active: MemberActiveItem | null
  canCreate: boolean
  gate: ServiceGate | null
  initialSettings?: Partial<TableSettings>
  summary: Pick<
    ProcurementSummary,
    | "activeRequests"
    | "approvedRequests"
    | "outstandingAmount"
    | "overdueScheduleItems"
    | "pendingRequests"
    | "totalRequests"
  >
}) {
  // A cooperative that never offered procurement shows only the state card.
  const hasRequests = summary.totalRequests > 0

  return (
    <div className="space-y-6">
      <ProcurementRequestSheet />
      {gate ? <ServiceStateCard gate={gate} serviceIcon={Package} /> : null}
      {active ? <MemberActiveRequest item={active} /> : null}

      {hasRequests || !gate ? (
        <>
          <RequestSummaryGrid>
            <SummaryCard
              label="Waiting"
              tone={summary.pendingRequests ? "attention" : "default"}
              value={String(summary.pendingRequests)}
            />
            <SummaryCard
              label="Approved"
              value={String(summary.approvedRequests + summary.activeRequests)}
            />
            <RequestSummaryWide>
              <SummaryCard
                detail={
                  summary.overdueScheduleItems
                    ? `${summary.overdueScheduleItems} late payments`
                    : undefined
                }
                label="You owe"
                tone={summary.overdueScheduleItems ? "attention" : "default"}
                value={formatCurrency(summary.outstandingAmount)}
              />
            </RequestSummaryWide>
          </RequestSummaryGrid>

          <section className="min-w-0">
            <ProcurementMobileToolbar canCreate={canCreate} selfService />
            <ProcurementHeader canCreate={canCreate} selfService />
            <ProcurementDataView
              canReview={false}
              initialSettings={initialSettings}
            />
          </section>
        </>
      ) : null}
    </div>
  )
}
