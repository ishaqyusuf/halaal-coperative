export const APP_LOCK_CODE_LENGTH = 6
export const APP_LOCK_MAX_FAILED_ATTEMPTS = 5
export const APP_LOCK_LOCKOUT_MS = 30_000
export const APP_LOCK_HYDRATION_TIMEOUT_MS = 5_000

export const APP_LOCK_RELOCK_OPTIONS = [0, 60_000, 300_000] as const

export type AppLockRelockAfterMs = (typeof APP_LOCK_RELOCK_OPTIONS)[number]

export type AppLockConfig = {
  biometricsEnabled: boolean
  codeHash: string
  createdAt: string
  enabled: true
  failedAttemptCount: number
  lastFailedAt: string | null
  lastUnlockedAt: string | null
  lockedUntil: string | null
  relockAfterMs: AppLockRelockAfterMs
  salt: string
  updatedAt: string
  version: 1
}

export type AppLockIdentity = {
  deviceId: string
  userId: string
}

export type AppLockReadResult =
  | { config: AppLockConfig; status: "configured" }
  | { config: null; status: "missing" }
  | {
      config: null
      reason:
        | "corrupt_config"
        | "missing_secure_config"
        | "storage_unavailable"
        | "timeout"
      status: "error"
    }

export type AppLockVerificationResult =
  | { config: AppLockConfig; ok: true }
  | {
      config: AppLockConfig | null
      lockedUntil?: string | null
      ok: false
      reason: "invalid" | "locked" | "missing" | "storage_error"
    }

export function normalizeAppLockCode(value: string) {
  return value.replace(/\D/g, "").slice(0, APP_LOCK_CODE_LENGTH)
}

export function isValidAppLockCode(value: string) {
  return (
    normalizeAppLockCode(value) === value &&
    value.length === APP_LOCK_CODE_LENGTH
  )
}

export function isAppLockRelockAfterMs(
  value: unknown
): value is AppLockRelockAfterMs {
  return APP_LOCK_RELOCK_OPTIONS.some((option) => option === value)
}

export function shouldRelockApp(input: {
  backgroundedAt: number | null
  now: number
  relockAfterMs: AppLockRelockAfterMs
}) {
  if (input.backgroundedAt === null) return false
  return input.now - input.backgroundedAt >= input.relockAfterMs
}

export function shouldClearAppLockForIdentityChange(input: {
  nextIdentity: AppLockIdentity | null
  previousIdentity: AppLockIdentity | null
}) {
  if (!input.previousIdentity) return false
  if (!input.nextIdentity) return true

  return (
    input.previousIdentity.userId !== input.nextIdentity.userId ||
    input.previousIdentity.deviceId !== input.nextIdentity.deviceId
  )
}
