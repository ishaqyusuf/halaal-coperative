import { afterAll, describe, expect, test } from "bun:test"
import { hashAuthEvidence } from "@halaalvest/auth"
import { createPrismaClient } from "../prisma"
import {
  consumeWorkspaceSessionHandoff,
  createWorkspaceSessionHandoff,
} from "./workspace-session-handoff"

const prisma = createPrismaClient()
const runIntegration = prisma ? describe : describe.skip
const slug = `handoff-it-${crypto.randomUUID().slice(0, 8)}`
const tenantIds: string[] = []

runIntegration("workspace session handoff database lifecycle", () => {
  afterAll(async () => {
    if (prisma && tenantIds.length > 0) {
      await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } })
    }
    await prisma?.$disconnect()
  })

  test("supersedes, consumes once, and rejects expired or cross-tenant use", async () => {
    if (!prisma)
      throw new Error("Database integration test was not configured.")
    const tenant = await prisma.tenant.create({
      data: { name: "Handoff Integration Cooperative", slug, status: "active" },
    })
    const otherTenant = await prisma.tenant.create({
      data: {
        name: "Handoff Other Cooperative",
        slug: `${slug}-other`,
        status: "active",
      },
    })
    tenantIds.push(tenant.id, otherTenant.id)
    const user = await prisma.user.create({
      data: {
        email: `${slug}@example.test`,
        fullName: "Handoff Integration Owner",
        tenantId: tenant.id,
      },
    })

    const first = await createWorkspaceSessionHandoff(
      { tenantId: tenant.id, userId: user.id },
      prisma
    )
    const second = await createWorkspaceSessionHandoff(
      { tenantId: tenant.id, userId: user.id },
      prisma
    )
    const stored = await prisma.authChallenge.findMany({
      orderBy: { createdAt: "asc" },
      where: { purpose: "workspace_session_handoff", tenantId: tenant.id },
    })
    expect(stored).toHaveLength(2)
    expect(stored[0]?.consumedAt).not.toBeNull()
    expect(stored[1]?.consumedAt).toBeNull()
    expect(stored[1]?.evidenceHash).toBe(hashAuthEvidence(second.token))
    expect(stored[1]?.maxAttempts).toBe(1)
    expect(JSON.stringify(stored)).not.toContain(second.token)

    await expect(
      consumeWorkspaceSessionHandoff(
        { tenantId: tenant.id, token: first.token },
        prisma
      )
    ).resolves.toBeNull()
    await expect(
      consumeWorkspaceSessionHandoff(
        { tenantId: otherTenant.id, token: second.token },
        prisma
      )
    ).resolves.toBeNull()

    const consumed = await consumeWorkspaceSessionHandoff(
      { tenantId: tenant.id, token: second.token },
      prisma
    )
    expect(consumed).toEqual({ challengeId: stored[1]!.id, userId: user.id })
    await expect(
      consumeWorkspaceSessionHandoff(
        { tenantId: tenant.id, token: second.token },
        prisma
      )
    ).resolves.toBeNull()

    const burned = await prisma.authChallenge.findUniqueOrThrow({
      where: { id: stored[1]!.id },
    })
    expect(burned.consumedAt).not.toBeNull()
    expect(burned.attemptCount).toBe(1)
    const audits = await prisma.auditLog.findMany({
      where: {
        action: {
          in: [
            "auth.workspace_session_handoff.requested",
            "auth.workspace_session_handoff.consumed",
          ],
        },
        tenantId: tenant.id,
      },
    })
    expect(
      audits.filter(
        (audit) => audit.action === "auth.workspace_session_handoff.requested"
      )
    ).toHaveLength(2)
    expect(
      audits.filter(
        (audit) => audit.action === "auth.workspace_session_handoff.consumed"
      )
    ).toEqual([
      expect.objectContaining({ actorUserId: user.id, entityId: burned.id }),
    ])
    expect(JSON.stringify(audits)).not.toContain(second.token)

    const expiring = await createWorkspaceSessionHandoff(
      { tenantId: tenant.id, userId: user.id },
      prisma
    )
    await prisma.authChallenge.updateMany({
      data: { expiresAt: new Date(Date.now() - 1_000) },
      where: {
        evidenceHash: hashAuthEvidence(expiring.token),
        tenantId: tenant.id,
      },
    })
    await expect(
      consumeWorkspaceSessionHandoff(
        { tenantId: tenant.id, token: expiring.token },
        prisma
      )
    ).resolves.toBeNull()
  })
})
