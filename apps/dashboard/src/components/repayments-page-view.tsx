import type { PageFilterData } from "@halaalvest/utils"
import { formatCurrency } from "@halaalvest/utils"
import {
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardStatCard,
  DashboardSurfaceCard,
  TrendPill,
  WorkspaceEmptyState,
  WorkspacePageShell,
} from "@/components/dashboard"
import {
  OpenCollectionFollowUpSheet,
  OpenRepaymentPostSheet,
  OpenRepaymentRefreshSheet,
} from "@/components/open-repayment-sheet"
import { RepaymentsHeader } from "@/components/repayments-header"
import { RepaymentSheet } from "@/components/sheets/repayment-sheet"

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
  assignedToUserId,
  assignees,
  canPostRepayment,
  dashboard,
  escalatedItems,
  filterList,
  highPriorityItems,
  loans,
  memberId,
  openCases,
  overdueItems,
  promiseTrackingItems,
  quickFillEnabled,
  repayments,
  resolutionStatus,
  resolvedCases,
  scheduleItems,
  scheduleStatus,
  stage,
  uniqueMembers,
}: {
  assignedToUserId: string
  assignees: Array<{ id: string; label: string }>
  canPostRepayment: boolean
  dashboard: { collectionCoverage: number }
  escalatedItems: Array<any>
  filterList?: PageFilterData[]
  highPriorityItems: Array<any>
  loans: Array<any>
  memberId: string
  openCases: Array<any>
  overdueItems: Array<any>
  promiseTrackingItems: Array<any>
  quickFillEnabled: boolean
  repayments: Array<any>
  resolutionStatus: string
  resolvedCases: Array<any>
  scheduleItems: Array<any>
  scheduleStatus: string
  stage: string
  uniqueMembers: Array<any>
}) {
  return (
    <WorkspacePageShell
      eyebrow="Repayments"
      title="Repayment tracking"
      description="Track due schedules, collections follow-up, resolved queues, and recent repayments from one servicing workspace."
    >
      <RepaymentsHeader
        actions={canPostRepayment ? <OpenRepaymentRefreshSheet /> : undefined}
        filterList={filterList}
      />

      {canPostRepayment ? (
        <DashboardSectionCard>
          <DashboardSectionHeader
            actions={<OpenRepaymentPostSheet />}
            eyebrow="Posting"
            title="Post repayment"
            description="Apply repayments against due items and keep installment status synchronized."
          />
          <p className="mt-5 text-sm leading-6 text-muted-foreground">
            Post repayments from a focused sheet so the servicing page stays
            centered on queues, schedule status, and recent activity.
          </p>
        </DashboardSectionCard>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <DashboardStatCard
          label="Collection coverage"
          value={`${Math.round(dashboard.collectionCoverage * 100)}%`}
          detail="Coverage against contribution target in the current dashboard snapshot."
        />
        <DashboardStatCard
          label="Overdue installments"
          value={overdueItems.length.toString()}
          detail="Repayment schedule items currently overdue."
          tone={overdueItems.length ? "warning" : "default"}
        />
        <DashboardStatCard
          label="Promise tracking"
          value={promiseTrackingItems.length.toString()}
          detail="Open cases currently waiting on a promise-to-pay outcome."
        />
        <DashboardStatCard
          label="High priority"
          value={highPriorityItems.length.toString()}
          detail="Collections items flagged as high priority."
          tone={highPriorityItems.length ? "warning" : "default"}
        />
        <DashboardStatCard
          label="Escalated"
          value={escalatedItems.length.toString()}
          detail="Cases already escalated beyond the initial collection pass."
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <DashboardSectionCard>
          <DashboardSectionHeader
            eyebrow="Queue"
            title="Open collections queue"
            actions={<TrendPill>{openCases.length} open</TrendPill>}
          />
          <div className="mt-5 space-y-3">
            {openCases.length ? (
              openCases.slice(0, 12).map((item) => (
                <DashboardSurfaceCard key={`open-${item.id}`}>
                  <p className="font-medium text-foreground">
                    {item.loan.member.fullName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Installment {item.installmentNumber} ·{" "}
                    {item.collectionFollowUps[0]?.caseStage?.replace(
                      /_/g,
                      " "
                    ) ?? "no case yet"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.collectionFollowUps[0]?.assignedToUser?.fullName ??
                      "Unassigned"}{" "}
                    · due {item.dueAt.toISOString().slice(0, 10)}
                  </p>
                </DashboardSurfaceCard>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No open collection cases in the current filter.
              </p>
            )}
          </div>
        </DashboardSectionCard>

        <DashboardSectionCard>
          <DashboardSectionHeader
            eyebrow="Resolved"
            title="Resolved queue"
            actions={<TrendPill>{resolvedCases.length} resolved</TrendPill>}
          />
          <div className="mt-5 space-y-3">
            {resolvedCases.length ? (
              resolvedCases.slice(0, 12).map((item) => (
                <DashboardSurfaceCard key={`resolved-${item.id}`}>
                  <p className="font-medium text-foreground">
                    {item.loan.member.fullName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {item.collectionFollowUps[0]?.status?.replace(/_/g, " ") ??
                      "resolved"}{" "}
                    ·{" "}
                    {item.collectionFollowUps[0]?.resolutionStatus ??
                      "resolved"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.collectionFollowUps[0]?.actorUser.fullName ?? "Staff"}{" "}
                    · updated{" "}
                    {item.collectionFollowUps[0]?.createdAt
                      .toISOString()
                      .slice(0, 10)}
                  </p>
                </DashboardSurfaceCard>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No resolved cases in the current filter.
              </p>
            )}
          </div>
        </DashboardSectionCard>
      </section>

      <DashboardSectionCard>
        <DashboardSectionHeader
          eyebrow="Follow-up"
          title="Collections follow-up"
          description="Capture notes, next actions, assignee changes, and resolution updates against overdue items."
          actions={<TrendPill>{overdueItems.length} overdue</TrendPill>}
        />
        <div className="mt-5 space-y-3">
          {overdueItems.length > 0 ? (
            overdueItems.slice(0, 20).map((item) => (
              <DashboardSurfaceCard key={item.id}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-foreground">
                      {item.loan.member.fullName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Installment {item.installmentNumber} · due{" "}
                      {item.dueAt.toISOString().slice(0, 10)}
                    </p>
                    {item.collectionFollowUps[0] ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Last{" "}
                        {item.collectionFollowUps[0].status.replace(/_/g, " ")}{" "}
                        by {item.collectionFollowUps[0].actorUser.fullName} on{" "}
                        {item.collectionFollowUps[0].createdAt
                          .toISOString()
                          .slice(0, 10)}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    outstanding{" "}
                    {formatCurrency(
                      Number(item.totalDue) - Number(item.amountPaid)
                    )}
                  </div>
                </div>
                {canPostRepayment ? (
                  <div className="mt-4">
                    <OpenCollectionFollowUpSheet
                      repaymentScheduleItemId={item.id}
                    />
                  </div>
                ) : null}
              </DashboardSurfaceCard>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No overdue installments are currently flagged.
            </p>
          )}
        </div>
      </DashboardSectionCard>

      <section className="grid gap-4 xl:grid-cols-2">
        <DashboardSectionCard>
          <DashboardSectionHeader
            eyebrow="Schedule"
            title="Repayment schedule"
            actions={<TrendPill>{scheduleItems.length} items</TrendPill>}
          />
          <div className="mt-5 space-y-3">
            {scheduleItems.slice(0, 20).map((item) => (
              <DashboardSurfaceCard key={item.id}>
                <p className="font-medium text-foreground">
                  {item.loan.member.fullName} · installment{" "}
                  {item.installmentNumber}
                </p>
                <p className="text-sm text-muted-foreground">
                  Due {item.dueAt.toISOString().slice(0, 10)} · total{" "}
                  {formatCurrency(Number(item.totalDue))}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.status.replace(/_/g, " ")} · paid{" "}
                  {formatCurrency(Number(item.amountPaid))}
                </p>
              </DashboardSurfaceCard>
            ))}
          </div>
        </DashboardSectionCard>

        <DashboardSectionCard>
          <DashboardSectionHeader
            eyebrow="History"
            title="Recent repayments"
            actions={<TrendPill>{repayments.length} posted</TrendPill>}
          />
          <div className="mt-5 space-y-3">
            {repayments.slice(0, 20).map((repayment) => (
              <DashboardSurfaceCard key={repayment.id}>
                <p className="font-medium text-foreground">
                  {repayment.member.fullName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {repayment.loan.loanProduct.name} ·{" "}
                  {repayment.paidAt.toISOString().slice(0, 10)}
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {formatCurrency(Number(repayment.amount))}
                </p>
              </DashboardSurfaceCard>
            ))}
          </div>
        </DashboardSectionCard>
      </section>

      <RepaymentSheet
        assignees={assignees}
        devMode={quickFillEnabled}
        loans={loans}
        scheduleItems={scheduleItems}
      />
    </WorkspacePageShell>
  )
}
