import { describe, expect, test } from "bun:test"

import {
  canManageMobileDeviceSessions,
  orderMobileDeviceSessions,
  shouldRefreshMobileDeviceSession,
  summarizeMobileDeviceSessions,
  type MobileDeviceSession,
} from "./device-session-types"

const now = Date.parse("2026-08-29T00:00:00.000Z")

function session(
  input: Partial<MobileDeviceSession> & Pick<MobileDeviceSession, "id">
): MobileDeviceSession {
  return {
    appVersion: "1.0.0",
    buildVariant: "development",
    createdAt: new Date(now - 60_000),
    current: false,
    deviceLabel: "Pixel 3a",
    expiresAt: new Date(now + 60_000),
    lastUsedAt: new Date(now - 30_000),
    platform: "android",
    revokedAt: null,
    revocationReason: null,
    ...input,
  }
}

describe("mobile device session refresh policy", () => {
  test("migrates legacy profiles without durable expiry metadata", () => {
    expect(shouldRefreshMobileDeviceSession(undefined, 1_000)).toBe(true)
    expect(shouldRefreshMobileDeviceSession("not-a-date", 1_000)).toBe(true)
  })

  test("refreshes inside the final day but not before", () => {
    expect(
      shouldRefreshMobileDeviceSession(
        new Date(now + 23 * 60 * 60 * 1000).toISOString(),
        now
      )
    ).toBe(true)
    expect(
      shouldRefreshMobileDeviceSession(
        new Date(now + 25 * 60 * 60 * 1000).toISOString(),
        now
      )
    ).toBe(false)
  })

  test("does not roll a still-valid QA-authorized session", () => {
    expect(
      shouldRefreshMobileDeviceSession(
        new Date(now + 8 * 60 * 60 * 1000).toISOString(),
        now,
        true
      )
    ).toBe(false)
    expect(
      shouldRefreshMobileDeviceSession(
        new Date(now - 1).toISOString(),
        now,
        true
      )
    ).toBe(true)
  })

  test("limits managed-session access to roles with manage_roles authority", () => {
    expect(canManageMobileDeviceSessions("tenant_admin")).toBe(true)
    expect(canManageMobileDeviceSessions("super_admin")).toBe(true)
    expect(canManageMobileDeviceSessions("finance_officer")).toBe(false)
    expect(canManageMobileDeviceSessions("operations_officer")).toBe(false)
    expect(canManageMobileDeviceSessions("member")).toBe(false)
  })

  test("orders current and active sessions before recently ended access", () => {
    const ordered = orderMobileDeviceSessions(
      [
        session({
          id: "revoked",
          revokedAt: new Date(now - 1_000),
        }),
        session({ current: true, id: "current" }),
        session({
          expiresAt: new Date(now - 1_000),
          id: "expired",
        }),
        session({ id: "active" }),
      ],
      now
    )

    expect(ordered.map((item) => item.id)).toEqual([
      "current",
      "active",
      "revoked",
      "expired",
    ])
    expect(summarizeMobileDeviceSessions(ordered, now)).toEqual({
      active: 2,
      current: 1,
      recent: 2,
    })
  })
})
