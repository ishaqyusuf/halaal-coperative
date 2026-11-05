import { describe, expect, test } from "bun:test"
import { hashAuthEvidence } from "@halaalvest/auth"
import type { PrismaClient } from "../../generated/prisma/client"
import {
  consumeWorkspaceSessionHandoff,
  createWorkspaceSessionHandoff,
  workspaceSessionHandoffTtlMs,
} from "./workspace-session-handoff"

type Row = {
  attemptCount: number
  consumedAt: Date | null
  evidenceHash: string
  expiresAt: Date
  id: string
  maxAttempts: number
  purpose: string
  tenantId: string
  userId: string | null
}

const maxAttemptsField = Symbol("maxAttempts")

/**
 * In-memory stand-in for the AuthChallenge/AuditLog delegates. It evaluates
 * the where clauses the handoff helpers send, so tests exercise the real
 * filter shape rather than a canned answer.
 */
function createFakePrisma() {
  const rows: Row[] = []
  const audits: Array<Record<string, unknown>> = []
  const calls: string[] = []
  let sequence = 0

  const authChallenge = {
    fields: { maxAttempts: maxAttemptsField },
    create: async ({
      data,
    }: {
      data: Omit<Row, "id" | "attemptCount" | "consumedAt">
    }) => {
      calls.push("authChallenge.create")
      const row: Row = {
        attemptCount: 0,
        consumedAt: null,
        id: `challenge-${++sequence}`,
        ...data,
      }
      rows.push(row)
      return row
    },
    updateMany: async ({
      data,
      where,
    }: {
      data: { consumedAt: Date }
      where: {
        consumedAt: null
        purpose: string
        tenantId: string
        userId: string | null
      }
    }) => {
      calls.push("authChallenge.updateMany")
      const matched = rows.filter(
        (row) =>
          row.consumedAt === null &&
          row.purpose === where.purpose &&
          row.tenantId === where.tenantId &&
          row.userId === where.userId
      )
      for (const row of matched) row.consumedAt = data.consumedAt
      return { count: matched.length }
    },
    updateManyAndReturn: async ({
      data,
      where,
    }: {
      data: { consumedAt: Date }
      where: {
        attemptCount: { lt: symbol }
        evidenceHash: string
        expiresAt: { gt: Date }
        purpose: string
        tenantId: string
      }
    }) => {
      calls.push("authChallenge.updateManyAndReturn")
      expect(where.attemptCount.lt).toBe(maxAttemptsField)
      const matched = rows.filter(
        (row) =>
          row.attemptCount < row.maxAttempts &&
          row.consumedAt === null &&
          row.evidenceHash === where.evidenceHash &&
          row.expiresAt.getTime() > where.expiresAt.gt.getTime() &&
          row.purpose === where.purpose &&
          row.tenantId === where.tenantId &&
          row.userId !== null
      )
      for (const row of matched) {
        row.consumedAt = data.consumedAt
        row.attemptCount += 1
      }
      return matched.map((row) => ({ id: row.id, userId: row.userId }))
    },
  }

  const prisma = {
    $transaction: async (callback: (tx: unknown) => unknown) => {
      calls.push("$transaction")
      return callback(prisma)
    },
    auditLog: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        calls.push("auditLog.create")
        audits.push(data)
        return data
      },
    },
    authChallenge,
  }

  return { audits, calls, prisma: prisma as unknown as PrismaClient, rows }
}

const tenantId = "tenant-a"
const userId = "user-a"

describe("workspace session handoff", () => {
  test("stores only the hash, expires in 3 minutes, and allows one attempt", async () => {
    const fake = createFakePrisma()
    const before = Date.now()
    const handoff = await createWorkspaceSessionHandoff(
      { tenantId, userId },
      fake.prisma
    )

    expect(handoff.token.length).toBeGreaterThanOrEqual(40)
    expect(fake.rows).toHaveLength(1)
    const [row] = fake.rows
    expect(row?.evidenceHash).toBe(hashAuthEvidence(handoff.token))
    expect(row?.purpose).toBe("workspace_session_handoff")
    expect(row?.maxAttempts).toBe(1)
    expect(row?.expiresAt).toEqual(handoff.expiresAt)
    const ttl = handoff.expiresAt.getTime() - before
    expect(ttl).toBeGreaterThan(workspaceSessionHandoffTtlMs - 5_000)
    expect(ttl).toBeLessThanOrEqual(workspaceSessionHandoffTtlMs + 5_000)
    expect(JSON.stringify(fake.rows)).not.toContain(handoff.token)
    expect(fake.audits).toHaveLength(1)
    expect(fake.audits[0]?.action).toBe(
      "auth.workspace_session_handoff.requested"
    )
    expect(JSON.stringify(fake.audits)).not.toContain(handoff.token)
  })

  test("a new handoff supersedes the earlier unconsumed one", async () => {
    const fake = createFakePrisma()
    const first = await createWorkspaceSessionHandoff(
      { tenantId, userId },
      fake.prisma
    )
    const second = await createWorkspaceSessionHandoff(
      { tenantId, userId },
      fake.prisma
    )

    expect(fake.rows[0]?.consumedAt).not.toBeNull()
    expect(fake.rows[1]?.consumedAt).toBeNull()
    await expect(
      consumeWorkspaceSessionHandoff(
        { tenantId, token: first.token },
        fake.prisma
      )
    ).resolves.toBeNull()
    await expect(
      consumeWorkspaceSessionHandoff(
        { tenantId, token: second.token },
        fake.prisma
      )
    ).resolves.toEqual({ challengeId: "challenge-2", userId })
  })

  test("consumes once in one transaction with the audit row", async () => {
    const fake = createFakePrisma()
    const handoff = await createWorkspaceSessionHandoff(
      { tenantId, userId },
      fake.prisma
    )
    fake.calls.length = 0
    fake.audits.length = 0

    await expect(
      consumeWorkspaceSessionHandoff(
        { tenantId, token: handoff.token },
        fake.prisma
      )
    ).resolves.toEqual({ challengeId: "challenge-1", userId })
    expect(fake.calls).toEqual([
      "$transaction",
      "authChallenge.updateManyAndReturn",
      "auditLog.create",
    ])
    expect(fake.audits[0]).toMatchObject({
      action: "auth.workspace_session_handoff.consumed",
      actorUserId: userId,
      entityId: "challenge-1",
      tenantId,
    })
    expect(JSON.stringify(fake.audits)).not.toContain(handoff.token)

    await expect(
      consumeWorkspaceSessionHandoff(
        { tenantId, token: handoff.token },
        fake.prisma
      )
    ).resolves.toBeNull()
    expect(fake.audits).toHaveLength(1)
  })

  test("rejects an expired handoff", async () => {
    const fake = createFakePrisma()
    const handoff = await createWorkspaceSessionHandoff(
      { tenantId, userId },
      fake.prisma
    )
    const row = fake.rows[0]
    if (row) row.expiresAt = new Date(Date.now() - 1_000)

    await expect(
      consumeWorkspaceSessionHandoff(
        { tenantId, token: handoff.token },
        fake.prisma
      )
    ).resolves.toBeNull()
  })

  test("rejects a handoff presented on another tenant", async () => {
    const fake = createFakePrisma()
    const handoff = await createWorkspaceSessionHandoff(
      { tenantId, userId },
      fake.prisma
    )

    await expect(
      consumeWorkspaceSessionHandoff(
        { tenantId: "tenant-b", token: handoff.token },
        fake.prisma
      )
    ).resolves.toBeNull()
    // The wrong-tenant attempt must not burn the owner's token.
    await expect(
      consumeWorkspaceSessionHandoff(
        { tenantId, token: handoff.token },
        fake.prisma
      )
    ).resolves.toEqual({ challengeId: "challenge-1", userId })
  })

  test("rejects empty and oversized tokens without touching the database", async () => {
    const fake = createFakePrisma()

    for (const token of ["", "   ", "x".repeat(129)]) {
      await expect(
        consumeWorkspaceSessionHandoff({ tenantId, token }, fake.prisma)
      ).resolves.toBeNull()
    }
    await expect(
      consumeWorkspaceSessionHandoff(
        { tenantId, token: 42 as unknown as string },
        fake.prisma
      )
    ).resolves.toBeNull()
    expect(fake.calls).toEqual([])
  })
})
