import type { Metadata } from "next"
import {
  createDbRuntime,
  listRemovedTenantPeople,
  listTenantStaffPeople,
} from "@halaalvest/db"
import {
  RoleSettingsUnavailableView,
  RoleSettingsView,
} from "@/components/role-settings-view"
import { loadRoleSettingsParams } from "@/hooks/use-role-settings-params"
import { getGivableRoles } from "@/lib/settings/role-words"
import {
  canShowQuickFill,
  getDashboardServerContext,
} from "@/lib/server-context"
import { hasAnyRole, workspaceAdminRoles } from "@/lib/workspace-access"

export const metadata: Metadata = {
  title: "Roles | Halaalvest",
}

export default async function RolesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  loadRoleSettingsParams(await searchParams)
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const actorRole = context.auth.membership?.role ?? null
  const canManageRoles = hasAnyRole(actorRole, workspaceAdminRoles)

  if (
    !context.tenant ||
    !canManageRoles ||
    runtime.status !== "database-configured"
  ) {
    return <RoleSettingsUnavailableView />
  }

  // Staff only: member logins can run into the thousands.
  const [people, removed] = await Promise.all([
    listTenantStaffPeople(context.tenant.id),
    listRemovedTenantPeople(context.tenant.id),
  ])

  return (
    <RoleSettingsView
      actorRole={actorRole}
      canManageRoles={canManageRoles}
      currentUserId={context.auth.user?.id ?? null}
      devMode={canShowQuickFill(context)}
      givableRoles={getGivableRoles(actorRole)}
      people={people}
      removed={removed}
    />
  )
}
