import { Button } from "@halaal-vest/ui/components/button"
import { formatCurrency } from "@halaal-vest/utils"
import { DashboardSectionCard, DashboardSectionHeader, DashboardStatCard, DashboardSurfaceCard, TrendPill, WorkspacePageShell } from "@/components/dashboard"
import { CollectionFollowUpForm, RepaymentPostForm } from "@/components/forms/finance-forms"
import { RepaymentFilterForm } from "@/components/forms/misc-forms"
import { refreshCollectionsStatusesAction } from "@/lib/dashboard-actions"

export function RepaymentsPageView({
  assignedToUserId,
  assignees,
  canPostRepayment,
  dashboard,
  escalatedItems,
  from,
  highPriorityItems,
  loans,
  memberId,
  openCases,
  overdueItems,
  promiseTrackingItems,
  repayments,
  resolutionStatus,
  resolvedCases,
  scheduleItems,
  scheduleStatus,
  stage,
  to,
  uniqueMembers,
}: {
  assignedToUserId: string
  assignees: Array<{ id: string; label: string }>
  canPostRepayment: boolean
  dashboard: { collectionCoverage: number }
  escalatedItems: Array<any>
  from: string
  highPriorityItems: Array<any>
  loans: Array<any>
  memberId: string
  openCases: Array<any>
  overdueItems: Array<any>
  promiseTrackingItems: Array<any>
  repayments: Array<any>
  resolutionStatus: string
  resolvedCases: Array<any>
  scheduleItems: Array<any>
  scheduleStatus: string
  stage: string
  to: string
  uniqueMembers: Array<any>
}) {
  return (
    <WorkspacePageShell eyebrow="Repayments" title="Repayment tracking" description="Track due schedules, collections follow-up, resolved queues, and recent repayments from one servicing workspace.">
      <RepaymentFilterForm
        assignees={assignees}
        defaultValues={{ assignedToUserId, from, memberId, resolutionStatus, scheduleStatus, stage, to }}
        members={uniqueMembers.map((member) => ({ id: member.id, label: `${member.fullName} (${member.memberNumber})` }))}
      />

      {canPostRepayment ? (
        <DashboardSectionCard>
          <DashboardSectionHeader eyebrow="Posting" title="Post repayment" description="Apply repayments against due items and keep installment status synchronized." />
          <div className="mt-5">
            <RepaymentPostForm
              devMode={process.env.NODE_ENV !== "production"}
              loans={loans.filter((loan) => ["disbursed", "active"].includes(loan.status)).map((loan) => ({ id: loan.id, label: `${loan.member.fullName} · ${loan.loanProduct.name}` }))}
              scheduleItems={scheduleItems.filter((item) => ["pending", "due", "overdue", "partially_paid"].includes(item.status)).map((item) => ({ id: item.id, label: `${item.loan.member.fullName} · installment ${item.installmentNumber} · due ${item.dueAt.toISOString().slice(0, 10)}` }))}
            />
          </div>
        </DashboardSectionCard>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <DashboardStatCard label="Collection coverage" value={`${Math.round(dashboard.collectionCoverage * 100)}%`} detail="Coverage against contribution target in the current dashboard snapshot." />
        <DashboardStatCard label="Overdue installments" value={overdueItems.length.toString()} detail="Repayment schedule items currently overdue." tone={overdueItems.length ? "warning" : "default"} />
        <DashboardStatCard label="Promise tracking" value={promiseTrackingItems.length.toString()} detail="Open cases currently waiting on a promise-to-pay outcome." />
        <DashboardStatCard label="High priority" value={highPriorityItems.length.toString()} detail="Collections items flagged as high priority." tone={highPriorityItems.length ? "warning" : "default"} />
        <DashboardStatCard label="Escalated" value={escalatedItems.length.toString()} detail="Cases already escalated beyond the initial collection pass." />
      </section>

      {canPostRepayment ? (
        <div className="flex justify-end">
          <form action={refreshCollectionsStatusesAction}>
            <Button type="submit" variant="outline" className="rounded-full">Refresh collections status</Button>
          </form>
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-2">
        <DashboardSectionCard>
          <DashboardSectionHeader eyebrow="Queue" title="Open collections queue" actions={<TrendPill>{openCases.length} open</TrendPill>} />
          <div className="mt-5 space-y-3">
            {openCases.length ? openCases.slice(0, 12).map((item) => (
              <DashboardSurfaceCard key={`open-${item.id}`}>
                <p className="font-medium text-foreground">{item.loan.member.fullName}</p>
                <p className="text-sm text-muted-foreground">Installment {item.installmentNumber} · {item.collectionFollowUps[0]?.caseStage?.replace(/_/g, " ") ?? "no case yet"}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.collectionFollowUps[0]?.assignedToUser?.fullName ?? "Unassigned"} · due {item.dueAt.toISOString().slice(0, 10)}</p>
              </DashboardSurfaceCard>
            )) : <p className="text-sm text-muted-foreground">No open collection cases in the current filter.</p>}
          </div>
        </DashboardSectionCard>

        <DashboardSectionCard>
          <DashboardSectionHeader eyebrow="Resolved" title="Resolved queue" actions={<TrendPill>{resolvedCases.length} resolved</TrendPill>} />
          <div className="mt-5 space-y-3">
            {resolvedCases.length ? resolvedCases.slice(0, 12).map((item) => (
              <DashboardSurfaceCard key={`resolved-${item.id}`}>
                <p className="font-medium text-foreground">{item.loan.member.fullName}</p>
                <p className="text-sm text-muted-foreground">{item.collectionFollowUps[0]?.status?.replace(/_/g, " ") ?? "resolved"} · {item.collectionFollowUps[0]?.resolutionStatus ?? "resolved"}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.collectionFollowUps[0]?.actorUser.fullName ?? "Staff"} · updated {item.collectionFollowUps[0]?.createdAt.toISOString().slice(0, 10)}</p>
              </DashboardSurfaceCard>
            )) : <p className="text-sm text-muted-foreground">No resolved cases in the current filter.</p>}
          </div>
        </DashboardSectionCard>
      </section>

      <DashboardSectionCard>
        <DashboardSectionHeader eyebrow="Follow-up" title="Collections follow-up" description="Capture notes, next actions, assignee changes, and resolution updates against overdue items." actions={<TrendPill>{overdueItems.length} overdue</TrendPill>} />
        <div className="mt-5 space-y-3">
          {overdueItems.length > 0 ? overdueItems.slice(0, 20).map((item) => (
            <DashboardSurfaceCard key={item.id}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">{item.loan.member.fullName}</p>
                  <p className="text-sm text-muted-foreground">Installment {item.installmentNumber} · due {item.dueAt.toISOString().slice(0, 10)}</p>
                  {item.collectionFollowUps[0] ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Last {item.collectionFollowUps[0].status.replace(/_/g, " ")} by {item.collectionFollowUps[0].actorUser.fullName} on {item.collectionFollowUps[0].createdAt.toISOString().slice(0, 10)}
                    </p>
                  ) : null}
                </div>
                <div className="text-sm text-muted-foreground">outstanding {formatCurrency(Number(item.totalDue) - Number(item.amountPaid))}</div>
              </div>
              {canPostRepayment ? <div className="mt-4"><CollectionFollowUpForm assignees={assignees} repaymentScheduleItemId={item.id} /></div> : null}
            </DashboardSurfaceCard>
          )) : <p className="text-sm text-muted-foreground">No overdue installments are currently flagged.</p>}
        </div>
      </DashboardSectionCard>

      <section className="grid gap-4 xl:grid-cols-2">
        <DashboardSectionCard>
          <DashboardSectionHeader eyebrow="Schedule" title="Repayment schedule" actions={<TrendPill>{scheduleItems.length} items</TrendPill>} />
          <div className="mt-5 space-y-3">
            {scheduleItems.slice(0, 20).map((item) => (
              <DashboardSurfaceCard key={item.id}>
                <p className="font-medium text-foreground">{item.loan.member.fullName} · installment {item.installmentNumber}</p>
                <p className="text-sm text-muted-foreground">Due {item.dueAt.toISOString().slice(0, 10)} · total {formatCurrency(Number(item.totalDue))}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.status.replace(/_/g, " ")} · paid {formatCurrency(Number(item.amountPaid))}</p>
              </DashboardSurfaceCard>
            ))}
          </div>
        </DashboardSectionCard>

        <DashboardSectionCard>
          <DashboardSectionHeader eyebrow="History" title="Recent repayments" actions={<TrendPill>{repayments.length} posted</TrendPill>} />
          <div className="mt-5 space-y-3">
            {repayments.slice(0, 20).map((repayment) => (
              <DashboardSurfaceCard key={repayment.id}>
                <p className="font-medium text-foreground">{repayment.member.fullName}</p>
                <p className="text-sm text-muted-foreground">{repayment.loan.loanProduct.name} · {repayment.paidAt.toISOString().slice(0, 10)}</p>
                <p className="mt-1 text-sm font-medium text-foreground">{formatCurrency(Number(repayment.amount))}</p>
              </DashboardSurfaceCard>
            ))}
          </div>
        </DashboardSectionCard>
      </section>
    </WorkspacePageShell>
  )
}
