import {
  cooperativePermissionModules,
  cooperativeRolePermissions,
  cooperativeRoles,
  getPermissionModuleLabel,
  getRoleDisplayName,
  getRoleScopeSummary,
} from "@halaalvest/auth/roles"
import { createDbRuntime, listTenantUsersWithMemberships } from "@halaalvest/db"
import { DashboardSectionCard, DashboardSectionHeader, DashboardStatCard, DashboardSurfaceCard, TrendPill, WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import { RoleAssignmentForm } from "@/components/forms/settings-forms"
import { canShowQuickFill, getDashboardServerContext } from "@/lib/server-context"
import { hasAnyRole, workspaceAdminRoles } from "@/lib/workspace-access"

export default async function RolesPage() {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const canManageRoles = hasAnyRole(context.auth.membership?.role, workspaceAdminRoles)
  const permissionsByModule = cooperativePermissionModules.map((module) => ({
    label: getPermissionModuleLabel(module),
    module,
    permissions: cooperativeRolePermissions.filter(
      (permission) => permission.module === module
    ),
  }))

  if (!context.tenant || runtime.status !== "database-configured") {
    return <WorkspacePageShell eyebrow="Settings" title="Workspace roles" description="Staff provisioning, role assignment, and module permission guidance for cooperative operators."><WorkspaceEmptyState title="Role management needs the database runtime." body="Once the database-backed environment is active, this route will show workspace users and let admins assign cooperative roles." /></WorkspacePageShell>
  }

  const users = await listTenantUsersWithMemberships(context.tenant.id)

  return (
    <WorkspacePageShell eyebrow="Settings" title="Workspace roles" description="Staff provisioning, default-role visibility, and module permission guidance for cooperative operators.">
      <section className="grid gap-4 md:grid-cols-3">
        <DashboardStatCard label="Workspace users" value={users.length.toString()} detail="Users currently loaded for this cooperative workspace." />
        <DashboardStatCard label="Default roles" value={users.filter((user) => user.memberships.some((membership) => membership.isDefault)).length.toString()} detail="Users with a default membership role set." />
        <DashboardStatCard label="Governed actions" value={cooperativeRolePermissions.length.toString()} detail={`${cooperativeRoles.length} roles across ${cooperativePermissionModules.length} modules.`} />
      </section>

      {canManageRoles ? (
        <DashboardSectionCard>
          <DashboardSectionHeader eyebrow="Assignment" title="Assign workspace roles" description="Create or update staff/member login records and attach cooperative roles." />
          <div className="mt-5">
            <RoleAssignmentForm devMode={canShowQuickFill(context)} roles={cooperativeRoles.map((role) => ({ label: getRoleDisplayName(role), value: role }))} />
          </div>
        </DashboardSectionCard>
      ) : null}

      <DashboardSectionCard>
        <DashboardSectionHeader eyebrow="Users" title="Workspace users and active roles" actions={<TrendPill>{users.length} users</TrendPill>} />
        <div className="mt-5 space-y-3">
          {users.map((user) => (
            <DashboardSurfaceCard key={user.id}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">{user.fullName}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {user.memberships.find((membership) => membership.isDefault)?.role ? `Default: ${getRoleDisplayName(user.memberships.find((membership) => membership.isDefault)!.role)}` : "No default role"}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {user.memberships.map((membership) => (
                  <TrendPill key={membership.id}>{getRoleDisplayName(membership.role)}{membership.isDefault ? " · default" : ""}</TrendPill>
                ))}
              </div>
            </DashboardSurfaceCard>
          ))}
        </div>
      </DashboardSectionCard>

      <DashboardSectionCard>
        <DashboardSectionHeader eyebrow="Permissions" title="Module action matrix" actions={<TrendPill>{cooperativeRolePermissions.length} actions</TrendPill>} />
        <div className="mt-5 space-y-4">
          {permissionsByModule.map((group) => (
            <DashboardSurfaceCard key={group.module}>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">{group.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {group.permissions.length} governed actions
                  </p>
                </div>
              </div>
              <div className="mt-4 divide-y divide-border/70">
                {group.permissions.map((permission) => (
                  <div key={permission.action} className="grid gap-3 py-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.2fr)]">
                    <div>
                      <p className="font-medium text-foreground">
                        {permission.action.replace(/_/g, " ")}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {permission.summary}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {permission.allowedRoles.map((role) => (
                        <TrendPill key={role}>
                          {getRoleDisplayName(role)}
                        </TrendPill>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </DashboardSurfaceCard>
          ))}
        </div>
      </DashboardSectionCard>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cooperativeRoles.map((role) => (
          <DashboardSectionCard key={role}>
            <DashboardSectionHeader eyebrow={role} title={getRoleDisplayName(role)} />
            <p className="mt-5 text-sm leading-6 text-muted-foreground">{getRoleScopeSummary(role)}</p>
          </DashboardSectionCard>
        ))}
      </section>
    </WorkspacePageShell>
  )
}
