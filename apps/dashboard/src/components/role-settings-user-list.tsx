"use client"

import { useMemo, useState } from "react"
import { getRoleDisplayName } from "@halaalvest/auth/roles"
import type { MembershipRole } from "@halaalvest/db"
import { Input } from "@halaalvest/ui/components/input"
import { SearchIcon } from "lucide-react"
import { TrendPill, WorkspaceEmptyState } from "@/components/dashboard"

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

export function RoleSettingsUserList({ users }: { users: RoleSettingsUser[] }) {
  const [search, setSearch] = useState("")
  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return users
    }

    return users.filter((user) =>
      [
        user.fullName,
        user.email,
        ...user.memberships.map((membership) =>
          getRoleDisplayName(membership.role)
        ),
      ].some((value) => value.toLowerCase().includes(query))
    )
  }, [search, users])

  return (
    <section aria-labelledby="workspace-users-title">
      <div className="flex flex-col gap-4 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3
            className="text-base font-semibold text-foreground"
            id="workspace-users-title"
          >
            Workspace users and active roles
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Review every login attached to this cooperative and its current role
            memberships.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
          <div className="relative min-w-0 flex-1 lg:w-64 lg:flex-none">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search workspace users"
              className="h-10 pl-9"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search users..."
              type="search"
              value={search}
            />
          </div>
          <TrendPill>
            {filteredUsers.length} of {users.length}
          </TrendPill>
        </div>
      </div>

      {users.length === 0 ? (
        <WorkspaceEmptyState
          body="Assign the first workspace role to create a staff or member login for this cooperative."
          title="No workspace users yet."
        />
      ) : filteredUsers.length === 0 ? (
        <WorkspaceEmptyState
          body="Try another name, email address, or cooperative role."
          title="No matching workspace users."
        />
      ) : (
        <div className="border-y border-border/70">
          {filteredUsers.map((user) => {
            const defaultMembership = user.memberships.find(
              (membership) => membership.isDefault
            )

            return (
              <article
                className="border-b border-border/70 py-4 last:border-b-0"
                key={user.id}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {user.fullName}
                    </p>
                    <p className="mt-0.5 text-sm break-all text-muted-foreground sm:break-normal">
                      {user.email}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm text-muted-foreground">
                    {defaultMembership
                      ? `Default: ${getRoleDisplayName(defaultMembership.role)}`
                      : "No default role"}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {user.memberships.map((membership) => (
                    <TrendPill
                      className="h-5 px-2 py-0 leading-none"
                      key={membership.id}
                    >
                      {getRoleDisplayName(membership.role)}
                      {membership.isDefault ? " · default" : ""}
                    </TrendPill>
                  ))}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
