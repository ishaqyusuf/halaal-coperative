import { describe, expect, test } from "bun:test"
import {
  deviceAccessHeadline,
  deviceIcon,
  deviceMeta,
  deviceWhen,
  groupDeviceSessions,
  platformLabel,
} from "./device-access-presentation"
import type { MobileDeviceSession } from "./device-session-types"

const now = Date.parse("2026-11-17T09:00:00Z")
function session(overrides: Partial<MobileDeviceSession>): MobileDeviceSession {
  return {
    appVersion: "1.4.0",
    buildVariant: "production",
    createdAt: new Date("2026-10-12T08:00:00Z"),
    current: false,
    deviceLabel: "Samsung Galaxy A54",
    expiresAt: new Date("2026-12-12T08:00:00Z"),
    id: "s",
    lastUsedAt: new Date("2026-11-14T17:20:00Z"),
    platform: "android",
    revocationReason: null,
    revokedAt: null,
    ...overrides,
  }
}

describe("device access presentation", () => {
  test("labels platforms and device kinds", () => {
    expect(platformLabel("ios")).toBe("iOS")
    expect(platformLabel("android")).toBe("Android")
    expect(platformLabel("web")).toBe("Web")
    expect(deviceIcon({ deviceLabel: "iPad Air" })).toBe("Tablet")
    expect(deviceIcon({ deviceLabel: "Galaxy Tab S9" })).toBe("Tablet")
    expect(deviceIcon({ deviceLabel: "iPhone 15" })).toBe("Smartphone")
  })

  test("describes when a device was last seen or ended", () => {
    expect(deviceWhen(session({ current: true }), now)).toBe("Active now")
    expect(deviceWhen(session({}), now)).toMatch(/^Last active 14 Nov, \d\d:20$/)
    expect(
      deviceWhen(session({ revokedAt: new Date("2026-10-28T10:00:00Z"), revocationReason: "user_signout" }), now)
    ).toBe("Signed out 28 Oct")
    expect(
      deviceWhen(session({ revokedAt: new Date("2026-10-30T10:00:00Z"), revocationReason: "compromised" }), now)
    ).toBe("Removed by an admin 30 Oct")
    expect(deviceWhen(session({ expiresAt: new Date("2026-10-03T10:00:00Z") }), now)).toBe("Expired 3 Oct")
    expect(deviceMeta(session({ current: true, platform: "ios" }), now)).toBe("iOS · App 1.4.0 · Active now")
  })

  test("groups this phone, other active devices and ended ones", () => {
    const groups = groupDeviceSessions(
      [
        session({ id: "other" }),
        session({ id: "ended", revokedAt: new Date("2026-10-28T10:00:00Z") }),
        session({ current: true, id: "here" }),
        session({ expiresAt: new Date("2026-10-03T10:00:00Z"), id: "expired" }),
      ],
      now
    )
    expect(groups.active).toBe(2)
    expect(groups.current.map((item) => item.id)).toEqual(["here"])
    expect(groups.other.map((item) => item.id)).toEqual(["other"])
    expect(groups.ended.map((item) => item.id).sort()).toEqual(["ended", "expired"])
    expect(deviceAccessHeadline(1)).toBe("Signed in on this phone only")
    expect(deviceAccessHeadline(3)).toBe("Signed in on 3 devices")
  })
})
