import type {
  AppLockConfig,
  AppLockIdentity,
  AppLockReadResult,
  AppLockRelockAfterMs,
  AppLockVerificationResult,
} from "@/features/app-lock/model/app-lock-types"
import {
  APP_LOCK_LOCKOUT_MS,
  APP_LOCK_MAX_FAILED_ATTEMPTS,
  isAppLockRelockAfterMs,
  isValidAppLockCode,
  normalizeAppLockCode,
} from "@/features/app-lock/model/app-lock-types"
const APP_LOCK_KEY_PREFIX = "halaalvest_mobile_app_lock"
const APP_LOCK_MARKER_VALUE = "configured"

type KeyValueStore = {
  deleteItem: (key: string) => Promise<void>
  getItem: (key: string) => Promise<string | null>
  setItem: (key: string, value: string) => Promise<void>
}

type AppLockStoreDependencies = {
  digest: (value: string) => Promise<string>
  markerStore: KeyValueStore
  now: () => number
  randomBytes: (count: number) => Promise<Uint8Array>
  secureStore: KeyValueStore
}

function cleanKeyPart(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9._-]/g, "_") || "unknown"
}

function keyForIdentity(identity: AppLockIdentity) {
  return `${APP_LOCK_KEY_PREFIX}_${cleanKeyPart(identity.deviceId)}_${cleanKeyPart(identity.userId)}`
}

function markerKeyForIdentity(identity: AppLockIdentity) {
  return `${keyForIdentity(identity)}_marker`
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

function constantTimeEqual(left: string, right: string) {
  const length = Math.max(left.length, right.length)
  let difference = left.length ^ right.length

  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0)
  }

  return difference === 0
}

function parseConfig(value: string): AppLockConfig | null {
  try {
    const parsed = JSON.parse(value) as Partial<AppLockConfig>
    if (
      parsed.version !== 1 ||
      parsed.enabled !== true ||
      typeof parsed.codeHash !== "string" ||
      typeof parsed.salt !== "string" ||
      typeof parsed.createdAt !== "string" ||
      typeof parsed.updatedAt !== "string" ||
      typeof parsed.failedAttemptCount !== "number" ||
      !Number.isInteger(parsed.failedAttemptCount) ||
      parsed.failedAttemptCount < 0 ||
      typeof parsed.biometricsEnabled !== "boolean" ||
      !isAppLockRelockAfterMs(parsed.relockAfterMs)
    ) {
      return null
    }

    return {
      biometricsEnabled: parsed.biometricsEnabled,
      codeHash: parsed.codeHash,
      createdAt: parsed.createdAt,
      enabled: true,
      failedAttemptCount: parsed.failedAttemptCount,
      lastFailedAt:
        typeof parsed.lastFailedAt === "string" ? parsed.lastFailedAt : null,
      lastUnlockedAt:
        typeof parsed.lastUnlockedAt === "string"
          ? parsed.lastUnlockedAt
          : null,
      lockedUntil:
        typeof parsed.lockedUntil === "string" ? parsed.lockedUntil : null,
      relockAfterMs: parsed.relockAfterMs,
      salt: parsed.salt,
      updatedAt: parsed.updatedAt,
      version: 1,
    }
  } catch {
    return null
  }
}

export function createAppLockStore(dependencies: AppLockStoreDependencies) {
  async function save(identity: AppLockIdentity, config: AppLockConfig) {
    const secureKey = keyForIdentity(identity)
    const markerKey = markerKeyForIdentity(identity)
    await dependencies.secureStore.setItem(secureKey, JSON.stringify(config))
    try {
      await dependencies.markerStore.setItem(markerKey, APP_LOCK_MARKER_VALUE)
    } catch (error) {
      await dependencies.secureStore
        .deleteItem(secureKey)
        .catch(() => undefined)
      throw error
    }
    return config
  }

  async function read(identity: AppLockIdentity): Promise<AppLockReadResult> {
    const secureKey = keyForIdentity(identity)
    const markerKey = markerKeyForIdentity(identity)

    try {
      const [value, marker] = await Promise.all([
        dependencies.secureStore.getItem(secureKey),
        dependencies.markerStore.getItem(markerKey),
      ])

      if (!value) {
        return marker === APP_LOCK_MARKER_VALUE
          ? {
              config: null,
              reason: "missing_secure_config",
              status: "error",
            }
          : { config: null, status: "missing" }
      }

      const config = parseConfig(value)
      if (!config) {
        return { config: null, reason: "corrupt_config", status: "error" }
      }

      if (marker !== APP_LOCK_MARKER_VALUE) {
        await dependencies.markerStore.setItem(markerKey, APP_LOCK_MARKER_VALUE)
      }

      return { config, status: "configured" }
    } catch {
      return { config: null, reason: "storage_unavailable", status: "error" }
    }
  }

  async function setCode(identity: AppLockIdentity, code: string) {
    if (!isValidAppLockCode(code)) {
      throw new Error("App lock PIN must contain exactly six digits.")
    }

    const existing = await read(identity)
    const now = new Date(dependencies.now()).toISOString()
    const salt = bytesToHex(await dependencies.randomBytes(16))
    const codeHash = await dependencies.digest(`${salt}:${code}`)

    return save(identity, {
      biometricsEnabled:
        existing.status === "configured"
          ? existing.config.biometricsEnabled
          : false,
      codeHash,
      createdAt:
        existing.status === "configured" ? existing.config.createdAt : now,
      enabled: true,
      failedAttemptCount: 0,
      lastFailedAt: null,
      lastUnlockedAt: now,
      lockedUntil: null,
      relockAfterMs:
        existing.status === "configured" ? existing.config.relockAfterMs : 0,
      salt,
      updatedAt: now,
      version: 1,
    })
  }

  async function update(
    identity: AppLockIdentity,
    transform: (config: AppLockConfig) => AppLockConfig
  ) {
    const result = await read(identity)
    if (result.status !== "configured") return null
    return save(identity, transform(result.config))
  }

  async function setBiometricsEnabled(
    identity: AppLockIdentity,
    enabled: boolean
  ) {
    const now = new Date(dependencies.now()).toISOString()
    return update(identity, (config) => ({
      ...config,
      biometricsEnabled: enabled,
      updatedAt: now,
    }))
  }

  async function setRelockAfterMs(
    identity: AppLockIdentity,
    relockAfterMs: AppLockRelockAfterMs
  ) {
    const now = new Date(dependencies.now()).toISOString()
    return update(identity, (config) => ({
      ...config,
      relockAfterMs,
      updatedAt: now,
    }))
  }

  async function recordUnlock(identity: AppLockIdentity) {
    const now = new Date(dependencies.now()).toISOString()
    return update(identity, (config) => ({
      ...config,
      failedAttemptCount: 0,
      lastFailedAt: null,
      lastUnlockedAt: now,
      lockedUntil: null,
      updatedAt: now,
    }))
  }

  async function verifyCode(
    identity: AppLockIdentity,
    code: string
  ): Promise<AppLockVerificationResult> {
    const result = await read(identity)
    if (result.status === "error") {
      return { config: null, ok: false, reason: "storage_error" }
    }
    if (result.status === "missing") {
      return { config: null, ok: false, reason: "missing" }
    }

    const config = result.config
    const nowMs = dependencies.now()
    const lockedUntilMs = config.lockedUntil
      ? new Date(config.lockedUntil).getTime()
      : 0

    if (Number.isFinite(lockedUntilMs) && lockedUntilMs > nowMs) {
      return {
        config,
        lockedUntil: config.lockedUntil,
        ok: false,
        reason: "locked",
      }
    }

    const normalizedCode = normalizeAppLockCode(code)
    const submittedHash = await dependencies.digest(
      `${config.salt}:${normalizedCode}`
    )

    if (
      normalizedCode.length === 6 &&
      constantTimeEqual(submittedHash, config.codeHash)
    ) {
      const nextConfig = await recordUnlock(identity)
      return nextConfig
        ? { config: nextConfig, ok: true }
        : { config: null, ok: false, reason: "storage_error" }
    }

    const failedAttemptCount = config.failedAttemptCount + 1
    const lockedUntil =
      failedAttemptCount >= APP_LOCK_MAX_FAILED_ATTEMPTS
        ? new Date(nowMs + APP_LOCK_LOCKOUT_MS).toISOString()
        : null
    const nextConfig = await save(identity, {
      ...config,
      failedAttemptCount: lockedUntil ? 0 : failedAttemptCount,
      lastFailedAt: new Date(nowMs).toISOString(),
      lockedUntil,
      updatedAt: new Date(nowMs).toISOString(),
    })

    return {
      config: nextConfig,
      lockedUntil,
      ok: false,
      reason: lockedUntil ? "locked" : "invalid",
    }
  }

  async function clear(identity: AppLockIdentity) {
    const results = await Promise.allSettled([
      dependencies.secureStore.deleteItem(keyForIdentity(identity)),
      dependencies.markerStore.deleteItem(markerKeyForIdentity(identity)),
    ])
    const rejected = results.find(
      (result): result is PromiseRejectedResult => result.status === "rejected"
    )
    if (rejected) throw rejected.reason
  }

  return {
    clear,
    read,
    recordUnlock,
    setBiometricsEnabled,
    setCode,
    setRelockAfterMs,
    verifyCode,
  }
}
