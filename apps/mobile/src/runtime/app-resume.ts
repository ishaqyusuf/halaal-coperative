/**
 * Resume policy for the runtime (ADR-021, pre-launch rule): only a real
 * background -> active return counts as a resume. An `inactive -> active`
 * flip (iOS biometric prompt, Control Center, the app-lock cover) is not one,
 * so it never wakes the API.
 */
export type AppLifecycleState = "active" | "background" | "inactive" | string

export function createBackgroundResumeTracker(
  initialState: AppLifecycleState | null | undefined
) {
  let sawBackground = initialState === "background"
  return (nextState: AppLifecycleState) => {
    if (nextState === "background") {
      sawBackground = true
      return false
    }
    if (nextState === "active" && sawBackground) {
      sawBackground = false
      return true
    }
    return false
  }
}

/** How long an access snapshot is trusted before a resume checks it again. */
export const ACCESS_RESUME_REFRESH_MS = 5 * 60 * 1000

export function shouldRefreshAccessOnResume({
  accessEndsAt,
  failed,
  lastCheckedAt,
  now,
}: {
  accessEndsAt: Date | string | null | undefined
  failed: boolean
  lastCheckedAt: number | null
  now: number
}) {
  if (failed || lastCheckedAt === null) return true
  // Timers do not run while the app is in the background, so an access end
  // that passed meanwhile must be re-checked on the way back.
  if (accessEndsAt && new Date(accessEndsAt).getTime() <= now) return true
  return now - lastCheckedAt >= ACCESS_RESUME_REFRESH_MS
}
