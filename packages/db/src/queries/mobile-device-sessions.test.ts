import { describe, expect, test } from "bun:test"
import {
  createMobileDeviceSession,
  countMobileDeviceSessionRevocations,
  revokeAllMobileDeviceSessionsWithClient,
  revokeMobileDeviceSession,
} from "./mobile-device-sessions"

const now = new Date("2026-08-31T12:00:00.000Z")

describe("mobile session revocation evidence", () => {
  test("counts all matching sessions without the device-list pagination cap", async () => {
    let query: unknown
    const result = await countMobileDeviceSessionRevocations(
      { createdAtOrAfter: now, tenantId: "tenant-1", userId: "user-1" },
      {
        mobileDeviceSession: {
          aggregate: async (input: unknown) => {
            query = input
            return { _count: { _all: 31, revokedAt: 30 } }
          },
        },
      } as never
    )
    expect(query).toEqual({
      _count: { _all: true, revokedAt: true },
      where: {
        createdAt: { gte: now },
        tenantId: "tenant-1",
        userId: "user-1",
      },
    })
    expect(result).toEqual({ sessionCount: 31, revokedSessionCount: 30 })
  })

  test("rejects invalid evidence windows before querying", async () => {
    await expect(
      countMobileDeviceSessionRevocations({
        createdAtOrAfter: new Date("invalid"),
        tenantId: "tenant-1",
        userId: "user-1",
      })
    ).rejects.toThrow("A valid session start time is required.")
  })
})

describe("mobile device session push lifecycle", () => {
  test("removes push registrations when replacing sessions on the device", async () => {
    let deletedWhere: unknown
    const created = {
      appVersion: "1.0.0",
      buildVariant: "development",
      createdAt: now,
      deviceLabel: "Pixel 3a",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      id: "session-new",
      lastUsedAt: now,
      platform: "android",
      revokedAt: null,
      revocationReason: null,
      tokenHash: "c".repeat(64),
    }
    const result = await createMobileDeviceSession(
      {
        actorUserId: "user-1",
        appVersion: "1.0.0",
        buildVariant: "development",
        deviceIdHash: "a".repeat(64),
        deviceLabel: "Pixel 3a",
        expiresAt: created.expiresAt,
        membershipId: "membership-1",
        platform: "android",
        replacesTokenHash: "b".repeat(64),
        tenantId: "tenant-1",
        tokenHash: created.tokenHash,
      },
      {
        $transaction: async (run: (tx: unknown) => Promise<unknown>) =>
          run({
            auditLog: { create: async () => undefined },
            membership: { findFirst: async () => ({ id: "membership-1" }) },
            mobileDeviceSession: {
              create: async () => created,
              findMany: async () => [
                { id: "session-old-token" },
                { id: "session-old-device" },
              ],
              updateMany: async () => ({ count: 1 }),
            },
            mobilePushRegistration: {
              deleteMany: async ({ where }: { where: unknown }) => {
                deletedWhere = where
              },
            },
            user: { findFirst: async () => ({ id: "user-1" }) },
          }),
      } as never
    )

    expect(result).toMatchObject({ current: true, id: "session-new" })
    expect(deletedWhere).toEqual({
      mobileDeviceSessionId: {
        in: ["session-old-token", "session-old-device"],
      },
    })
  })

  test("removes the endpoint before revoking one session", async () => {
    const calls: string[] = []
    await revokeMobileDeviceSession(
      {
        actorUserId: "user-1",
        reason: "signed_out",
        sessionId: "session-1",
        tenantId: "tenant-1",
        userId: "user-1",
      },
      {
        $transaction: async (run: (tx: unknown) => Promise<unknown>) =>
          run({
            auditLog: { create: async () => calls.push("audit") },
            mobileDeviceSession: {
              findFirst: async () => ({ id: "session-1", revokedAt: null }),
              update: async () => calls.push("session"),
            },
            mobilePushRegistration: {
              deleteMany: async () => calls.push("push"),
            },
          }),
      } as never
    )
    expect(calls).toEqual(["push", "session", "audit"])
  })

  test("removes all user endpoints before bulk session revocation", async () => {
    const calls: string[] = []
    const result = await revokeAllMobileDeviceSessionsWithClient(
      {
        auditLog: { create: async () => calls.push("audit") },
        mobileDeviceSession: {
          updateMany: async () => {
            calls.push("sessions")
            return { count: 2 }
          },
        },
        mobilePushRegistration: {
          deleteMany: async () => calls.push("push"),
        },
      } as never,
      {
        actorUserId: "user-1",
        reason: "sign_out_all",
        tenantId: "tenant-1",
        userId: "user-1",
      }
    )
    expect(result).toEqual({ count: 2 })
    expect(calls).toEqual(["push", "sessions", "audit"])
  })
})
