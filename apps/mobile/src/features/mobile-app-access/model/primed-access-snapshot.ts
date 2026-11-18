import { type MobileAppAccessSnapshot } from "@/features/mobile-app-access/api/mobile-app-access-api"

/**
 * Sign-in and password recovery return the app-access snapshot with the new
 * session. The app-access gate takes it once, for that exact session token,
 * instead of asking the server again right after sign-in. Anything older than
 * the TTL, or for another token, is ignored and the gate reads the server.
 */
export const PRIMED_ACCESS_SNAPSHOT_TTL_MS = 60_000

let primed: {
  at: number
  snapshot: MobileAppAccessSnapshot
  token: string
} | null = null

export function primeMobileAppAccessSnapshot(
  token: string,
  snapshot: MobileAppAccessSnapshot | null | undefined,
  now = Date.now()
) {
  primed = snapshot && token ? { at: now, snapshot, token } : null
}

export function takePrimedMobileAppAccessSnapshot(
  token: string | null | undefined,
  now = Date.now()
) {
  const current = primed
  primed = null
  if (
    !current ||
    !token ||
    current.token !== token ||
    now - current.at > PRIMED_ACCESS_SNAPSHOT_TTL_MS
  ) {
    return null
  }
  return current.snapshot
}

export function clearPrimedMobileAppAccessSnapshot() {
  primed = null
}
