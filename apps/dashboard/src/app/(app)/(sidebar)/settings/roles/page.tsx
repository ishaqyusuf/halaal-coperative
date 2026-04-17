import { cooperativeRoles, getRoleDisplayName, getRoleScopeSummary } from "@halaal-vest/auth"
import { createDbRuntime, listTenantUsersWithMemberships } from "@halaal-vest/db"
import { DashboardSectionCard, DashboardSectionHeader, DashboardStatCard, DashboardSurfaceCard, TrendPill, WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import { RoleAssignmentForm } from "@/components/forms/settings-forms"
import { getDashboardServerContext } from "@/lib/server-context"
import { hasAnyRole, workspaceAdminRoles } from "@/lib/workspace-access"

export default async function RolesPage() {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const canManageRoles = hasAnyRole(context.auth.membership?.role, workspaceAdminRoles)

  if (!context.tenant || runtime.status !== "database-configured") {
    return <WorkspacePageShell eyebrow="Settings" title="Workspace roles" description="A simplified role-based system modeled after the reference projects: no separate permission matrix yet, just clear cooperative roles."><WorkspaceEmptyState title="Role management needs the database runtime." body="Once the database-backed environment is active, this route will show tenant users and let admins assign cooperative roles." /></WorkspacePageShell>
  }

  const users = await listTenantUsersWithMemberships(context.tenant.id)

  return (
    <WorkspacePageShell eyebrow="Settings" title="Workspace roles" description="A simplified role-based system: role assignment, default-role visibility, and scope guidance for tenant operators.">
      <section className="grid gap-4 md:grid-cols-3">
        <DashboardStatCard label="Tenant users" value={users.length.toString()} detail="Users currently loaded for this tenant workspace." />
        <DashboardStatCard label="Default roles" value={users.filter((user) => user.memberships.some((membership) => membership.isDefault)).length.toString()} detail="Users with a default membership role set." />
        <DashboardStatCard label="Available roles" value={cooperativeRoles.length.toString()} detail="Supported cooperative roles in the simplified model." />
      </section>

      {canManageRoles ? (
        <DashboardSectionCard>
          <DashboardSectionHeader eyebrow="Assignment" title="Assign workspace roles" description="Provision cooperative roles without introducing a separate permission matrix." />
          <div className="mt-5">
            <RoleAssignmentForm devMode={process.env.NODE_ENV !== "production"} roles={cooperativeRoles.map((role) => ({ label: getRoleDisplayName(role), value: role }))} />
          </div>
        </DashboardSectionCard>
      ) : null}

      <DashboardSectionCard>
        <DashboardSectionHeader eyebrow="Users" title="Tenant users and active roles" actions={<TrendPill>{users.length} users</TrendPill>} />
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
