import { getTenantOperationProfile } from "@halaalvest/db"
import {
  OperationProfileSettingsUnavailableView,
  OperationProfileSettingsView,
} from "@/components/operation-profile-settings-view"
import { loadOperationProfileSettingsParams } from "@/hooks/use-operation-profile-settings-params"
import { getDashboardServerContext } from "@/lib/server-context"
import { hasAnyRole, workspaceAdminRoles } from "@/lib/workspace-access"

export default async function OperationProfileSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  loadOperationProfileSettingsParams(await searchParams)
  const context = await getDashboardServerContext()

  if (!context.tenant) {
    return (
      <OperationProfileSettingsUnavailableView
        description="Service activation and member access settings are available from a cooperative workspace."
        body="Open a cooperative workspace before editing service access."
        title="Choose a cooperative workspace first."
      />
    )
  }

  const canManageOperationProfile = hasAnyRole(
    context.auth.membership?.role,
    workspaceAdminRoles
  )
  const operationProfile = await getTenantOperationProfile(context.tenant.id)

  if (!canManageOperationProfile) {
    return (
      <OperationProfileSettingsUnavailableView
        description="Only cooperative admins and super admins can change service activation."
        body="Ask a cooperative admin to review service access settings."
        title="Operation profile access is limited."
      />
    )
  }

  return (
    <OperationProfileSettingsView
      policy={operationProfile.policy}
      reviewedAt={operationProfile.reviewedAt}
      services={operationProfile.services}
    />
  )
}
