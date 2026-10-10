import { describe, expect, test } from "bun:test"
import type { PrismaClient } from "../../generated/prisma/client"
import {
  enforceAuthRateLimits,
  evaluateAuthChallengeState,
} from "./mobile-account-access"

const valid = {
  attemptCount: 0,
  consumedAt: null,
  evidenceHash: "aa".repeat(32),
  expiresAt: new Date("2026-08-12T12:30:00.000Z"),
  maxAttempts: 5,
  now: new Date("2026-08-12T12:00:00.000Z"),
  receivedEvidenceHash: "aa".repeat(32),
}

describe("mobile account access evidence", () => {
  test("accepts current matching evidence", () => {
    expect(evaluateAuthChallengeState(valid)).toBe("valid")
  })

  test("rejects expired, replayed, exhausted, and mismatched evidence", () => {
    expect(
      evaluateAuthChallengeState({
        ...valid,
        expiresAt: new Date("2026-08-12T11:59:59.000Z"),
      })
    ).toBe("expired")
    expect(
      evaluateAuthChallengeState({ ...valid, consumedAt: valid.now })
    ).toBe("consumed")
    expect(evaluateAuthChallengeState({ ...valid, attemptCount: 5 })).toBe(
      "attempts_exhausted"
    )
    expect(
      evaluateAuthChallengeState({
        ...valid,
        receivedEvidenceHash: "bb".repeat(32),
      })
    ).toBe("invalid")
  })

  test("persists the bounded counter before reporting throttling", async () => {
    let attemptCount = 0
    const prisma = {
      $transaction: async (callback: (tx: unknown) => unknown) => callback(prisma),
      authRateLimitBucket: {
        deleteMany: async () => ({ count: 0 }),
        upsert: async () => ({ attemptCount: ++attemptCount }),
      },
    } as unknown as PrismaClient
    const input = {
      now: new Date("2026-08-12T12:00:00.000Z"),
      operation: "test",
      rules: [
        {
          limit: 1,
          signalHash: "cc".repeat(32),
          signalType: "account" as const,
          windowMs: 60_000,
        },
      ],
      tenantId: "tenant-test",
    }

    await expect(enforceAuthRateLimits(input, prisma)).resolves.toEqual({
      allowed: true,
    })
    await expect(enforceAuthRateLimits(input, prisma)).rejects.toThrow(
      "Rate limit exceeded"
    )
    expect(attemptCount).toBe(2)
  })
})
