import { DashboardSectionCard, DashboardSectionHeader, DashboardStatCard, WorkspacePageShell } from "@/components/dashboard"
import { CooperativeProfileForm } from "@/components/forms/settings-forms"
import { getDashboardPageData, getDashboardServerContext } from "@/lib/server-context"
import { hasAnyRole, workspaceConfigurationRoles } from "@/lib/workspace-access"

export default async function CooperativeProfilePage() {
  const { tenant } = await getDashboardPageData()
  const context = await getDashboardServerContext()
  const canManageProfile = hasAnyRole(context.auth.membership?.role, workspaceConfigurationRoles)

  return (
    <WorkspacePageShell eyebrow="Settings" title="Cooperative profile" description="Core cooperative identity and onboarding profile details persisted during workspace setup.">
      <section className="grid gap-4 md:grid-cols-3">
        <DashboardStatCard label="Cooperative name" value={tenant.name} detail="Current persisted tenant display name." />
        <DashboardStatCard label="Current size" value={tenant.currentSize?.toString() ?? "Not captured"} detail="Current recorded cooperative size." />
        <DashboardStatCard label="Member prefix" value={tenant.memberNumberPrefix ?? "Not set"} detail="Optional prefix prepended to member numbers." />
      </section>

      {canManageProfile ? (
        <DashboardSectionCard>
          <DashboardSectionHeader eyebrow="Edit" title="Update profile" description="Manage the cooperative’s identity, office location, and onboarding profile from one settings form." />
          <div className="mt-5">
            <CooperativeProfileForm
              defaultValues={{ currentSize: tenant.currentSize?.toString() ?? "", memberNumberPrefix: tenant.memberNumberPrefix ?? "", name: tenant.name, officeAddress: tenant.officeAddress ?? "", region: tenant.region ?? "", startDate: tenant.startDate ?? "", timezone: tenant.timezone }}
              devMode={process.env.NODE_ENV !== "production"}
            />
          </div>
        </DashboardSectionCard>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        {([
          ["Cooperative name", tenant.name],
          ["Current size", tenant.currentSize?.toString() ?? "Not captured yet"],
          ["Member prefix", tenant.memberNumberPrefix ?? "Not captured yet"],
          ["Office address", tenant.officeAddress ?? "Not captured yet"],
          ["Start date", tenant.startDate ?? "Not captured yet"],
          ["Region", tenant.region ?? "Not captured yet"],
          ["Timezone", tenant.timezone],
        ] as Array<[string, string]>).map(([label, value]) => (
          <DashboardSectionCard key={label}>
            <DashboardSectionHeader eyebrow="Profile field" title={label} />
            <p className="mt-5 text-base leading-7 text-foreground">{value}</p>
          </DashboardSectionCard>
        ))}
      </section>
    </WorkspacePageShell>
  )
}
