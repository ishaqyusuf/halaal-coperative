import {
  isActiveMobileDeviceSession,
  orderMobileDeviceSessions,
  type MobileDeviceSession,
} from "./device-session-types"

const time = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  hour12: false,
  minute: "2-digit",
})
const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" })
const fullDay = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
})

export function platformLabel(platform: string) {
  const value = platform.trim().toLowerCase()
  if (value === "ios") return "iOS"
  if (value === "android") return "Android"
  return platform ? `${platform.charAt(0).toUpperCase()}${platform.slice(1)}` : "Device"
}

/** Tablets get a tablet tile; everything else is a phone. */
export function deviceIcon(session: Pick<MobileDeviceSession, "deviceLabel">) {
  return /ipad|tablet|\btab\b/i.test(session.deviceLabel) ? "Tablet" : "Smartphone"
}

/** "Active now", "Last active 14 Nov, 18:20", "Signed out 28 Oct", "Expired 3 Oct". */
export function deviceWhen(session: MobileDeviceSession, now = Date.now()) {
  if (session.revokedAt) {
    const reason = session.revocationReason ?? ""
    const verb =
      reason === "compromised" || reason === "security_reset"
        ? "Removed by an admin"
        : reason === "user_revoked"
          ? "Removed"
          : reason === "password_reset"
            ? "Ended by password reset"
            : "Signed out"
    return `${verb} ${day.format(session.revokedAt)}`
  }
  if (session.expiresAt.getTime() <= now) return `Expired ${day.format(session.expiresAt)}`
  if (session.current) return "Active now"
  return `Last active ${day.format(session.lastUsedAt)}, ${time.format(session.lastUsedAt)}`
}

export function deviceMeta(session: MobileDeviceSession, now = Date.now()) {
  return `${platformLabel(session.platform)} · App ${session.appVersion} · ${deviceWhen(session, now)}`
}

export function deviceSignedIn(session: MobileDeviceSession) {
  return fullDay.format(session.createdAt)
}

export type DeviceAccessGroups = {
  active: number
  current: MobileDeviceSession[]
  ended: MobileDeviceSession[]
  other: MobileDeviceSession[]
}

export function groupDeviceSessions(
  sessions: readonly MobileDeviceSession[],
  now = Date.now()
): DeviceAccessGroups {
  const ordered = orderMobileDeviceSessions(sessions, now)
  const live = ordered.filter((session) => isActiveMobileDeviceSession(session, now))
  return {
    active: live.length,
    current: live.filter((session) => session.current),
    ended: ordered.filter((session) => !isActiveMobileDeviceSession(session, now)),
    other: live.filter((session) => !session.current),
  }
}

export function deviceAccessHeadline(active: number) {
  return active === 1 ? "Signed in on this phone only" : `Signed in on ${active} devices`
}
