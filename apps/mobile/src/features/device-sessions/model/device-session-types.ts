export type MobileDeviceSession = {
  appVersion: string
  buildVariant: string
  createdAt: Date
  current: boolean
  deviceLabel: string
  expiresAt: Date
  id: string
  lastUsedAt: Date
  platform: string
  revokedAt: Date | null
  revocationReason: string | null
}

export type MobileDeviceSessionCollection = {
  owner: {
    fullName: string
    id: string
  }
  sessions: MobileDeviceSession[]
}

export type MobileDeviceSessionConfirmation =
  | {
      kind: "revoke"
      session: MobileDeviceSession
    }
  | {
      kind: "revoke_all"
      session?: never
    }

export type MobileDeviceSessionViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; collection: MobileDeviceSessionCollection }

export type MobileDeviceSessionSummary = {
  active: number
  current: number
  recent: number
}

const refreshWindowMs = 24 * 60 * 60 * 1000

export function shouldRefreshMobileDeviceSession(
  expiresAt: string | null | undefined,
  now = Date.now(),
  qaAuthorized = false
) {
  if (!expiresAt) return true
  const expiry = Date.parse(expiresAt)
  if (qaAuthorized && Number.isFinite(expiry) && expiry > now) return false
  return !Number.isFinite(expiry) || expiry <= now + refreshWindowMs
}

export function canManageMobileDeviceSessions(role?: string | null) {
  return role === "super_admin" || role === "tenant_admin"
}

export function isActiveMobileDeviceSession(
  session: MobileDeviceSession,
  now = Date.now()
) {
  return session.revokedAt === null && session.expiresAt.getTime() > now
}

export function orderMobileDeviceSessions(
  sessions: readonly MobileDeviceSession[],
  now = Date.now()
) {
  return [...sessions].sort((left, right) => {
    if (left.current !== right.current) return left.current ? -1 : 1
    const leftActive = isActiveMobileDeviceSession(left, now)
    const rightActive = isActiveMobileDeviceSession(right, now)
    if (leftActive !== rightActive) return leftActive ? -1 : 1
    return right.lastUsedAt.getTime() - left.lastUsedAt.getTime()
  })
}

export function summarizeMobileDeviceSessions(
  sessions: readonly MobileDeviceSession[],
  now = Date.now()
): MobileDeviceSessionSummary {
  const active = sessions.filter((session) =>
    isActiveMobileDeviceSession(session, now)
  ).length
  return {
    active,
    current: sessions.some(
      (session) => session.current && isActiveMobileDeviceSession(session, now)
    )
      ? 1
      : 0,
    recent: sessions.length - active,
  }
}
