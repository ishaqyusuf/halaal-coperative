import { afterAll, beforeAll, describe, expect, test } from "bun:test"

import { createPrismaClient } from "../prisma"
import {
  createMobileDeviceSession,
  listMobileDeviceSessions,
  listMobileDeviceSessionsForAdmin,
  revokeAllMobileDeviceSessions,
  revokeMobileDeviceSession,
  validateMobileDeviceSession,
} from "./mobile-device-sessions"

const prisma = createPrismaClient()
const runIntegration = prisma ? describe : describe.skip
const slug = `mobile-session-it-${crypto.randomUUID().slice(0, 8)}`
let tenantId: string | null = null

function sessionInput(input: {
  deviceIdHash: string
  membershipId: string
  tokenHash: string
  userId: string
}) {
  return {
    actorUserId: input.userId,
    appVersion: "1.0.0",
    buildVariant: "development",
    deviceIdHash: input.deviceIdHash,
    deviceLabel: "Pixel 3a",
    expiresAt: new Date(Date.now() + 60_000),
    membershipId: input.membershipId,
    platform: "android",
    tenantId: tenantId!,
    tokenHash: input.tokenHash,
  }
}

runIntegration("mobile device session lifecycle", () => {
  beforeAll(async () => {
    if (!prisma) return
    const tenant = await prisma.tenant.create({
      data: { name: "Mobile Session Cooperative", slug, status: "active" },
    })
    tenantId = tenant.id
  })

  afterAll(async () => {
    if (prisma && tenantId) {
      await prisma.tenant.deleteMany({ where: { id: tenantId } })
    }
    await prisma?.$disconnect()
  })

  async function createMemberIdentity(label: string) {
    if (!prisma || !tenantId) {
      throw new Error("Database integration test was not configured.")
    }
    const user = await prisma.user.create({
      data: {
        email: `${slug}-${label}@example.test`,
        fullName: `Mobile Session ${label}`,
        tenantId,
      },
    })
    const membership = await prisma.membership.create({
      data: {
        isDefault: true,
        role: "member",
        tenantId,
        userId: user.id,
      },
    })
    const member = await prisma.member.create({
      data: {
        email: user.email,
        fullName: user.fullName,
        joinedAt: new Date(),
        memberNumber: `SESSION-${label.toUpperCase()}`,
        memberType: "individual",
        status: "active",
        tenantId,
        userId: user.id,
      },
    })
    return { member, membership, user }
  }

  test("replaces, validates, lists and revokes only hashed device sessions", async () => {
    if (!prisma || !tenantId) {
      throw new Error("Database integration test was not configured.")
    }
    const { member, membership, user } = await createMemberIdentity("lifecycle")
    const deviceHash = "a".repeat(64)
    const firstTokenHash = "b".repeat(64)
    const secondTokenHash = "c".repeat(64)

    const first = await createMobileDeviceSession(
      sessionInput({
        deviceIdHash: deviceHash,
        membershipId: membership.id,
        tokenHash: firstTokenHash,
        userId: user.id,
      }),
      prisma
    )
    expect(first.current).toBe(true)
    await expect(
      validateMobileDeviceSession(
        {
          deviceIdHash: "d".repeat(64),
          membershipId: membership.id,
          tenantId,
          tokenHash: firstTokenHash,
          userId: user.id,
        },
        prisma
      )
    ).resolves.toBeNull()
    await expect(
      validateMobileDeviceSession(
        {
          deviceIdHash: deviceHash,
          membershipId: membership.id,
          tenantId,
          tokenHash: firstTokenHash,
          userId: user.id,
        },
        prisma
      )
    ).resolves.toMatchObject({ userId: user.id })

    const second = await createMobileDeviceSession(
      {
        ...sessionInput({
          deviceIdHash: deviceHash,
          membershipId: membership.id,
          tokenHash: secondTokenHash,
          userId: user.id,
        }),
        replacesTokenHash: firstTokenHash,
      },
      prisma
    )
    await expect(
      validateMobileDeviceSession(
        {
          deviceIdHash: deviceHash,
          membershipId: membership.id,
          tenantId,
          tokenHash: firstTokenHash,
          userId: user.id,
        },
        prisma
      )
    ).resolves.toBeNull()
    const listed = await listMobileDeviceSessions(
      {
        currentTokenHash: secondTokenHash,
        tenantId,
        userId: user.id,
      },
      prisma
    )
    expect(listed).toHaveLength(2)
    expect(listed.find((item) => item.id === second.id)?.current).toBe(true)
    expect(listed.find((item) => item.id === first.id)?.revocationReason).toBe(
      "replaced"
    )
    await expect(
      listMobileDeviceSessionsForAdmin({ tenantId, userId: user.id }, prisma)
    ).resolves.toMatchObject({
      owner: { fullName: user.fullName, id: user.id },
      sessions: expect.any(Array),
    })

    await revokeMobileDeviceSession(
      {
        actorUserId: user.id,
        reason: "user_revoked",
        sessionId: second.id,
        tenantId,
        userId: user.id,
      },
      prisma
    )
    await expect(
      validateMobileDeviceSession(
        {
          deviceIdHash: deviceHash,
          membershipId: membership.id,
          tenantId,
          tokenHash: secondTokenHash,
          userId: user.id,
        },
        prisma
      )
    ).resolves.toBeNull()

    const third = await createMobileDeviceSession(
      sessionInput({
        deviceIdHash: "e".repeat(64),
        membershipId: membership.id,
        tokenHash: "f".repeat(64),
        userId: user.id,
      }),
      prisma
    )
    await prisma.tenant.update({
      data: { status: "suspended" },
      where: { id: tenantId },
    })
    await expect(
      validateMobileDeviceSession(
        {
          deviceIdHash: "e".repeat(64),
          membershipId: membership.id,
          tenantId,
          tokenHash: "f".repeat(64),
          userId: user.id,
        },
        prisma
      )
    ).resolves.toBeNull()
    await prisma.tenant.update({
      data: { status: "active" },
      where: { id: tenantId },
    })
    const revokedAll = await revokeAllMobileDeviceSessions(
      {
        actorUserId: user.id,
        reason: "sign_out_all",
        tenantId,
        userId: user.id,
      },
      prisma
    )
    expect(revokedAll.count).toBe(1)

    const audits = await prisma.auditLog.findMany({
      where: { entityType: "MobileDeviceSession", tenantId },
    })
    expect(audits.length).toBeGreaterThanOrEqual(5)
    const serializedAudit = JSON.stringify(audits.map((audit) => audit.metadata))
    expect(serializedAudit).not.toContain(firstTokenHash)
    expect(serializedAudit).not.toContain(deviceHash)
    expect(third.deviceLabel).toBe("Pixel 3a")
    expect(member.status).toBe("active")
  })

  test("allows only one concurrent replacement and rejects replay", async () => {
    if (!prisma || !tenantId) {
      throw new Error("Database integration test was not configured.")
    }
    const { membership, user } = await createMemberIdentity("rotation")
    const deviceIdHash = "1".repeat(64)
    const originalTokenHash = "2".repeat(64)
    await createMobileDeviceSession(
      sessionInput({
        deviceIdHash,
        membershipId: membership.id,
        tokenHash: originalTokenHash,
        userId: user.id,
      }),
      prisma
    )

    const results = await Promise.allSettled(
      ["3".repeat(64), "4".repeat(64)].map((tokenHash) =>
        createMobileDeviceSession(
          {
            ...sessionInput({
              deviceIdHash,
              membershipId: membership.id,
              tokenHash,
              userId: user.id,
            }),
            replacesTokenHash: originalTokenHash,
          },
          prisma
        )
      )
    )
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(
      1
    )
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(
      1
    )
    await expect(
      createMobileDeviceSession(
        {
          ...sessionInput({
            deviceIdHash,
            membershipId: membership.id,
            tokenHash: "5".repeat(64),
            userId: user.id,
          }),
          replacesTokenHash: originalTokenHash,
        },
        prisma
      )
    ).rejects.toThrow("already replaced or revoked")

    const active = await prisma.mobileDeviceSession.findMany({
      where: { revokedAt: null, tenantId, userId: user.id },
    })
    expect(active).toHaveLength(1)
  })

  test("invalidates expiry, member suspension and membership removal", async () => {
    if (!prisma || !tenantId) {
      throw new Error("Database integration test was not configured.")
    }
    const { member, membership, user } = await createMemberIdentity("invalidation")
    const deviceIdHash = "6".repeat(64)
    const tokenHash = "7".repeat(64)
    const session = await createMobileDeviceSession(
      sessionInput({
        deviceIdHash,
        membershipId: membership.id,
        tokenHash,
        userId: user.id,
      }),
      prisma
    )
    const validationInput = {
      deviceIdHash,
      membershipId: membership.id,
      tenantId,
      tokenHash,
      userId: user.id,
    }

    await prisma.member.update({
      data: { status: "suspended" },
      where: { id: member.id },
    })
    await expect(
      validateMobileDeviceSession(validationInput, prisma)
    ).resolves.toBeNull()
    await prisma.member.update({
      data: { status: "active" },
      where: { id: member.id },
    })
    await prisma.mobileDeviceSession.update({
      data: { expiresAt: new Date(Date.now() - 1_000) },
      where: { id: session.id },
    })
    await expect(
      validateMobileDeviceSession(validationInput, prisma)
    ).resolves.toBeNull()

    const membershipRemovalToken = "8".repeat(64)
    await createMobileDeviceSession(
      sessionInput({
        deviceIdHash: "9".repeat(64),
        membershipId: membership.id,
        tokenHash: membershipRemovalToken,
        userId: user.id,
      }),
      prisma
    )
    await prisma.membership.delete({ where: { id: membership.id } })
    await expect(
      validateMobileDeviceSession(
        {
          deviceIdHash: "9".repeat(64),
          membershipId: membership.id,
          tenantId,
          tokenHash: membershipRemovalToken,
          userId: user.id,
        },
        prisma
      )
    ).resolves.toBeNull()
  })
})
