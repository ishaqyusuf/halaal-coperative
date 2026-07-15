import {
  defaultCooperativeCountry,
  formatCooperativeSizeRangeLabel,
  resolveCooperativeSizeRange,
} from "@halaalvest/domain"
import { ProfileSettingsView } from "@/components/profile-settings-view"
import { loadProfileSettingsParams } from "@/hooks/use-profile-settings-params"
import {
  canShowQuickFill,
  getDashboardPageData,
  getDashboardServerContext,
} from "@/lib/server-context"
import { hasAnyRole, workspaceConfigurationRoles } from "@/lib/workspace-access"

export default async function CooperativeProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  loadProfileSettingsParams(await searchParams)
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
  const formDefaultValues = {
    city: tenant.city ?? "",
    country: tenant.country ?? defaultCooperativeCountry,
    currentSize: currentSizeRange ? String(currentSizeRange.value) : "",
    memberNumberPrefix: tenant.memberNumberPrefix ?? "",
    name: tenant.name,
    officeAddress: tenant.officeAddress ?? "",
    state: stateValue ?? "",
    startDate: tenant.startDate ?? "",
    timezone: tenant.timezone,
  }
  const profileFields: Array<[string, string]> = [
    ["Cooperative name", tenant.name],
    ["Current size", currentSizeDetailLabel],
    ["Member prefix", tenant.memberNumberPrefix ?? "Not captured yet"],
    ["Office address", tenant.officeAddress ?? "Not captured yet"],
    ["City", tenant.city ?? "Not captured yet"],
    ["State", stateValue ?? "Not captured yet"],
    ["Country", countryValue ?? "Not captured yet"],
    ["Start date", tenant.startDate ?? "Not captured yet"],
    ["Timezone", tenant.timezone],
  ]

  return (
    <ProfileSettingsView
      canManageProfile={canManageProfile}
      currentSizeLabel={currentSizeLabel}
      devMode={canShowQuickFill(context)}
      formDefaultValues={formDefaultValues}
      locationSummary={locationSummary}
      memberPrefixLabel={tenant.memberNumberPrefix ?? "Not set"}
      profileFields={profileFields}
      tenantName={tenant.name}
    />
  )
}
