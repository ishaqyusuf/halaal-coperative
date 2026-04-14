import { createDbRuntime, listContributionPlans, listContributions, listLoans, listMembers } from "@halaal-vest/db"
import { Button } from "@halaal-vest/ui/components/button"
import { Input } from "@halaal-vest/ui/components/input"
import { formatCurrency } from "@halaal-vest/utils"
import { ContributionFilterForm } from "@/features/forms/misc-forms"
import {
  ContributionPlanCloseForm,
  ContributionPlanForm,
  ContributionPlanUpdateForm,
  MemberPaymentPreferenceForm,
  MemberPaymentForm,
} from "@/features/forms/finance-forms"
import {
} from "@/lib/dashboard-actions"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/features/workspace/page-shell"
import { getDashboardServerContext } from "@/lib/server-context"
import { allStaffRoles, hasAnyRole } from "@/lib/workspace-access"

export default async function ContributionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const canRecordContributions = hasAnyRole(context.auth.membership?.role, allStaffRoles)
  const memberId = typeof params.memberId === "string" ? params.memberId : ""
  const channel = typeof params.channel === "string" ? params.channel : ""
  const search = typeof params.search === "string" ? params.search : ""
  const from = typeof params.from === "string" ? params.from : ""
  const to = typeof params.to === "string" ? params.to : ""

  if (!context.tenant || runtime.status !== "database-configured") {
    return (
      <WorkspacePageShell
        eyebrow="Contributions"
        title="Contribution ledger"
        description="Contribution collection and posting activity for the active cooperative."
      >
        <WorkspaceEmptyState
          title="Contribution history is waiting for the database runtime."
          body="Once the database-backed environment is active, this route will show posted contributions, member attribution, commitment plans, and collection channels."
        />
      </WorkspacePageShell>
    )
  }

  const [contributions, members, commitmentPlans, loans] = await Promise.all([
    listContributions(context.tenant.id, {
      channel: channel === "payroll" || channel === "transfer" || channel === "cash" || channel === "manual" ? channel : undefined,
      fromDate: from ? new Date(`${from}T00:00:00.000Z`) : undefined,
      memberId: memberId || undefined,
      page: 1,
      pageSize: 20,
      search: search || undefined,
      toDate: to ? new Date(`${to}T23:59:59.999Z`) : undefined,
    }),
    listMembers(context.tenant.id, { page: 1, pageSize: 100 }),
    listContributionPlans(context.tenant.id),
    listLoans(context.tenant.id),
  ])

  const activeCommitmentPlans = commitmentPlans.filter((plan) => plan.isActive)
  const activeLoans = loans.filter((loan) => ["approved", "disbursed", "active"].includes(loan.status))

  return (
    <WorkspacePageShell
      eyebrow="Contributions"
      title="Member commitments and payments"
      description="Each member can keep a different monthly commitment, overpay in any month, and split one payment between savings and loan servicing."
    >
      <ContributionFilterForm
        defaultValues={{ channel, from, memberId, search, status: "", to }}
        members={members.items.map((member) => ({
          id: member.id,
          label: `${member.fullName} (${member.memberNumber})`,
        }))}
      />

      {canRecordContributions ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <ContributionPlanForm
            devMode={process.env.NODE_ENV !== "production"}
            members={members.items.map((member) => ({
              id: member.id,
              label: `${member.fullName} (${member.memberNumber})`,
            }))}
          />

          <MemberPaymentForm
            commitmentPlans={activeCommitmentPlans.map((plan) => ({
              id: plan.id,
              label: `${plan.member.fullName} · ${formatCurrency(Number(plan.amount))}`,
            }))}
            devMode={process.env.NODE_ENV !== "production"}
            loans={activeLoans.map((loan) => ({
              id: loan.id,
              label: `${loan.member.fullName} · ${loan.loanProduct.name}`,
            }))}
            members={members.items.map((member) => ({
              id: member.id,
              label: `${member.fullName} (${member.memberNumber})`,
            }))}
          />
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-[1.75rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Member payment presets</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            When a total payment is larger than the manual split, the member preset decides where the remainder goes.
          </p>
          <div className="mt-4 space-y-3">
            {members.items.map((member) => (
              <MemberPaymentPreferenceForm
                key={member.id}
                defaultValues={{
                  memberId: member.id,
                  preference: member.paymentAllocationPreference,
                }}
                title={`${member.fullName} · ${member.memberNumber}`}
              />
            ))}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Active commitment plans</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Update the current monthly commitment or close it when the member’s schedule changes.
          </p>
          <div className="mt-4 space-y-3">
            {activeCommitmentPlans.length ? (
              activeCommitmentPlans.map((plan) => (
                <div key={plan.id} className="rounded-2xl border border-border/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{plan.member.fullName}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(Number(plan.amount))} · from {plan.startsAt.toISOString().slice(0, 10)}
                      </p>
                    </div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Active</p>
                  </div>
                  <ContributionPlanUpdateForm
                    defaultValues={{
                      amount: String(Number(plan.amount)),
                      name: plan.name ?? "",
                      planId: plan.id,
                    }}
                  />
                  <ContributionPlanCloseForm planId={plan.id} />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No active commitment plans yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Entries</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight">{contributions.total}</p>
        </div>
        <div className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Active commitments</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight">{activeCommitmentPlans.length}</p>
        </div>
        <div className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Loans available for servicing</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight">{activeLoans.length}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-background/92 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-4 py-3 font-medium">Savings</th>
              <th className="px-4 py-3 font-medium">Committed</th>
              <th className="px-4 py-3 font-medium">Extra savings</th>
              <th className="px-4 py-3 font-medium">Posted</th>
            </tr>
          </thead>
          <tbody>
            {contributions.items.map((contribution) => (
              <tr key={contribution.id} className="border-t border-border/60">
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{contribution.member?.fullName ?? "Unknown member"}</div>
                  <div className="text-xs text-muted-foreground">{contribution.member?.memberNumber ?? "No member number"}</div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatCurrency(Number(contribution.amount))}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {contribution.committedAmount ? formatCurrency(Number(contribution.committedAmount)) : "n/a"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatCurrency(Number(contribution.extraSavingsAmount ?? 0))}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{contribution.postedAt.toISOString().slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </WorkspacePageShell>
  )
}
