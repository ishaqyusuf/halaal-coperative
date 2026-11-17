import { getDevAdminAccess } from "@/dev/mobile-dev-fixtures"
import { isMobileDevFixtureSession } from "@/dev/mobile-dev-session"
import type { AdminAccess } from "@/features/admin-reports-access/public/admin-access-types"
import { appQueryKey } from "@/hooks/use-app-query"
import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import { readCachedMobileQuery } from "@/lib/read-cache"
import { isStaffAccessUser } from "../presentation/workspace-access-list"

export type WorkspaceAccessCursor = { group: "staff" | "members"; id: string }

export function settingsAccessKey(
  account: string | null,
  view: string,
  ...parts: unknown[]
) {
  return appQueryKey("settings-access", account, view, ...parts)
}

export function getWorkspaceAccessCount() {
  return readCachedMobileQuery("admin.access.count", async () =>
    isMobileDevFixtureSession()
      ? { workspaceUsers: getDevAdminAccess().summary.workspaceUsers }
      : createMobileTrpcClient().mobile.admin.access.summary.query()
  )
}

export function getWorkspaceAccessStats() {
  return readCachedMobileQuery("admin.access.stats", async () => {
    if (isMobileDevFixtureSession()) {
      const { roles, summary } = getDevAdminAccess()
      return { roles, summary }
    }
    return createMobileTrpcClient().mobile.admin.access.stats.query()
  })
}

export function getWorkspaceAccessPage(
  cursor: WorkspaceAccessCursor | null,
  search: string
) {
  const limit = 25
  return readCachedMobileQuery(
    "admin.access.directory",
    async (): Promise<{
      users: AdminAccess["users"]
      nextCursor: WorkspaceAccessCursor | null
    }> => {
      if (!isMobileDevFixtureSession()) {
        return createMobileTrpcClient().mobile.admin.access.directory.query({
          cursor,
          limit,
          search: search || undefined,
        })
      }
      const term = search.toLowerCase()
      const sorted = [...getDevAdminAccess().users]
        .filter(
          (user) =>
            user.fullName.toLowerCase().includes(term) ||
            user.email.toLowerCase().includes(term)
        )
        .sort(
          (a, b) =>
            Number(isStaffAccessUser(b)) - Number(isStaffAccessUser(a)) ||
            a.id.localeCompare(b.id)
        )
      const start = cursor
        ? sorted.findIndex((user) => user.id === cursor.id) + 1
        : 0
      const users = sorted.slice(start, start + limit)
      const last = users.at(-1)
      return {
        users,
        nextCursor:
          start + users.length < sorted.length && last
            ? {
                group: isStaffAccessUser(last) ? "staff" : "members",
                id: last.id,
              }
            : null,
      }
    },
    { persist: !cursor && !search }
  )
}
