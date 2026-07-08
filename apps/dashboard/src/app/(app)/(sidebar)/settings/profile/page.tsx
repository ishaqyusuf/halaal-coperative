import {
  defaultCooperativeCountry,
  formatCooperativeSizeRangeLabel,
  resolveCooperativeSizeRange,
} from "@halaalvest/domain"
import { DashboardSectionCard, DashboardSectionHeader, DashboardStatCard, WorkspacePageShell } from "@/components/dashboard"
import { CooperativeProfileForm } from "@/components/forms/settings-forms"
import {
  canShowQuickFill,
  getDashboardPageData,
  getDashboardServerContext,
} from "@/lib/server-context"
import { hasAnyRole, workspaceConfigurationRoles } from "@/lib/workspace-access"

export default async function CooperativeProfilePage() {
  const { tenant } = await getDashboardPageData()
  const context = await getDashboardServerContext()
  const canManageProfile = hasAnyRole(context.auth.membership?.role, workspaceConfigurationRoles)
  const currentSizeRange = resolveCooperativeSizeRange(tenant.currentSize)
  const currentSizeLabel = formatCooperativeSizeRangeLabel(
    tenant.currentSize,
    "Not captured",
  )
  const currentSizeDetailLabel = formatCooperativeSizeRangeLabel(
    tenant.currentSize,
    "Not captured yet",
  )
  const stateValue = tenant.state ?? tenant.region ?? null
  const countryValue = tenant.country ?? null
  const locationSummary =
    [tenant.city, stateValue, countryValue].filter(Boolean).join(", ") ||
    "Not captured"

  return (
    <WorkspacePageShell eyebrow="Settings" title="Cooperative profile" description="Core cooperative identity and onboarding profile details persisted during workspace setup.">
      <section className="grid gap-4 md:grid-cols-4">
        <DashboardStatCard label="Cooperative name" value={tenant.name} detail="Current persisted cooperative display name." />
        <DashboardStatCard label="Current size" value={currentSizeLabel} detail="Current recorded cooperative size range." />
        <DashboardStatCard label="Location" value={locationSummary} detail="City, state, and country on the cooperative profile." />
        <DashboardStatCard label="Member prefix" value={tenant.memberNumberPrefix ?? "Not set"} detail="Optional prefix prepended to member numbers." />
      </section>

      {canManageProfile ? (
        <DashboardSectionCard>
          <DashboardSectionHeader eyebrow="Edit" title="Update profile" description="Manage the cooperative’s identity, office location, and onboarding profile from one settings form." />
          <div className="mt-5">
            <CooperativeProfileForm
              defaultValues={{
                city: tenant.city ?? "",
                country: tenant.country ?? defaultCooperativeCountry,
                currentSize: currentSizeRange ? String(currentSizeRange.value) : "",
                memberNumberPrefix: tenant.memberNumberPrefix ?? "",
                name: tenant.name,
                officeAddress: tenant.officeAddress ?? "",
                state: stateValue ?? "",
                startDate: tenant.startDate ?? "",
                timezone: tenant.timezone,
              }}
              devMode={canShowQuickFill(context)}
            />
          </div>
        </DashboardSectionCard>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        {([
          ["Cooperative name", tenant.name],
          ["Current size", currentSizeDetailLabel],
          ["Member prefix", tenant.memberNumberPrefix ?? "Not captured yet"],
          ["Office address", tenant.officeAddress ?? "Not captured yet"],
          ["City", tenant.city ?? "Not captured yet"],
          ["State", stateValue ?? "Not captured yet"],
          ["Country", countryValue ?? "Not captured yet"],
          ["Start date", tenant.startDate ?? "Not captured yet"],
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
