/**
 * Push registration dedupe (mobile plan M2). The server upserts the
 * registration per device session and writes an audit row on every call, so
 * the app only calls `registerPush` when something changed (scope or
 * permission), when asked to (permission prompt, retry, a new provider
 * token), or once the last sync is older than a day. `disablePush` runs only
 * when a granted registration is withdrawn.
 */
export type PushPermission =
  | "denied"
  | "granted"
  | "undetermined"
  | "unavailable"

export type PushRegistrationRecord = {
  permission: PushPermission
  scope: string
  syncedAt: number
}

export type PushRegistrationPlan = "disable" | "register" | "skip"

export const PUSH_REGISTRATION_TTL_MS = 24 * 60 * 60 * 1000

/** FNV-1a, so the stored scope never holds the session token itself. */
export function fingerprint(value: string) {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, "0")
}

export function pushRegistrationScope(input: {
  membershipId: string
  sessionToken: string | null
  tenantId: string
  userId: string
}) {
  return [
    input.userId,
    input.tenantId,
    input.membershipId,
    fingerprint(input.sessionToken ?? ""),
  ].join(":")
}

export function planPushRegistration({
  force = false,
  now,
  permission,
  record,
  scope,
}: {
  force?: boolean
  now: number
  permission: PushPermission
  record: PushRegistrationRecord | null
  scope: string
}): PushRegistrationPlan {
  if (permission === "unavailable") return "skip"
  if (permission !== "granted") {
    return record?.permission === "granted" ? "disable" : "skip"
  }
  if (force) return "register"
  const fresh =
    record !== null &&
    record.scope === scope &&
    record.permission === "granted" &&
    now - record.syncedAt >= 0 &&
    now - record.syncedAt < PUSH_REGISTRATION_TTL_MS
  return fresh ? "skip" : "register"
}

export function parsePushRegistrationRecord(
  value: string | null
): PushRegistrationRecord | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as Partial<PushRegistrationRecord>
    if (
      typeof parsed.scope !== "string" ||
      typeof parsed.syncedAt !== "number" ||
      !["denied", "granted", "undetermined", "unavailable"].includes(
        parsed.permission as string
      )
    ) {
      return null
    }
    return {
      permission: parsed.permission as PushPermission,
      scope: parsed.scope,
      syncedAt: parsed.syncedAt,
    }
  } catch {
    return null
  }
}
