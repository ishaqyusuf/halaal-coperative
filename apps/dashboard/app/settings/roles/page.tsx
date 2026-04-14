import { cooperativeRoles, getRoleDisplayName, getRoleScopeSummary } from "@halaal-vest/auth"
import { createDbRuntime, listTenantUsersWithMemberships } from "@halaal-vest/db"
import { RoleAssignmentForm } from "@/features/forms/settings-forms"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/features/workspace/page-shell"
import { getDashboardServerContext } from "@/lib/server-context"
import { hasAnyRole, workspaceAdminRoles } from "@/lib/workspace-access"

export default async function RolesPage() {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const canManageRoles = hasAnyRole(context.auth.membership?.role, workspaceAdminRoles)

  if (!context.tenant || runtime.status !== "database-configured") {
    return (
      <WorkspacePageShell
        eyebrow="Settings"
        title="Workspace roles"
        description="A simplified role-based system modeled after the reference projects: no separate permission matrix yet, just clear cooperative roles."
      >
        <WorkspaceEmptyState
          title="Role management needs the database runtime."
          body="Once the database-backed environment is active, this route will show tenant users and let admins assign cooperative roles."
        />
      </WorkspacePageShell>
    )
  }

  const users = await listTenantUsersWithMemberships(context.tenant.id)

  return (
    <WorkspacePageShell
      eyebrow="Settings"
      title="Workspace roles"
      description="A simplified role-based system modeled after the reference projects: no separate permission matrix yet, just clear cooperative roles."
    >
      {canManageRoles ? (
        <RoleAssignmentForm
          devMode={process.env.NODE_ENV !== "production"}
          roles={cooperativeRoles.map((role) => ({
            label: getRoleDisplayName(role),
            value: role,
          }))}
        />
      ) : null}

      <div className="rounded-[1.75rem] border border-border/70 bg-background/92 shadow-sm">
        <div className="border-b border-border/60 px-4 py-3">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Tenant users and active roles</h3>
        </div>
        <div className="divide-y divide-border/60">
          {users.map((user) => (
            <article key={user.id} className="space-y-3 px-4 py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">{user.fullName}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <div className="text-sm text-muted-foreground">
                  {user.memberships.find((membership) => membership.isDefault)?.role
                    ? `Default: ${getRoleDisplayName(user.memberships.find((membership) => membership.isDefault)?.role)}`
                    : "No default role"}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {user.memberships.map((membership) => (
                  <span
                    key={membership.id}
                    className="rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground"
                  >
                    {getRoleDisplayName(membership.role)}
                    {membership.isDefault ? " · default" : ""}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cooperativeRoles.map((role) => (
          <article key={role} className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{role}</p>
            <h3 className="mt-3 text-lg font-semibold tracking-tight text-foreground">
              {getRoleDisplayName(role)}
            </h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{getRoleScopeSummary(role)}</p>
          </article>
        ))}
      </div>
    </WorkspacePageShell>
  )
}
