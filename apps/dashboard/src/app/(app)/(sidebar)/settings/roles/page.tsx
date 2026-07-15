import {
  cooperativePermissionModules,
  cooperativeRolePermissions,
  cooperativeRoles,
  getPermissionModuleLabel,
  getRoleDisplayName,
} from "@halaalvest/auth/roles"
import { createDbRuntime, listTenantUsersWithMemberships } from "@halaalvest/db"
import {
  RoleSettingsUnavailableView,
  RoleSettingsView,
} from "@/components/role-settings-view"
import { loadRoleSettingsParams } from "@/hooks/use-role-settings-params"
import { canShowQuickFill, getDashboardServerContext } from "@/lib/server-context"
import { hasAnyRole, workspaceAdminRoles } from "@/lib/workspace-access"

export default async function RolesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  loadRoleSettingsParams(await searchParams)
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const canManageRoles = hasAnyRole(
    context.auth.membership?.role,
    workspaceAdminRoles
  )
  const permissionsByModule = cooperativePermissionModules.map((module) => ({
    label: getPermissionModuleLabel(module),
    module,
    permissions: cooperativeRolePermissions.filter(
      (permission) => permission.module === module
    ),
  }))

  if (!context.tenant || runtime.status !== "database-configured") {
    return <RoleSettingsUnavailableView />
  }

  const users = await listTenantUsersWithMemberships(context.tenant.id)
  const roleOptions = cooperativeRoles.map((role) => ({
    label: getRoleDisplayName(role),
    value: role,
  }))

  return (
    <RoleSettingsView
      canManageRoles={canManageRoles}
      devMode={canShowQuickFill(context)}
      permissionGroups={permissionsByModule}
      roleOptions={roleOptions}
      users={users}
    />
  )
}
