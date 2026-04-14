import { createDbRuntime, listChargeApplications, listChargeDefinitions } from "@halaal-vest/db"
import { listMembers } from "@halaal-vest/db"
import { Button } from "@halaal-vest/ui/components/button"
import { formatCurrency } from "@halaal-vest/utils"
import { ChargeApplicationForm, ChargeDefinitionForm } from "@/features/forms/finance-forms"
import {
  reverseChargeApplicationAction,
  updateChargeDefinitionAction,
  waiveChargeApplicationAction,
} from "@/lib/dashboard-actions"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/features/workspace/page-shell"
import { getDashboardServerContext } from "@/lib/server-context"
import { financeManagementRoles, hasAnyRole } from "@/lib/workspace-access"

export default async function ChargesPage() {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const canManageCharges = hasAnyRole(context.auth.membership?.role, financeManagementRoles)

  if (!context.tenant || runtime.status !== "database-configured") {
    return (
      <WorkspacePageShell
        eyebrow="Charges"
        title="Charge definitions"
        description="Standard cooperative levies and charge rules for onboarding, contributions, and lending."
      >
        <WorkspaceEmptyState
          title="Charge definitions need the database runtime."
          body="This route is wired into the new dashboard shell and will show tenant charge definitions once the database-backed environment is active."
        />
      </WorkspacePageShell>
    )
  }

  const [charges, members, chargeApplications] = await Promise.all([
    listChargeDefinitions(context.tenant.id),
    listMembers(context.tenant.id, { page: 1, pageSize: 100 }),
    listChargeApplications(context.tenant.id, { limit: 20 }),
  ])

  return (
    <WorkspacePageShell
      eyebrow="Charges"
      title="Charge definitions"
      description="Configured tenant charges, levies, and where they apply inside cooperative operations."
    >
      {canManageCharges ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <ChargeDefinitionForm devMode={process.env.NODE_ENV !== "production"} />

          <ChargeApplicationForm
            chargeDefinitions={charges.filter((charge) => charge.isActive).map((charge) => ({
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
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {charges.map((charge) => (
          <article
            key={charge.id}
            className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm"
          >
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{charge.code}</p>
            <h3 className="mt-3 text-xl font-semibold tracking-tight text-foreground">{charge.name}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{formatCurrency(Number(charge.amount))}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-muted px-2 py-1 capitalize">{charge.kind.replace(/_/g, " ")}</span>
              <span className="rounded-full bg-muted px-2 py-1">{charge.isActive ? "Active" : "Inactive"}</span>
              {charge.isMonthlyLevy ? <span className="rounded-full bg-muted px-2 py-1">Monthly levy</span> : null}
            </div>
            {canManageCharges ? (
              <form action={updateChargeDefinitionAction} className="mt-4">
                <input type="hidden" name="chargeDefinitionId" value={charge.id} />
                <Button
                  size="xs"
                  type="submit"
                  name="isActive"
                  value={charge.isActive ? "false" : "true"}
                  variant="outline"
                >
                  {charge.isActive ? "Deactivate" : "Activate"}
                </Button>
              </form>
            ) : null}
          </article>
        ))}
      </div>

      <div className="rounded-[1.75rem] border border-border/70 bg-background/92 shadow-sm">
        <div className="border-b border-border/60 px-4 py-3">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Recent charge applications</h3>
        </div>
        <div className="divide-y divide-border/60">
          {chargeApplications.map((application) => (
            <article key={application.id} className="px-4 py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">{application.member.fullName}</p>
                  <p className="text-sm text-muted-foreground">
                    {application.chargeDefinition.name} · {formatCurrency(Number(application.amount))}
                  </p>
                </div>
                <p className="text-sm capitalize text-muted-foreground">{application.status}</p>
              </div>
              {canManageCharges && application.status === "posted" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <form action={waiveChargeApplicationAction}>
                    <input type="hidden" name="chargeApplicationId" value={application.id} />
                    <Button size="xs" type="submit" variant="outline">Waive</Button>
                  </form>
                  <form action={reverseChargeApplicationAction}>
                    <input type="hidden" name="chargeApplicationId" value={application.id} />
                    <Button size="xs" type="submit" variant="outline">Reverse</Button>
                  </form>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </WorkspacePageShell>
  )
}
