import { createDbRuntime, listContributionPlans, listContributions, listLoans, listMembers } from "@halaal-vest/db"
import { formatCurrency } from "@halaal-vest/utils"
import {
  DashboardDataTable,
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardStatCard,
  DashboardTable,
  DashboardTableBody,
  DashboardTableCell,
  DashboardTableHead,
  DashboardTableHeaderCell,
  DashboardTableRow,
  TrendPill,
} from "@/components/dashboard/primitives"
import { ContributionFilterForm } from "@/features/forms/misc-forms"
import {
  ContributionPlanCloseForm,
  ContributionPlanForm,
  ContributionPlanUpdateForm,
  MemberPaymentPreferenceForm,
  MemberPaymentForm,
} from "@/features/forms/finance-forms"
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
      <WorkspacePageShell eyebrow="Contributions" title="Contribution ledger" description="Contribution collection and posting activity for the active cooperative.">
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
      description="Manage variable member commitments, split payments, overpayments, and active savings plans from one Midday-style ledger workspace."
    >
      <ContributionFilterForm
        defaultValues={{ channel, from, memberId, search, status: "", to }}
        members={members.items.map((member) => ({ id: member.id, label: `${member.fullName} (${member.memberNumber})` }))}
      />

      <section className="grid gap-4 xl:grid-cols-4">
        <DashboardStatCard label="Entries" value={contributions.total.toString()} detail="Posted contribution records in the current filtered result." />
        <DashboardStatCard label="Active commitments" value={activeCommitmentPlans.length.toString()} detail="Current recurring savings plans still open for members." tone="positive" />
        <DashboardStatCard label="Loans in servicing" value={activeLoans.length.toString()} detail="Active loans available when splitting one member payment." />
        <DashboardStatCard label="Members loaded" value={members.items.length.toString()} detail="Available members in the current workspace runtime." />
      </section>

      {canRecordContributions ? (
        <section className="grid gap-4 xl:grid-cols-2">
          <DashboardSectionCard>
            <DashboardSectionHeader eyebrow="Commitments" title="Create or revise a member plan" description="Set the member’s recurring target and keep the plan history explicit." />
            <div className="mt-5">
              <ContributionPlanForm
                devMode={process.env.NODE_ENV !== "production"}
                members={members.items.map((member) => ({ id: member.id, label: `${member.fullName} (${member.memberNumber})` }))}
              />
            </div>
          </DashboardSectionCard>

          <DashboardSectionCard>
            <DashboardSectionHeader eyebrow="Posting" title="Record member payment" description="Apply one payment across savings, committed amount, extra savings, and active loan servicing." />
            <div className="mt-5">
              <MemberPaymentForm
                commitmentPlans={activeCommitmentPlans.map((plan) => ({ id: plan.id, label: `${plan.member.fullName} · ${formatCurrency(Number(plan.amount))}` }))}
                devMode={process.env.NODE_ENV !== "production"}
                loans={activeLoans.map((loan) => ({ id: loan.id, label: `${loan.member.fullName} · ${loan.loanProduct.name}` }))}
                members={members.items.map((member) => ({ id: member.id, label: `${member.fullName} (${member.memberNumber})` }))}
              />
            </div>
          </DashboardSectionCard>
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-2">
        <DashboardSectionCard>
          <DashboardSectionHeader eyebrow="Presets" title="Member payment preferences" description="Control how any remainder is allocated when a total payment is larger than the manual split." />
          <div className="mt-5 space-y-3">
            {members.items.map((member) => (
              <MemberPaymentPreferenceForm
                key={member.id}
                defaultValues={{ memberId: member.id, preference: member.paymentAllocationPreference }}
                title={`${member.fullName} · ${member.memberNumber}`}
              />
            ))}
          </div>
        </DashboardSectionCard>

        <DashboardSectionCard>
          <DashboardSectionHeader eyebrow="Plans" title="Active commitment plans" description="Update a member’s current monthly commitment or close the plan when the schedule changes." />
          <div className="mt-5 space-y-3">
            {activeCommitmentPlans.length ? activeCommitmentPlans.map((plan) => (
              <div key={plan.id} className="rounded-2xl border border-border/70 bg-muted/25 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{plan.member.fullName}</p>
                    <p className="text-sm text-muted-foreground">{formatCurrency(Number(plan.amount))} · from {plan.startsAt.toISOString().slice(0, 10)}</p>
                  </div>
                  <TrendPill tone="positive">Active</TrendPill>
                </div>
                <ContributionPlanUpdateForm defaultValues={{ amount: String(Number(plan.amount)), name: plan.name ?? "", planId: plan.id }} />
                <ContributionPlanCloseForm planId={plan.id} />
              </div>
            )) : <p className="text-sm text-muted-foreground">No active commitment plans yet.</p>}
          </div>
        </DashboardSectionCard>
      </section>

      <DashboardSectionCard>
        <DashboardSectionHeader eyebrow="Ledger" title="Recent contribution activity" description="The current filtered ledger including committed amount, extra savings, and posting date." actions={<TrendPill>{contributions.total} rows</TrendPill>} />
        <div className="mt-5">
          <DashboardDataTable>
            <DashboardTable>
              <DashboardTableHead>
                <DashboardTableHeaderCell>Member</DashboardTableHeaderCell>
                <DashboardTableHeaderCell>Savings</DashboardTableHeaderCell>
                <DashboardTableHeaderCell>Committed</DashboardTableHeaderCell>
                <DashboardTableHeaderCell>Extra savings</DashboardTableHeaderCell>
                <DashboardTableHeaderCell>Posted</DashboardTableHeaderCell>
              </DashboardTableHead>
              <DashboardTableBody>
                {contributions.items.map((contribution) => (
                  <DashboardTableRow key={contribution.id}>
                    <DashboardTableCell>
                      <div>
                        <p className="font-medium text-foreground">{contribution.member?.fullName ?? "Unknown member"}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{contribution.member?.memberNumber ?? "No member number"}</p>
                      </div>
                    </DashboardTableCell>
                    <DashboardTableCell>{formatCurrency(Number(contribution.amount))}</DashboardTableCell>
                    <DashboardTableCell>{contribution.committedAmount ? formatCurrency(Number(contribution.committedAmount)) : "n/a"}</DashboardTableCell>
                    <DashboardTableCell>{formatCurrency(Number(contribution.extraSavingsAmount ?? 0))}</DashboardTableCell>
                    <DashboardTableCell>{contribution.postedAt.toISOString().slice(0, 10)}</DashboardTableCell>
                  </DashboardTableRow>
                ))}
              </DashboardTableBody>
            </DashboardTable>
          </DashboardDataTable>
        </div>
      </DashboardSectionCard>
    </WorkspacePageShell>
  )
}
