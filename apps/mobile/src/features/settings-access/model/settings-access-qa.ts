import type { AdminAccess } from "@/features/admin-reports-access/public/admin-access-types"

export type SettingsAccessQaState =
  | "denied"
  | "empty"
  | "error"
  | "invite-failed"
  | "loading"
  | "missing-prefix"
  | "offline"
  | "stale"

export function presentAdminAccessForQa(
  access: AdminAccess,
  qaState: SettingsAccessQaState | null
): AdminAccess {
  if (qaState === "empty") {
    return {
      ...access,
      summary: {
        ...access.summary,
        defaultRoles: 0,
        memberUsers: 0,
        roleAssignments: 0,
        staffUsers: 0,
        workspaceUsers: 0,
      },
      users: [],
    }
  }

  if (qaState === "offline" || qaState === "stale") {
    return {
      ...access,
      cache: {
        ageMs: access.cache?.ageMs ?? 15 * 60 * 1000,
        cachedAt: access.cache?.cachedAt ?? access.generatedAt,
        reason: qaState,
        scope: access.cache?.scope ?? "ticket-09-qa",
        status: "stale",
      },
    }
  }

  return access
}
