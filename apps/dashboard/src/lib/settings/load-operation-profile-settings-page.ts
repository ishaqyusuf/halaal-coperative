import {
  createDbRuntime,
  getTenantOperationProfile,
  type TenantOperationProfileReadModel,
} from "@halaalvest/db"
import { getDashboardServerContext } from "@/lib/server-context"
import { hasAnyRole, workspaceAdminRoles } from "@/lib/workspace-access"

type OperationProfileSettingsUnavailableState = {
  body: string
  description: string
  status: "unavailable"
  title: string
}

type OperationProfileSettingsReadyState = {
  profile: TenantOperationProfileReadModel
  status: "ready"
}

export type OperationProfileSettingsPageState =
  | OperationProfileSettingsReadyState
  | OperationProfileSettingsUnavailableState

export async function loadOperationProfileSettingsPage(): Promise<OperationProfileSettingsPageState> {
  const context = await getDashboardServerContext()

  if (!context.tenant) {
    return {
      body: "Open a cooperative workspace before editing service access.",
      description:
        "Service activation and member access settings are available from a cooperative workspace.",
      status: "unavailable",
      title: "Choose a cooperative workspace first.",
    }
  }

  if (
    !hasAnyRole(context.auth.membership?.role, workspaceAdminRoles)
  ) {
    return {
      body: "Ask a cooperative admin to review service access settings.",
      description:
        "Only cooperative admins and super admins can change service activation.",
      status: "unavailable",
      title: "Operation profile access is limited.",
    }
  }

  if (createDbRuntime().status !== "database-configured") {
    return {
      body: "Connect the database runtime before reviewing cooperative service access.",
      description:
        "Operation profile settings require the database-backed cooperative workspace.",
      status: "unavailable",
      title: "Operation profile needs the database runtime.",
    }
  }

  return {
    profile: await getTenantOperationProfile(context.tenant.id),
    status: "ready",
  }
}
