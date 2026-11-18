import type {
  MembershipRole,
  RemovedTenantPerson,
  TenantStaffPerson,
} from "@halaalvest/db"
import { OpenRoleSettingsSheet } from "@/components/open-role-settings-sheet"
import { RoleSettingsSheet } from "@/components/sheets/role-settings-sheet"
import {
  RemovePersonButton,
  RestorePersonButton,
} from "@/components/workspace-settings/remove-person-button"
import { RemoveRoleButton } from "@/components/workspace-settings/remove-role-button"
import {
  SettingsEmpty,
  SettingsPage,
  SettingsSection,
} from "@/components/workspace-settings/settings-page"
import {
  explainedRoles,
  getRoleAbility,
  getRoleWord,
} from "@/lib/settings/role-words"

export function RoleSettingsUnavailableView() {
  return (
    <SettingsPage>
      <SettingsEmpty
        body="Roles can't be shown right now. Try again later."
        title="Roles aren't available"
      />
    </SettingsPage>
  )
}

/** Why a role has no Remove button, or null when it can be removed. */
function getKeepReason({
  actorRole,
  adminCount,
  currentUserId,
  person,
  role,
}: {
  actorRole: MembershipRole | null
  adminCount: number
  currentUserId: string | null
  person: TenantStaffPerson
  role: MembershipRole
}) {
  if (role === "member") return "Member login"
  if (role === "super_admin" && actorRole !== "super_admin") return null
  if (role === "tenant_admin" || role === "super_admin") {
    if (person.id === currentUserId) return "You"
    if (role === "tenant_admin" && adminCount <= 1) return "Only admin"
  }
  // A last role is never removed on its own: "Remove from cooperative".
  if (person.roles.length <= 1) return null
  return undefined
}

/** Whether the person can be removed from the cooperative by this admin. */
function canRemovePerson({
  actorRole,
  adminCount,
  currentUserId,
  person,
}: {
  actorRole: MembershipRole | null
  adminCount: number
  currentUserId: string | null
  person: TenantStaffPerson
}) {
  const roles = person.roles.map((entry) => entry.role)

  if (person.id === currentUserId) return false
  // Member logins are managed from the member's record.
  if (roles.includes("member")) return false
  if (roles.includes("super_admin") && actorRole !== "super_admin") return false
  if (roles.includes("tenant_admin") && adminCount <= 1) return false
  return true
}

function formatRemovedOn(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}

export function RoleSettingsView({
  actorRole,
  canManageRoles,
  currentUserId,
  devMode,
  givableRoles,
  people,
  removed = [],
}: {
  actorRole: MembershipRole | null
  canManageRoles: boolean
  currentUserId: string | null
  devMode: boolean
  givableRoles: MembershipRole[]
  people: TenantStaffPerson[]
  removed?: RemovedTenantPerson[]
}) {
  const adminCount = people.filter((person) =>
    person.roles.some((entry) => entry.role === "tenant_admin")
  ).length

  return (
    <SettingsPage
      action={canManageRoles ? <OpenRoleSettingsSheet /> : undefined}
      intro="Who can run the cooperative from this dashboard."
    >
      <SettingsSection title="Staff">
        {people.length === 0 ? (
          <SettingsEmpty
            body="Add a person to give them a staff role."
            title="No staff yet"
          />
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {people.map((person) => (
              <li
                className="grid gap-3 px-1 py-4 sm:px-3"
                data-role-person={person.fullName}
                key={person.id}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold text-foreground">
                      {person.fullName}
                      {person.id === currentUserId ? (
                        <span className="font-normal text-muted-foreground">
                          {" "}
                          (you)
                        </span>
                      ) : null}
                    </p>
                    <p className="text-base [overflow-wrap:anywhere] text-muted-foreground">
                      {person.email}
                    </p>
                  </div>
                  {canManageRoles &&
                  canRemovePerson({
                    actorRole,
                    adminCount,
                    currentUserId,
                    person,
                  }) ? (
                    <RemovePersonButton
                      name={person.fullName}
                      userId={person.id}
                    />
                  ) : null}
                </div>
                <ul className="grid gap-2">
                  {person.roles.map((entry) => {
                    const keepReason = getKeepReason({
                      actorRole,
                      adminCount,
                      currentUserId,
                      person,
                      role: entry.role,
                    })

                    return (
                      <li
                        className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1"
                        key={entry.id}
                      >
                        <span className="text-base text-foreground">
                          {getRoleWord(entry.role)}
                          {entry.isDefault && person.roles.length > 1 ? (
                            <span className="text-muted-foreground">
                              {" "}
                              · opens first
                            </span>
                          ) : null}
                        </span>
                        {!canManageRoles ||
                        keepReason === null ? null : keepReason ? (
                          <span className="text-base text-muted-foreground">
                            {keepReason}
                          </span>
                        ) : (
                          <RemoveRoleButton
                            membershipId={entry.id}
                            name={person.fullName}
                            otherRoles={person.roles
                              .filter((other) => other.id !== entry.id)
                              .map((other) => other.role)}
                            role={entry.role}
                          />
                        )}
                      </li>
                    )
                  })}
                </ul>
              </li>
            ))}
          </ul>
        )}
        <p className="text-base text-muted-foreground">
          Members aren&apos;t listed here. They sign in with their own login.
        </p>
      </SettingsSection>

      {canManageRoles && removed.length > 0 ? (
        <SettingsSection title="Removed from the cooperative">
          <ul className="divide-y divide-border border-y border-border">
            {removed.map((person) => (
              <li
                className="flex flex-col gap-3 px-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-3"
                data-removed-person={person.fullName}
                key={person.removalId}
              >
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-foreground">
                    {person.fullName}
                  </p>
                  <p className="text-base [overflow-wrap:anywhere] text-muted-foreground">
                    {person.email}
                  </p>
                  <p className="text-base text-muted-foreground">
                    Was{" "}
                    {person.roles
                      .map((role) => getRoleWord(role).toLowerCase())
                      .join(" and ")}
                    . Removed {formatRemovedOn(person.removedAt)}.
                  </p>
                </div>
                {person.roles.includes("super_admin") &&
                actorRole !== "super_admin" ? null : (
                  <RestorePersonButton
                    name={person.fullName}
                    removalId={person.removalId}
                  />
                )}
              </li>
            ))}
          </ul>
          <p className="text-base text-muted-foreground">
            They can&apos;t sign in to this cooperative. Their account and
            history are kept. Restore gives back the roles they had.
          </p>
        </SettingsSection>
      ) : null}

      <SettingsSection title="What each role can do">
        <dl className="divide-y divide-border border-y border-border">
          {explainedRoles.map((role) => (
            <div
              className="grid gap-1 px-1 py-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:gap-6 sm:px-3"
              key={role}
            >
              <dt className="text-lg font-semibold text-foreground">
                {getRoleWord(role)}
              </dt>
              <dd className="text-base text-muted-foreground">
                {getRoleAbility(role)}
              </dd>
            </div>
          ))}
        </dl>
      </SettingsSection>

      {canManageRoles ? (
        <RoleSettingsSheet devMode={devMode} roles={givableRoles} />
      ) : null}
    </SettingsPage>
  )
}
