import { Button } from "@halaal-vest/ui/components/button"
import { formatCurrency } from "@halaal-vest/utils"
import {
  DashboardDataTable,
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardStatCard,
  DashboardSurfaceCard,
  DashboardTable,
  DashboardTableBody,
  DashboardTableCell,
  DashboardTableHead,
  DashboardTableHeaderCell,
  DashboardTableRow,
  TrendPill,
  WorkspacePageShell,
} from "@/components/dashboard"
import { ChargeApplicationForm, ChargeDefinitionForm } from "@/components/forms/finance-forms"
import {
  reverseChargeApplicationAction,
  updateChargeDefinitionAction,
  waiveChargeApplicationAction,
} from "@/lib/dashboard-actions"

export function ChargesPageView({
  activeCharges,
  canManageCharges,
  chargeApplications,
  charges,
  members,
  monthlyLevies,
  postedApplications,
}: {
  activeCharges: Array<{
    amount: number | string | { toString(): string }
    code: string
    id: string
    isActive: boolean
    isMonthlyLevy: boolean
    kind: string
    name: string
  }>
  canManageCharges: boolean
  chargeApplications: Array<{
    amount: number | string | { toString(): string }
    chargeDefinition: { name: string }
    id: string
    member: { fullName: string }
    status: string
  }>
  charges: Array<{
    amount: number | string | { toString(): string }
    code: string
    id: string
    isActive: boolean
    isMonthlyLevy: boolean
    kind: string
    name: string
  }>
  members: {
    items: Array<{ fullName: string; id: string; memberNumber: string }>
  }
  monthlyLevies: Array<unknown>
  postedApplications: Array<unknown>
}) {
  return (
    <WorkspacePageShell
      eyebrow="Charges"
      title="Charge definitions"
      description="A Midday-style finance control surface for charge setup, active levy monitoring, and recent charge application corrections."
    >
      <section className="grid gap-4 xl:grid-cols-4">
        <DashboardStatCard
          label="Charge definitions"
          value={charges.length.toString()}
          detail="Total configured levy and charge rules for this tenant."
        />
        <DashboardStatCard
          label="Active charges"
          value={activeCharges.length.toString()}
          detail="Charge rules currently eligible for posting or assignment."
          tone="positive"
        />
        <DashboardStatCard
          label="Monthly levies"
          value={monthlyLevies.length.toString()}
          detail="Recurring levy rules used in monthly cooperative collections."
        />
        <DashboardStatCard
          label="Recent posted applications"
          value={postedApplications.length.toString()}
          detail="Recent posted items that may need waiver or reversal follow-up."
          tone={postedApplications.length > 0 ? "warning" : "default"}
        />
      </section>

      {canManageCharges ? (
        <section className="grid gap-4 xl:grid-cols-2">
          <DashboardSectionCard>
            <DashboardSectionHeader
              eyebrow="Create"
              title="New charge definition"
              description="Configure a reusable tenant charge and keep the posting rules centralized."
            />
            <div className="mt-5">
              <ChargeDefinitionForm devMode={process.env.NODE_ENV !== "production"} />
            </div>
          </DashboardSectionCard>

          <DashboardSectionCard>
            <DashboardSectionHeader
              eyebrow="Apply"
              title="Post charge to a member"
              description="Assign an active charge to a member and push it into the recent activity lane."
            />
            <div className="mt-5">
              <ChargeApplicationForm
                chargeDefinitions={activeCharges.map((charge) => ({
                  id: charge.id,
                  label: `${charge.name} (${charge.code})`,
                }))}
                devMode={process.env.NODE_ENV !== "production"}
                members={members.items.map((member) => ({
                  id: member.id,
                  label: `${member.fullName} (${member.memberNumber})`,
                }))}
              />
            </div>
          </DashboardSectionCard>
        </section>
      ) : null}

      <DashboardSectionCard>
        <DashboardSectionHeader
          eyebrow="Definitions"
          title="Charge library"
          description="Every configured charge, its amount, posting kind, and whether it is currently active."
          actions={<TrendPill>{charges.length} configured</TrendPill>}
        />

        <div className="mt-5">
          <DashboardDataTable>
            <DashboardTable>
              <DashboardTableHead>
                <DashboardTableHeaderCell>Charge</DashboardTableHeaderCell>
                <DashboardTableHeaderCell>Status</DashboardTableHeaderCell>
                <DashboardTableHeaderCell>Kind</DashboardTableHeaderCell>
                <DashboardTableHeaderCell align="right">Amount</DashboardTableHeaderCell>
                <DashboardTableHeaderCell align="right">Action</DashboardTableHeaderCell>
              </DashboardTableHead>
              <DashboardTableBody>
                {charges.map((charge) => (
                  <DashboardTableRow key={charge.id}>
                    <DashboardTableCell>
                      <div>
                        <p className="font-medium text-foreground">{charge.name}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          {charge.code}
                        </p>
                      </div>
                    </DashboardTableCell>
                    <DashboardTableCell>
                      <div className="flex flex-wrap gap-2">
                        <TrendPill tone={charge.isActive ? "positive" : "warning"}>
                          {charge.isActive ? "Active" : "Inactive"}
                        </TrendPill>
                        {charge.isMonthlyLevy ? <TrendPill>Monthly levy</TrendPill> : null}
                      </div>
                    </DashboardTableCell>
                    <DashboardTableCell>
                      <span className="capitalize text-muted-foreground">{charge.kind.replace(/_/g, " ")}</span>
                    </DashboardTableCell>
                    <DashboardTableCell align="right" className="font-medium">
                      {formatCurrency(Number(charge.amount))}
                    </DashboardTableCell>
                    <DashboardTableCell align="right">
                      {canManageCharges ? (
                        <form action={updateChargeDefinitionAction} className="inline-flex">
                          <input type="hidden" name="chargeDefinitionId" value={charge.id} />
                          <Button
                            size="sm"
                            type="submit"
                            name="isActive"
                            value={charge.isActive ? "false" : "true"}
                            variant="outline"
                            className="rounded-full"
                          >
                            {charge.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        </form>
                      ) : (
                        <span className="text-sm text-muted-foreground">View only</span>
                      )}
                    </DashboardTableCell>
                  </DashboardTableRow>
                ))}
              </DashboardTableBody>
            </DashboardTable>
          </DashboardDataTable>
        </div>
      </DashboardSectionCard>

      <DashboardSectionCard>
        <DashboardSectionHeader
          eyebrow="Applications"
          title="Recent charge applications"
          description="Track recent charge postings and quickly handle waivers or reversals for posted items."
          actions={<TrendPill>{chargeApplications.length} recent items</TrendPill>}
        />

        <div className="mt-5 space-y-3">
          {chargeApplications.map((application) => (
            <DashboardSurfaceCard as="article" key={application.id}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{application.member.fullName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {application.chargeDefinition.name} · {formatCurrency(Number(application.amount))}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <TrendPill tone={application.status === "posted" ? "positive" : "warning"}>
                    {application.status}
                  </TrendPill>
                  {canManageCharges && application.status === "posted" ? (
                    <>
                      <form action={waiveChargeApplicationAction}>
                        <input type="hidden" name="chargeApplicationId" value={application.id} />
                        <Button size="sm" type="submit" variant="outline" className="rounded-full">
                          Waive
                        </Button>
                      </form>
                      <form action={reverseChargeApplicationAction}>
                        <input type="hidden" name="chargeApplicationId" value={application.id} />
                        <Button size="sm" type="submit" variant="outline" className="rounded-full">
                          Reverse
                        </Button>
                      </form>
                    </>
                  ) : null}
                </div>
              </div>
            </DashboardSurfaceCard>
          ))}
        </div>
      </DashboardSectionCard>
    </WorkspacePageShell>
  )
}
