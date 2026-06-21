import { Button } from "@halaalvest/ui/components/button"
import { formatCurrency } from "@halaalvest/utils"
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
    currentEffectiveFrom: string | null
    chargeValueType: "fixed_amount" | "percentage"
    id: string
    isActive: boolean
    isMonthlyLevy: boolean
    kind: "fixed" | "percentage"
    name: string
    versions: Array<{
      amount: number
      effectiveFrom: string
      id: string
      notes?: string | null
      status: "current" | "historical" | "scheduled"
    }>
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
          description="Every configured charge, its current dated amount, posting kind, and full update history."
          actions={<TrendPill>{charges.length} configured</TrendPill>}
        />

        <div className="mt-5 space-y-4">
          <DashboardDataTable>
            <DashboardTable>
              <DashboardTableHead>
                <DashboardTableHeaderCell>Charge</DashboardTableHeaderCell>
                <DashboardTableHeaderCell>Status</DashboardTableHeaderCell>
                <DashboardTableHeaderCell>Kind</DashboardTableHeaderCell>
                <DashboardTableHeaderCell>Current date</DashboardTableHeaderCell>
                <DashboardTableHeaderCell align="right">Current amount</DashboardTableHeaderCell>
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
                    <DashboardTableCell>
                      <span className="text-muted-foreground">{charge.currentEffectiveFrom ?? "No dated version"}</span>
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

          {charges.map((charge) => (
            <DashboardSurfaceCard as="article" key={`${charge.id}-history`}>
              <details>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-foreground">{charge.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Current cost {formatCurrency(Number(charge.amount))}
                      {charge.currentEffectiveFrom ? ` from ${charge.currentEffectiveFrom}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <TrendPill>{charge.versions.length} dated updates</TrendPill>
                    <TrendPill tone="neutral">View history</TrendPill>
                  </div>
                </summary>

                <div className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                  <div>
                    <p className="text-sm font-medium text-foreground">Charge update history</p>
                    <div className="mt-4 space-y-3">
                      {charge.versions.map((version) => (
                        <div
                          key={version.id}
                          className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/80 px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">{version.effectiveFrom}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{version.notes ?? "No note"}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-foreground">{formatCurrency(Number(version.amount))}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {version.status === "current"
                                ? "Current cost"
                                : version.status === "scheduled"
                                  ? "Scheduled cost"
                                  : "Historical cost"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {canManageCharges ? (
                    <div>
                      <p className="text-sm font-medium text-foreground">Add dated charge update</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Schedule a live charge amount change from today or a future effective date.
                      </p>
                      <form
                        action={updateChargeDefinitionAction}
                        className="mt-4 grid gap-3 rounded-lg border border-border/70 bg-background p-4"
                      >
                        <input type="hidden" name="chargeDefinitionId" value={charge.id} />
                        <input type="hidden" name="kind" value={charge.kind} />
                        <input type="hidden" name="chargeValueType" value={charge.chargeValueType} />
                        <label className="space-y-1 text-xs font-medium text-muted-foreground">
                          Effective date
                          <input
                            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                            name="effectiveFrom"
                            required
                            type="date"
                          />
                        </label>
                        <label className="space-y-1 text-xs font-medium text-muted-foreground">
                          New amount
                          <input
                            className="h-9 w-full rounded-md border border-input bg-background px-3 text-right text-sm text-foreground"
                            min="0"
                            name="amount"
                            placeholder="0.00"
                            required
                            step="0.01"
                            type="number"
                          />
                        </label>
                        <label className="space-y-1 text-xs font-medium text-muted-foreground">
                          Notes
                          <input
                            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                            name="notes"
                            placeholder="Reason or board reference"
                            type="text"
                          />
                        </label>
                        <Button size="sm" type="submit" variant="outline">
                          Save live update
                        </Button>
                      </form>
                    </div>
                  ) : null}
                </div>
              </details>
            </DashboardSurfaceCard>
          ))}
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
