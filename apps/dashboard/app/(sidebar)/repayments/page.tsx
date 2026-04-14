import { createDbRuntime, listLoans, listRepaymentScheduleItems, listRepayments, listTenantUsersWithMemberships } from "@halaal-vest/db"
import { Button } from "@halaal-vest/ui/components/button"
import { formatCurrency } from "@halaal-vest/utils"
import { DashboardSectionCard, DashboardSectionHeader, DashboardStatCard, TrendPill } from "@/components/dashboard/primitives"
import { CollectionFollowUpForm, RepaymentPostForm } from "@/features/forms/finance-forms"
import { RepaymentFilterForm } from "@/features/forms/misc-forms"
import { refreshCollectionsStatusesAction } from "@/lib/dashboard-actions"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/features/workspace/page-shell"
import { getDashboardPageData, getDashboardServerContext } from "@/lib/server-context"
import { financeManagementRoles, hasAnyRole } from "@/lib/workspace-access"

export default async function RepaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const { dashboard } = await getDashboardPageData()
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const assignedToUserId = typeof params.assignedToUserId === "string" ? params.assignedToUserId : ""
  const memberId = typeof params.memberId === "string" ? params.memberId : ""
  const resolutionStatus = typeof params.resolutionStatus === "string" ? params.resolutionStatus : ""
  const scheduleStatus = typeof params.scheduleStatus === "string" ? params.scheduleStatus : ""
  const stage = typeof params.stage === "string" ? params.stage : ""
  const from = typeof params.from === "string" ? params.from : ""
  const to = typeof params.to === "string" ? params.to : ""

  if (!context.tenant || runtime.status !== "database-configured") {
    return (
      <WorkspacePageShell eyebrow="Repayments" title="Repayment tracking" description="Track overdue exposure, repayment progress, and the collections workflow from one route.">
        <WorkspaceEmptyState title="Repayment workflows need the database runtime." body="Once the database-backed environment is active, this route will manage schedule items, repayment posting, and collections follow-up." />
      </WorkspacePageShell>
    )
  }

  const [loans, scheduleItems, repayments, tenantUsers] = await Promise.all([
    listLoans(context.tenant.id),
    listRepaymentScheduleItems(context.tenant.id, {
      assignedToUserId: assignedToUserId || undefined,
      fromDate: from ? new Date(`${from}T00:00:00.000Z`) : undefined,
      memberId: memberId || undefined,
      resolutionStatus: resolutionStatus || undefined,
      stage: stage || undefined,
      status: scheduleStatus ? (scheduleStatus as "due" | "overdue" | "paid" | "partially_paid" | "pending") : undefined,
      toDate: to ? new Date(`${to}T23:59:59.999Z`) : undefined,
    }),
    listRepayments(context.tenant.id),
    listTenantUsersWithMemberships(context.tenant.id),
  ])

  const uniqueMembers = Array.from(new Map(loans.map((loan) => [loan.member.id, loan.member])).values())
  const assignees = tenantUsers
    .filter((user) => user.memberships.some((membership) => ["super_admin", "tenant_admin", "finance_officer", "operations_officer"].includes(membership.role)))
    .map((user) => ({ id: user.id, label: `${user.fullName} (${user.email})` }))
  const canPostRepayment = hasAnyRole(context.auth.membership?.role, financeManagementRoles)
  const overdueItems = scheduleItems.filter((item) => item.status === "overdue")
  const openCases = overdueItems.filter((item) => item.collectionFollowUps[0]?.resolutionStatus !== "resolved")
  const promiseTrackingItems = overdueItems.filter((item) => item.collectionFollowUps[0]?.caseStage === "promise_tracking")
  const escalatedItems = overdueItems.filter((item) => item.collectionFollowUps[0]?.caseStage === "escalated")
  const highPriorityItems = overdueItems.filter((item) => item.collectionFollowUps[0]?.priority === "high")
  const resolvedCases = overdueItems.filter((item) => item.collectionFollowUps[0]?.resolutionStatus === "resolved")

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
              <div key={`open-${item.id}`} className="rounded-2xl border border-border/70 bg-muted/25 p-4">
                <p className="font-medium text-foreground">{item.loan.member.fullName}</p>
                <p className="text-sm text-muted-foreground">Installment {item.installmentNumber} · {item.collectionFollowUps[0]?.caseStage?.replace(/_/g, " ") ?? "no case yet"}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.collectionFollowUps[0]?.assignedToUser?.fullName ?? "Unassigned"} · due {item.dueAt.toISOString().slice(0, 10)}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">No open collection cases in the current filter.</p>}
          </div>
        </DashboardSectionCard>

        <DashboardSectionCard>
          <DashboardSectionHeader eyebrow="Resolved" title="Resolved queue" actions={<TrendPill>{resolvedCases.length} resolved</TrendPill>} />
          <div className="mt-5 space-y-3">
            {resolvedCases.length ? resolvedCases.slice(0, 12).map((item) => (
              <div key={`resolved-${item.id}`} className="rounded-2xl border border-border/70 bg-muted/25 p-4">
                <p className="font-medium text-foreground">{item.loan.member.fullName}</p>
                <p className="text-sm text-muted-foreground">{item.collectionFollowUps[0]?.status?.replace(/_/g, " ") ?? "resolved"} · {item.collectionFollowUps[0]?.resolutionStatus ?? "resolved"}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.collectionFollowUps[0]?.actorUser.fullName ?? "Staff"} · updated {item.collectionFollowUps[0]?.createdAt.toISOString().slice(0, 10)}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">No resolved cases in the current filter.</p>}
          </div>
        </DashboardSectionCard>
      </section>

      <DashboardSectionCard>
        <DashboardSectionHeader eyebrow="Follow-up" title="Collections follow-up" description="Capture notes, next actions, assignee changes, and resolution updates against overdue items." actions={<TrendPill>{overdueItems.length} overdue</TrendPill>} />
        <div className="mt-5 space-y-3">
          {overdueItems.length > 0 ? overdueItems.slice(0, 20).map((item) => (
            <div key={item.id} className="rounded-2xl border border-border/70 bg-muted/25 p-4">
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
            </div>
          )) : <p className="text-sm text-muted-foreground">No overdue installments are currently flagged.</p>}
        </div>
      </DashboardSectionCard>

      <section className="grid gap-4 xl:grid-cols-2">
        <DashboardSectionCard>
          <DashboardSectionHeader eyebrow="Schedule" title="Repayment schedule" actions={<TrendPill>{scheduleItems.length} items</TrendPill>} />
          <div className="mt-5 space-y-3">
            {scheduleItems.slice(0, 20).map((item) => (
              <div key={item.id} className="rounded-2xl border border-border/70 bg-muted/25 p-4">
                <p className="font-medium text-foreground">{item.loan.member.fullName} · installment {item.installmentNumber}</p>
                <p className="text-sm text-muted-foreground">Due {item.dueAt.toISOString().slice(0, 10)} · total {formatCurrency(Number(item.totalDue))}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.status.replace(/_/g, " ")} · paid {formatCurrency(Number(item.amountPaid))}</p>
              </div>
            ))}
          </div>
        </DashboardSectionCard>

        <DashboardSectionCard>
          <DashboardSectionHeader eyebrow="History" title="Recent repayments" actions={<TrendPill>{repayments.length} posted</TrendPill>} />
          <div className="mt-5 space-y-3">
            {repayments.slice(0, 20).map((repayment) => (
              <div key={repayment.id} className="rounded-2xl border border-border/70 bg-muted/25 p-4">
                <p className="font-medium text-foreground">{repayment.member.fullName}</p>
                <p className="text-sm text-muted-foreground">{repayment.loan.loanProduct.name} · {repayment.paidAt.toISOString().slice(0, 10)}</p>
                <p className="mt-1 text-sm font-medium text-foreground">{formatCurrency(Number(repayment.amount))}</p>
              </div>
            ))}
          </div>
        </DashboardSectionCard>
      </section>
    </WorkspacePageShell>
  )
}
