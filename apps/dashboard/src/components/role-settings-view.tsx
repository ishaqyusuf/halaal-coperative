import type { ComponentProps } from "react"
import {
  cooperativeRoles,
  getRoleDisplayName,
  getRoleScopeSummary,
} from "@halaalvest/auth/roles"
import type { MembershipRole } from "@halaalvest/db"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@halaalvest/ui/components/tabs"
import { ChevronDownIcon } from "lucide-react"
import {
  DashboardStatCard,
  TrendPill,
  WorkspaceEmptyState,
  WorkspacePageShell,
} from "@/components/dashboard"
import { OpenRoleSettingsSheet } from "@/components/open-role-settings-sheet"
import {
  RoleSettingsUserList,
  type RoleSettingsUser,
} from "@/components/role-settings-user-list"
import { RoleSettingsSheet } from "@/components/sheets/role-settings-sheet"

type RoleSettingsSheetRoles = ComponentProps<typeof RoleSettingsSheet>["roles"]

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
      actions={canManageRoles ? <OpenRoleSettingsSheet /> : undefined}
      description="Staff provisioning, default-role visibility, and module permission guidance for cooperative operators."
      eyebrow="Settings"
      title="Workspace roles"
    >
      <section className="hidden gap-4 md:grid md:grid-cols-3">
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

      <Tabs className="gap-5" defaultValue="users">
        <TabsList
          aria-label="Workspace role settings"
          className="h-auto w-full justify-start gap-5 border-b border-border/70 p-0 pb-3"
          variant="line"
        >
          <TabsTrigger className="h-9 flex-none px-0 text-sm" value="users">
            Workspace users
            <span className="text-muted-foreground">{users.length}</span>
          </TabsTrigger>
          <TabsTrigger
            className="h-9 flex-none px-0 text-sm"
            value="permissions"
          >
            Permissions
            <span className="text-muted-foreground">{permissionCount}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent className="text-sm" value="users">
          <RoleSettingsUserList users={users} />
        </TabsContent>

        <TabsContent className="text-sm" value="permissions">
          <section aria-labelledby="permission-matrix-title">
            <div className="pb-4">
              <h3
                className="text-base font-semibold text-foreground"
                id="permission-matrix-title"
              >
                Module action matrix
              </h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Expand a module to see the roles allowed to perform each
                governed action.
              </p>
            </div>

            <div className="border-y border-border/70">
              {permissionGroups.map((group) => (
                <details
                  className="group border-b border-border/70 last:border-b-0"
                  key={group.module}
                >
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 text-left [&::-webkit-details-marker]:hidden">
                    <span>
                      <span className="block font-medium text-foreground">
                        {group.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {group.permissions.length} governed actions
                      </span>
                    </span>
                    <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="divide-y divide-border/70 border-t border-border/70 pb-1">
                    {group.permissions.map((permission) => (
                      <div
                        className="grid gap-3 py-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.2fr)]"
                        key={permission.action}
                      >
                        <div>
                          <p className="font-medium text-foreground capitalize">
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
                </details>
              ))}
            </div>

            <div className="mt-8">
              <h3 className="text-base font-semibold text-foreground">
                Role scope guide
              </h3>
              <div className="mt-3 border-y border-border/70">
                {cooperativeRoles.map((role) => (
                  <div
                    className="border-b border-border/70 py-4 last:border-b-0 sm:grid sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:gap-6"
                    key={role}
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {getRoleDisplayName(role)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {role}
                      </p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground sm:mt-0">
                      {getRoleScopeSummary(role)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </TabsContent>
      </Tabs>

      {canManageRoles ? (
        <RoleSettingsSheet devMode={devMode} roles={roleOptions} />
      ) : null}
    </WorkspacePageShell>
  )
}
