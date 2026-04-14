import { WorkspacePageShell } from "@/features/workspace/page-shell"
import { CooperativeProfileForm } from "@/features/forms/settings-forms"
import { getDashboardPageData, getDashboardServerContext } from "@/lib/server-context"
import { hasAnyRole, workspaceConfigurationRoles } from "@/lib/workspace-access"

export default async function CooperativeProfilePage() {
  const { tenant } = await getDashboardPageData()
  const context = await getDashboardServerContext()
  const canManageProfile = hasAnyRole(context.auth.membership?.role, workspaceConfigurationRoles)

  return (
    <WorkspacePageShell
      eyebrow="Settings"
      title="Cooperative profile"
      description="Core cooperative identity and onboarding profile details persisted during workspace setup."
    >
      {canManageProfile ? (
        <CooperativeProfileForm
          defaultValues={{
            currentSize: tenant.currentSize?.toString() ?? "",
            name: tenant.name,
            officeAddress: tenant.officeAddress ?? "",
            region: tenant.region ?? "",
            startDate: tenant.startDate ?? "",
            timezone: tenant.timezone,
          }}
          devMode={process.env.NODE_ENV !== "production"}
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {[
          ["Cooperative name", tenant.name],
          ["Current size", tenant.currentSize?.toString() ?? "Not captured yet"],
          ["Office address", tenant.officeAddress ?? "Not captured yet"],
          ["Start date", tenant.startDate ?? "Not captured yet"],
          ["Region", tenant.region ?? "Not captured yet"],
          ["Timezone", tenant.timezone],
        ].map(([label, value]) => (
          <article key={label} className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
            <p className="mt-3 text-base leading-7 text-foreground">{value}</p>
          </article>
        ))}
      </div>
    </WorkspacePageShell>
  )
}
