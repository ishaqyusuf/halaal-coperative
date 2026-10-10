import type { MobileAdminLifecycleQaState } from "../model/admin-member-lifecycle-types"

const qaStates = new Set<MobileAdminLifecycleQaState>([
  "denied",
  "empty",
  "error",
  "loading",
  "not-found",
  "offline",
  "stale",
])

export function getAdminLifecycleQaState(
  value: string | string[] | undefined
) {
  if (!__DEV__ || typeof value !== "string") return null
  return qaStates.has(value as MobileAdminLifecycleQaState)
    ? (value as MobileAdminLifecycleQaState)
    : null
}
