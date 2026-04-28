import { formatCurrency } from "@halaal-vest/utils"
import {
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardStatCard,
  DashboardSurfaceCard,
  TrendPill,
  WorkspacePageShell,
} from "@/components/dashboard"
import {
  ContributionPlanCloseForm,
  ContributionPlanForm,
  ContributionPlanUpdateForm,
  MemberPaymentForm,
  MemberPaymentPreferenceForm,
} from "@/components/forms/finance-forms"
import { ContributionFilterForm } from "@/components/forms/misc-forms"
import { ContributionsDataTable } from "@/components/tables/contributions/data-table"
import { loadContributionsPageData } from "@/lib/contributions"

type ContributionsPageData = Extract<
  Awaited<ReturnType<typeof loadContributionsPageData>>,
  { state: "ready" }
>

function formatIsoDate(value: Date) {
  return value.toISOString().slice(0, 10)
}

export function ContributionsPageView({
  canRecordContributions,
  commitmentPlans,
  contributions,
  filters,
  loans,
  members,
}: ContributionsPageData) {
  const activeCommitmentPlans = commitmentPlans.filter((plan) => plan.isActive)
  const activeLoans = loans.filter((loan) =>
    ["approved", "disbursed", "active"].includes(loan.status),
  )
  const memberOptions = members.items.map((member) => ({
    id: member.id,
    label: `${member.fullName} (${member.memberNumber})`,
  }))

  return (
    <WorkspacePageShell
      eyebrow="Contributions"
      title="Member commitments and payments"
      description="Manage variable member commitments, split payments, overpayments, and active savings plans from one Midday-style ledger workspace."
    >
      <ContributionFilterForm
        defaultValues={{ ...filters, status: "" }}
        members={memberOptions}
      />

      <section className="grid gap-4 xl:grid-cols-4">
        <DashboardStatCard
          detail="Posted contribution records in the current filtered result."
          label="Entries"
          value={contributions.total.toString()}
        />
        <DashboardStatCard
          detail="Current recurring savings plans still open for members."
          label="Active commitments"
          tone="positive"
          value={activeCommitmentPlans.length.toString()}
        />
        <DashboardStatCard
          detail="Active loans available when splitting one member payment."
          label="Loans in servicing"
          value={activeLoans.length.toString()}
        />
        <DashboardStatCard
          detail="Available members in the current workspace runtime."
          label="Members loaded"
          value={members.items.length.toString()}
        />
      </section>

      {canRecordContributions ? (
        <section className="grid gap-4 xl:grid-cols-2">
          <DashboardSectionCard>
            <DashboardSectionHeader
              description="Set the member’s recurring target and keep the plan history explicit."
              eyebrow="Commitments"
              title="Create or revise a member plan"
            />
            <div className="mt-5">
              <ContributionPlanForm
                devMode={process.env.NODE_ENV !== "production"}
                members={memberOptions}
              />
            </div>
          </DashboardSectionCard>

          <DashboardSectionCard>
            <DashboardSectionHeader
              description="Apply one payment across savings, committed amount, extra savings, and active loan servicing."
              eyebrow="Posting"
              title="Record member payment"
            />
            <div className="mt-5">
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
                members={memberOptions}
              />
            </div>
          </DashboardSectionCard>
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-2">
        <DashboardSectionCard>
          <DashboardSectionHeader
            description="Control how any remainder is allocated when a total payment is larger than the manual split."
            eyebrow="Presets"
            title="Member payment preferences"
          />
          <div className="mt-5 space-y-3">
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
        </DashboardSectionCard>

        <DashboardSectionCard>
          <DashboardSectionHeader
            description="Update a member’s current monthly commitment or close the plan when the schedule changes."
            eyebrow="Plans"
            title="Active commitment plans"
          />
          <div className="mt-5 space-y-3">
            {activeCommitmentPlans.length ? (
              activeCommitmentPlans.map((plan) => (
                <DashboardSurfaceCard key={plan.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{plan.member.fullName}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(Number(plan.amount))} · from {formatIsoDate(plan.startsAt)}
                      </p>
                    </div>
                    <TrendPill tone="positive">Active</TrendPill>
                  </div>
                  <ContributionPlanUpdateForm
                    defaultValues={{
                      amount: String(Number(plan.amount)),
                      name: plan.name ?? "",
                      planId: plan.id,
                    }}
                  />
                  <ContributionPlanCloseForm planId={plan.id} />
                </DashboardSurfaceCard>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No active commitment plans yet.</p>
            )}
          </div>
        </DashboardSectionCard>
      </section>

      <DashboardSectionCard>
        <DashboardSectionHeader
          actions={<TrendPill>{contributions.total} rows</TrendPill>}
          description="The current filtered ledger including committed amount, extra savings, and posting date."
          eyebrow="Ledger"
          title="Recent contribution activity"
        />
        <div className="mt-5">
          <ContributionsDataTable items={contributions.items} />
        </div>
      </DashboardSectionCard>
    </WorkspacePageShell>
  )
}
