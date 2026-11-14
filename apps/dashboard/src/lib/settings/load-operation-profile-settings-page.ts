import {
  createDbRuntime,
  getTenantOperationProfile,
  type TenantOperationProfileReadModel,
} from "@halaalvest/db"
import { getDashboardServerContext } from "@/lib/server-context"
import { hasAnyRole, workspaceAdminRoles } from "@/lib/workspace-access"

type OperationProfileSettingsUnavailableState = {
  body: string
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
      body: "Open your cooperative's dashboard to see its services.",
      status: "unavailable",
      title: "No cooperative open",
    }
  }

  if (!hasAnyRole(context.auth.membership?.role, workspaceAdminRoles)) {
    return {
      body: "Only cooperative admins can see this page.",
      status: "unavailable",
      title: "Not available",
    }
  }

  if (createDbRuntime().status !== "database-configured") {
    return {
      body: "Services can't be shown right now. Try again later.",
      status: "unavailable",
      title: "Services aren't available",
    }
  }

  return {
    profile: await getTenantOperationProfile(context.tenant.id),
    status: "ready",
  }
}
