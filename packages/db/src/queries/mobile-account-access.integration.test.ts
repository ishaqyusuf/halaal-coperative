import { afterAll, describe, expect, test } from "bun:test"
import {
  hashAuthEvidence,
  hashPassword,
  verifyPassword,
} from "@halaalvest/auth"
import { createPrismaClient } from "../prisma"
import {
  completeMobilePasswordRecovery,
  createAuthChallenge,
} from "./mobile-account-access"
import {
  createMobileDeviceSession,
  validateMobileDeviceSession,
} from "./mobile-device-sessions"

const prisma = createPrismaClient()
const runIntegration = prisma ? describe : describe.skip
const slug = `auth-it-${crypto.randomUUID().slice(0, 8)}`
let tenantId: string | null = null

runIntegration("mobile account access database lifecycle", () => {
  afterAll(async () => {
    if (prisma && tenantId) {
      await prisma.tenant.deleteMany({ where: { id: tenantId } })
    }
    await prisma?.$disconnect()
  })

  test("consumes password recovery once and rejects cross-tenant use", async () => {
    if (!prisma)
      throw new Error("Database integration test was not configured.")
    const tenant = await prisma.tenant.create({
      data: { name: "Auth Integration Cooperative", slug, status: "active" },
    })
    tenantId = tenant.id
    const user = await prisma.user.create({
      data: {
        email: `${slug}@example.test`,
        fullName: "Auth Integration User",
        passwordHash: hashPassword("Original2026"),
        tenantId: tenant.id,
      },
    })
    const membership = await prisma.membership.create({
      data: {
        isDefault: true,
        role: "tenant_admin",
        tenantId: tenant.id,
        userId: user.id,
      },
    })
    const tokenHash = hashAuthEvidence(`recovery-session:${user.id}`)
    const deviceIdHash = hashAuthEvidence(`recovery-device:${user.id}`)
    const session = await createMobileDeviceSession(
      {
        actorUserId: user.id,
        appVersion: "1.0.0",
        buildVariant: "development",
        deviceIdHash,
        deviceLabel: "Recovery Pixel",
        expiresAt: new Date(Date.now() + 60_000),
        membershipId: membership.id,
        platform: "android",
        tenantId: tenant.id,
        tokenHash,
      },
      prisma
    )
    await expect(
      validateMobileDeviceSession(
        {
          deviceIdHash,
          membershipId: membership.id,
          tenantId: tenant.id,
          tokenHash,
          userId: user.id,
        },
        prisma
      )
    ).resolves.toMatchObject({ id: session.id })
    const code = "431902"
    const challenge = await createAuthChallenge(
      {
        evidenceHash: hashAuthEvidence(code),
        expiresAt: new Date(Date.now() + 60_000),
        purpose: "password_recovery",
        tenantId: tenant.id,
        userId: user.id,
      },
      prisma
    )

    await expect(
      completeMobilePasswordRecovery(
        {
          challengeId: challenge.id,
          evidenceHash: hashAuthEvidence(code),
          passwordHash: hashPassword("Recovered2026"),
          tenantId: crypto.randomUUID(),
        },
        prisma
      )
    ).rejects.toThrow("preflight rejected: missing")

    const recovered = await completeMobilePasswordRecovery(
      {
        challengeId: challenge.id,
        evidenceHash: hashAuthEvidence(code),
        passwordHash: hashPassword("Recovered2026"),
        tenantId: tenant.id,
      },
      prisma
    )
    expect(recovered.membership?.id).toBe(membership.id)
    expect(recovered.membership?.role).toBe("tenant_admin")
    const updatedUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    })
    expect(verifyPassword("Recovered2026", updatedUser.passwordHash)).toBe(true)
    await expect(
      validateMobileDeviceSession(
        {
          deviceIdHash,
          membershipId: membership.id,
          tenantId: tenant.id,
          tokenHash,
          userId: user.id,
        },
        prisma
      )
    ).resolves.toBeNull()
    const revokedSession = await prisma.mobileDeviceSession.findUniqueOrThrow({
      where: { id: session.id },
    })
    expect(revokedSession.revokedAt).not.toBeNull()
    expect(revokedSession.revocationReason).toBe("password_reset")
    const consumed = await prisma.authChallenge.findUniqueOrThrow({
      where: { id: challenge.id },
    })
    expect(consumed.consumedAt).not.toBeNull()
    expect(consumed.attemptCount).toBe(1)
    const completionAudit = await prisma.auditLog.findFirstOrThrow({
      where: {
        action: "auth.password_recovery.completed",
        entityId: challenge.id,
        tenantId: tenant.id,
      },
    })
    expect(completionAudit.actorUserId).toBe(user.id)
    expect(completionAudit.metadata).toEqual({ membershipId: membership.id })
    expect(JSON.stringify(completionAudit.metadata)).not.toMatch(
      /code|email|evidence|password/i
    )

    await expect(
      completeMobilePasswordRecovery(
        {
          challengeId: challenge.id,
          evidenceHash: hashAuthEvidence(code),
          passwordHash: hashPassword("Replay2026"),
          tenantId: tenant.id,
        },
        prisma
      )
    ).rejects.toThrow("preflight rejected: consumed")

    const expiredChallenge = await createAuthChallenge(
      {
        evidenceHash: hashAuthEvidence("613902"),
        expiresAt: new Date(Date.now() - 1_000),
        purpose: "password_recovery",
        tenantId: tenant.id,
        userId: user.id,
      },
      prisma
    )
    await expect(
      completeMobilePasswordRecovery(
        {
          challengeId: expiredChallenge.id,
          evidenceHash: hashAuthEvidence("613902"),
          passwordHash: hashPassword("Expired2026"),
          tenantId: tenant.id,
        },
        prisma
      )
    ).rejects.toThrow("preflight rejected: expired")
  })
})
