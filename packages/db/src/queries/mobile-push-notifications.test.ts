import { describe, expect, test } from "bun:test"
import {
  getMobileUserNotificationPreferences,
  hashMobilePushToken,
  listEligibleMobilePushRegistrations,
  registerMobilePushEndpoint,
  resolveMobilePushRecipient,
  updateMobileUserNotificationPreference,
} from "./mobile-push-notifications"

const validToken = "ExponentPushToken[fixture-token-1234567890]"

describe("mobile push notification governance", () => {
  test("rejects malformed provider endpoints before writing", async () => {
    await expect(
      registerMobilePushEndpoint(
        {
          actorUserId: "user-1",
          mobileDeviceSessionId: "session-1",
          permissionStatus: "granted",
          platform: "android",
          providerToken: "not-a-push-token",
          tenantId: "tenant-1",
        },
        {} as never
      )
    ).rejects.toThrow("push endpoint is not valid")
  })

  test("registers only against the actor's active durable session and audits a fingerprint", async () => {
    let auditData: unknown
    let removedDuplicates = 0
    const result = await registerMobilePushEndpoint(
      {
        actorUserId: "user-1",
        mobileDeviceSessionId: "session-1",
        permissionStatus: "granted",
        platform: "android",
        projectId: "project-1",
        providerToken: validToken,
        tenantId: "tenant-1",
      },
      {
        $transaction: async (run: (tx: unknown) => Promise<unknown>) =>
          run({
            auditLog: {
              create: async ({ data }: { data: unknown }) => {
                auditData = data
              },
            },
            mobileDeviceSession: {
              findFirst: async () => ({ id: "session-1" }),
            },
            mobilePushRegistration: {
              deleteMany: async () => {
                removedDuplicates += 1
              },
              upsert: async () => ({
                id: "registration-1",
                lastValidatedAt: new Date("2026-08-31T12:00:00.000Z"),
              }),
            },
          }),
      } as never
    )

    expect(result).toEqual({
      id: "registration-1",
      lastValidatedAt: "2026-08-31T12:00:00.000Z",
      status: "registered",
    })
    expect(removedDuplicates).toBe(1)
    expect(JSON.stringify(auditData)).not.toContain(validToken)
    expect(JSON.stringify(auditData)).toContain(
      hashMobilePushToken(validToken).slice(0, 12)
    )
  })

  test("rejects registration when the durable session is missing or out of scope", async () => {
    await expect(
      registerMobilePushEndpoint(
        {
          actorUserId: "user-1",
          mobileDeviceSessionId: "session-1",
          permissionStatus: "granted",
          platform: "android",
          providerToken: validToken,
          tenantId: "tenant-1",
        },
        {
          $transaction: async (run: (tx: unknown) => Promise<unknown>) =>
            run({
              mobileDeviceSession: { findFirst: async () => null },
            }),
        } as never
      )
    ).rejects.toThrow("cannot register notifications")
  })

  test("keeps mandatory categories on but respects the member subscription gate", async () => {
    const prisma = {
      mobileUserNotificationPreference: {
        findMany: async () => [
          { enabled: true, notificationType: "financing" },
        ],
      },
      notificationPreference: {
        findMany: async () => [
          {
            channel: "push",
            enabled: false,
            notificationType: "financing",
            role: "member",
          },
        ],
      },
    } as never

    const active = await getMobileUserNotificationPreferences(
      {
        memberLoginEnabled: true,
        role: "member",
        tenantId: "tenant-1",
        userId: "user-1",
      },
      prisma
    )
    expect(active.find((item) => item.key === "security")).toMatchObject({
      available: true,
      enabled: true,
      mandatory: true,
    })
    expect(active.find((item) => item.key === "financing")).toMatchObject({
      available: false,
      enabled: false,
    })

    const subscriptionBlocked = await getMobileUserNotificationPreferences(
      {
        memberLoginEnabled: false,
        role: "member",
        tenantId: "tenant-1",
        userId: "user-1",
      },
      prisma
    )
    expect(subscriptionBlocked.every((item) => !item.available && !item.enabled)).toBe(
      true
    )
  })

  test("cannot disable a mandatory notification category", async () => {
    await expect(
      updateMobileUserNotificationPreference(
        {
          actorUserId: "user-1",
          enabled: false,
          notificationType: "security",
          tenantId: "tenant-1",
        },
        {} as never
      )
    ).rejects.toThrow("always stay on")
  })

  test("returns active registrations only when the governed category is enabled", async () => {
    let registrationReads = 0
    const prisma = {
      mobilePushRegistration: {
        findMany: async () => {
          registrationReads += 1
          return [{ id: "registration-1", providerToken: validToken }]
        },
      },
      mobileUserNotificationPreference: {
        findMany: async () => [],
      },
      notificationPreference: {
        findMany: async () => [
          {
            channel: "push",
            enabled: false,
            notificationType: "support",
            role: "member",
          },
        ],
      },
    } as never

    expect(
      await listEligibleMobilePushRegistrations(
        {
          category: "support",
          memberLoginEnabled: true,
          role: "member",
          tenantId: "tenant-1",
          userId: "user-1",
        },
        prisma
      )
    ).toEqual([])
    expect(registrationReads).toBe(0)
  })

  test("resolves an email only inside the tenant and requested membership role", async () => {
    let where: unknown
    const recipient = await resolveMobilePushRecipient(
      {
        intendedRole: "member",
        tenantId: "tenant-1",
        userEmail: " MEMBER@EXAMPLE.COM ",
      },
      {
        user: {
          findFirst: async (input: { where: unknown }) => {
            where = input.where
            return { id: "user-1", memberships: [{ role: "member" }] }
          },
        },
      } as never
    )

    expect(recipient).toEqual({ intendedRole: "member", userId: "user-1" })
    expect(where).toMatchObject({
      deletedAt: null,
      email: { equals: "member@example.com", mode: "insensitive" },
      tenantId: "tenant-1",
    })
  })
})
