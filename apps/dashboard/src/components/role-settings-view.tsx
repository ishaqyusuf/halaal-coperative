import type { ComponentProps } from "react"
import {
  cooperativeRoles,
  getRoleDisplayName,
  getRoleScopeSummary,
} from "@halaalvest/auth/roles"
import type { MembershipRole } from "@halaalvest/db"
import {
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardStatCard,
  DashboardSurfaceCard,
  TrendPill,
  WorkspaceEmptyState,
  WorkspacePageShell,
} from "@/components/dashboard"
import { OpenRoleSettingsSheet } from "@/components/open-role-settings-sheet"
import { RoleSettingsSheet } from "@/components/sheets/role-settings-sheet"

type RoleSettingsSheetRoles = ComponentProps<typeof RoleSettingsSheet>["roles"]

export type RoleSettingsUser = {
  email: string
  fullName: string
  id: string
  memberships: Array<{
    id: string
    isDefault: boolean
    role: MembershipRole
  }>
}

export type RolePermissionGroup = {
  label: string
  module: string
  permissions: Array<{
    action: string
    allowedRoles: readonly MembershipRole[]
    summary: string
  }>
}

export function RoleSettingsUnavailableView() {
  return (
    <WorkspacePageShell
      description="Staff provisioning, role assignment, and module permission guidance for cooperative operators."
      eyebrow="Settings"
      title="Workspace roles"
    >
      <WorkspaceEmptyState
        body="Once the database-backed environment is active, this route will show workspace users and let admins assign cooperative roles."
        title="Role management needs the database runtime."
      />
    </WorkspacePageShell>
  )
}

export function RoleSettingsView({
  canManageRoles,
  devMode,
  permissionGroups,
  roleOptions,
  users,
}: {
  canManageRoles: boolean
  devMode: boolean
  permissionGroups: RolePermissionGroup[]
  roleOptions: RoleSettingsSheetRoles
  users: RoleSettingsUser[]
}) {
  const defaultRoleCount = users.filter((user) =>
    user.memberships.some((membership) => membership.isDefault)
  ).length
  const permissionCount = permissionGroups.reduce(
    (sum, group) => sum + group.permissions.length,
    0
  )

  return (
    <WorkspacePageShell
      description="Staff provisioning, default-role visibility, and module permission guidance for cooperative operators."
      eyebrow="Settings"
      title="Workspace roles"
    >
      <section className="grid gap-4 md:grid-cols-3">
        <DashboardStatCard
          detail="Users currently loaded for this cooperative workspace."
          label="Workspace users"
          value={users.length.toString()}
        />
        <DashboardStatCard
          detail="Users with a default membership role set."
          label="Default roles"
          value={defaultRoleCount.toString()}
        />
        <DashboardStatCard
          detail={`${cooperativeRoles.length} roles across ${permissionGroups.length} modules.`}
          label="Governed actions"
          value={permissionCount.toString()}
        />
      </section>

      {canManageRoles ? (
        <DashboardSectionCard>
          <DashboardSectionHeader
            actions={<OpenRoleSettingsSheet />}
            description="Create or update staff/member login records and attach cooperative roles from a focused sheet."
            eyebrow="Assignment"
            title="Assign workspace roles"
          />
          <p className="mt-5 text-sm leading-6 text-muted-foreground">
            Role assignment opens in a sheet so the page stays focused on
            current users and permission visibility.
          </p>
        </DashboardSectionCard>
      ) : null}

      <DashboardSectionCard>
        <DashboardSectionHeader
          actions={<TrendPill>{users.length} users</TrendPill>}
          eyebrow="Users"
          title="Workspace users and active roles"
        />
        <div className="mt-5 space-y-3">
          {users.map((user) => {
            const defaultMembership = user.memberships.find(
              (membership) => membership.isDefault
            )

            return (
              <DashboardSurfaceCard key={user.id}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-foreground">
                      {user.fullName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {defaultMembership
                      ? `Default: ${getRoleDisplayName(defaultMembership.role)}`
                      : "No default role"}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {user.memberships.map((membership) => (
                    <TrendPill key={membership.id}>
                      {getRoleDisplayName(membership.role)}
                      {membership.isDefault ? " · default" : ""}
                    </TrendPill>
                  ))}
                </div>
              </DashboardSurfaceCard>
            )
          })}
        </div>
      </DashboardSectionCard>

      <DashboardSectionCard>
        <DashboardSectionHeader
          actions={<TrendPill>{permissionCount} actions</TrendPill>}
          eyebrow="Permissions"
          title="Module action matrix"
        />
        <div className="mt-5 space-y-4">
          {permissionGroups.map((group) => (
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
                  <div
                    className="grid gap-3 py-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.2fr)]"
                    key={permission.action}
                  >
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
            <DashboardSectionHeader
              eyebrow={role}
              title={getRoleDisplayName(role)}
            />
            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              {getRoleScopeSummary(role)}
            </p>
          </DashboardSectionCard>
        ))}
      </section>

      {canManageRoles ? (
        <RoleSettingsSheet devMode={devMode} roles={roleOptions} />
      ) : null}
    </WorkspacePageShell>
  )
}
