import {
  createDbRuntime,
  listTenantUsersWithMemberships,
  listLoans,
  listRepaymentScheduleItems,
  listRepayments,
} from "@halaal-vest/db"
import { Button } from "@halaal-vest/ui/components/button"
import { formatCurrency } from "@halaal-vest/utils"
import { CollectionFollowUpForm, RepaymentPostForm } from "@/features/forms/finance-forms"
import { RepaymentFilterForm } from "@/features/forms/misc-forms"
import {
  refreshCollectionsStatusesAction,
} from "@/lib/dashboard-actions"
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

  const [loans, scheduleItems, repayments, tenantUsers] = await Promise.all([
    listLoans(context.tenant.id),
    listRepaymentScheduleItems(context.tenant.id, {
      assignedToUserId: assignedToUserId || undefined,
      fromDate: from ? new Date(`${from}T00:00:00.000Z`) : undefined,
      memberId: memberId || undefined,
      resolutionStatus: resolutionStatus || undefined,
      stage: stage || undefined,
      status: scheduleStatus
        ? (scheduleStatus as "due" | "overdue" | "paid" | "partially_paid" | "pending")
        : undefined,
      toDate: to ? new Date(`${to}T23:59:59.999Z`) : undefined,
    }),
    listRepayments(context.tenant.id),
    listTenantUsersWithMemberships(context.tenant.id),
  ])
  const uniqueMembers = Array.from(new Map(loans.map((loan) => [loan.member.id, loan.member])).values())
  const assignees = tenantUsers
    .filter((user) => user.memberships.some((membership) => ["super_admin", "tenant_admin", "finance_officer", "operations_officer"].includes(membership.role)))
    .map((user) => ({
      id: user.id,
      label: `${user.fullName} (${user.email})`,
    }))

  const canPostRepayment = hasAnyRole(context.auth.membership?.role, financeManagementRoles)
  const overdueItems = scheduleItems.filter((item) => item.status === "overdue")
  const openCases = overdueItems.filter((item) => item.collectionFollowUps[0]?.resolutionStatus !== "resolved")
  const promiseTrackingItems = overdueItems.filter((item) => item.collectionFollowUps[0]?.caseStage === "promise_tracking")
  const escalatedItems = overdueItems.filter((item) => item.collectionFollowUps[0]?.caseStage === "escalated")
  const highPriorityItems = overdueItems.filter((item) => item.collectionFollowUps[0]?.priority === "high")
  const resolvedCases = overdueItems.filter((item) => item.collectionFollowUps[0]?.resolutionStatus === "resolved")

  return (
    <WorkspacePageShell
      eyebrow="Repayments"
      title="Repayment tracking"
      description="Track upcoming dues, overdue installments, and posted repayments for active cooperative loans."
    >
      <RepaymentFilterForm
        assignees={assignees}
        defaultValues={{ assignedToUserId, from, memberId, resolutionStatus, scheduleStatus, stage, to }}
        members={uniqueMembers.map((member) => ({
          id: member.id,
          label: `${member.fullName} (${member.memberNumber})`,
        }))}
      />

      {canPostRepayment ? (
        <RepaymentPostForm
          devMode={process.env.NODE_ENV !== "production"}
          loans={loans
            .filter((loan) => ["disbursed", "active"].includes(loan.status))
            .map((loan) => ({
              id: loan.id,
              label: `${loan.member.fullName} · ${loan.loanProduct.name}`,
            }))}
          scheduleItems={scheduleItems
            .filter((item) => ["pending", "due", "overdue", "partially_paid"].includes(item.status))
            .map((item) => ({
              id: item.id,
              label: `${item.loan.member.fullName} · installment ${item.installmentNumber} · due ${item.dueAt.toISOString().slice(0, 10)}`,
            }))}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Collection coverage</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight">{Math.round(dashboard.collectionCoverage * 100)}%</p>
        </div>
        <div className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Overdue installments</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight">{overdueItems.length}</p>
        </div>
        <div className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Promise tracking</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight">{promiseTrackingItems.length}</p>
        </div>
        <div className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">High priority cases</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight">{highPriorityItems.length}</p>
        </div>
        <div className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Escalated cases</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight">{escalatedItems.length}</p>
        </div>
      </div>

      {canPostRepayment ? (
        <div className="flex justify-end">
          <form action={refreshCollectionsStatusesAction}>
            <Button type="submit" variant="outline">Refresh collections status</Button>
          </form>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-[1.75rem] border border-border/70 bg-background/92 shadow-sm">
          <div className="border-b border-border/60 px-4 py-3">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">Open collections queue</h3>
          </div>
          <div className="divide-y divide-border/60">
            {openCases.length ? openCases.slice(0, 12).map((item) => (
              <div key={`open-${item.id}`} className="px-4 py-4">
                <p className="font-medium text-foreground">{item.loan.member.fullName}</p>
                <p className="text-sm text-muted-foreground">
                  Installment {item.installmentNumber} · {item.collectionFollowUps[0]?.caseStage?.replace(/_/g, " ") ?? "no case yet"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.collectionFollowUps[0]?.assignedToUser?.fullName ?? "Unassigned"} · due {item.dueAt.toISOString().slice(0, 10)}
                </p>
              </div>
            )) : (
              <div className="px-4 py-4 text-sm text-muted-foreground">No open collection cases in the current filter.</div>
            )}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-border/70 bg-background/92 shadow-sm">
          <div className="border-b border-border/60 px-4 py-3">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">Resolved queue</h3>
          </div>
          <div className="divide-y divide-border/60">
            {resolvedCases.length ? resolvedCases.slice(0, 12).map((item) => (
              <div key={`resolved-${item.id}`} className="px-4 py-4">
                <p className="font-medium text-foreground">{item.loan.member.fullName}</p>
                <p className="text-sm text-muted-foreground">
                  {item.collectionFollowUps[0]?.status?.replace(/_/g, " ") ?? "resolved"} · {item.collectionFollowUps[0]?.resolutionStatus ?? "resolved"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.collectionFollowUps[0]?.actorUser.fullName ?? "Staff"} · updated {item.collectionFollowUps[0]?.createdAt.toISOString().slice(0, 10)}
                </p>
              </div>
            )) : (
              <div className="px-4 py-4 text-sm text-muted-foreground">No resolved cases in the current filter.</div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-border/70 bg-background/92 shadow-sm">
        <div className="border-b border-border/60 px-4 py-3">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Collections follow-up</h3>
        </div>
        <div className="divide-y divide-border/60">
          {overdueItems.length > 0 ? overdueItems.slice(0, 20).map((item) => (
            <div key={item.id} className="px-4 py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">{item.loan.member.fullName}</p>
                  <p className="text-sm text-muted-foreground">
                    Installment {item.installmentNumber} · due {item.dueAt.toISOString().slice(0, 10)}
                  </p>
                  {item.collectionFollowUps[0] ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Last follow-up {item.collectionFollowUps[0].status.replace(/_/g, " ")} by{" "}
                      {item.collectionFollowUps[0].actorUser.fullName} on {item.collectionFollowUps[0].createdAt.toISOString().slice(0, 10)}
                      {item.collectionFollowUps[0].nextActionAt
                        ? ` · next ${item.collectionFollowUps[0].nextActionAt.toISOString().slice(0, 10)}`
                        : ""}
                      {item.collectionFollowUps[0].assignedToUser
                        ? ` · assigned to ${item.collectionFollowUps[0].assignedToUser.fullName}`
                        : ""}
                      {item.collectionFollowUps[0].promiseToPayAt
                        ? ` · promise ${item.collectionFollowUps[0].promiseToPayAt.toISOString().slice(0, 10)}`
                        : ""}
                      {item.collectionFollowUps[0].caseStage
                        ? ` · ${item.collectionFollowUps[0].caseStage.replace(/_/g, " ")}`
                        : ""}
                      {item.collectionFollowUps[0].resolutionStatus
                        ? ` · ${item.collectionFollowUps[0].resolutionStatus}`
                        : ""}
                    </p>
                  ) : null}
                </div>
                <div className="text-sm text-muted-foreground">
                  outstanding {formatCurrency(Number(item.totalDue) - Number(item.amountPaid))}
                </div>
              </div>
              {canPostRepayment ? (
                <CollectionFollowUpForm assignees={assignees} repaymentScheduleItemId={item.id} />
              ) : null}
            </div>
          )) : (
            <div className="px-4 py-4 text-sm text-muted-foreground">
              No overdue installments are currently flagged.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-border/70 bg-background/92 shadow-sm">
        <div className="border-b border-border/60 px-4 py-3">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Repayment schedule</h3>
        </div>
        <div className="divide-y divide-border/60">
          {scheduleItems.slice(0, 20).map((item) => (
            <div key={item.id} className="px-4 py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    {item.loan.member.fullName} · installment {item.installmentNumber}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Due {item.dueAt.toISOString().slice(0, 10)} · total {formatCurrency(Number(item.totalDue))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Scheduled servicing {formatCurrency(Number(item.loan.estimatedMonthlyServicing))} · extra savings target {formatCurrency(Number(item.loan.extraMonthlySavingsAmount))}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  {item.status.replace(/_/g, " ")} · paid {formatCurrency(Number(item.amountPaid))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-border/70 bg-background/92 shadow-sm">
        <div className="border-b border-border/60 px-4 py-3">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Recent repayments</h3>
        </div>
        <div className="divide-y divide-border/60">
          {repayments.slice(0, 20).map((repayment) => (
            <div key={repayment.id} className="px-4 py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">{repayment.member.fullName}</p>
                  <p className="text-sm text-muted-foreground">
                    {repayment.loan.loanProduct.name} · {repayment.paidAt.toISOString().slice(0, 10)}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatCurrency(Number(repayment.amount))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </WorkspacePageShell>
  )
}
