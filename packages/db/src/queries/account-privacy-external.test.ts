import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import type { PrismaClient } from "../../generated/prisma/client"
import {
  ACCOUNT_DELETION_NOTICE_VERSION,
  beginExternalAccountDeletion,
  confirmExternalAccountDeletion,
  discardUndeliveredAccountDeletionChallenge,
  privacyChallengeTokenHash,
  privacyRecipientEmailHash,
} from "./account-privacy"
const original = process.env.PRIVACY_REQUEST_CHALLENGE_SECRET
beforeAll(() => {
  process.env.PRIVACY_REQUEST_CHALLENGE_SECRET =
    "unit-test-privacy-challenge-secret-2026"
})
afterAll(() => {
  if (original === undefined)
    delete process.env.PRIVACY_REQUEST_CHALLENGE_SECRET
  else process.env.PRIVACY_REQUEST_CHALLENGE_SECRET = original
})
const token = "test-token-with-enough-entropy-for-the-hash"
function database(
  options: {
    found?: boolean
    currentEmail?: string
    expired?: boolean
    consumed?: boolean
    ambiguous?: boolean
    targetTenantId?: string
    matchingTenantIds?: string[]
    priorRequest?: boolean
  } = {}
) {
  const writes: string[] = []
  const reads: unknown[] = []
  let createdChallengeTenantId: string | undefined
  const targetTenantId = options.targetTenantId ?? "tenant-a"
  const user = {
    id: "user-a",
    tenantId: "tenant-a",
    email: options.currentEmail ?? "owner@example.test",
    fullName: "Owner",
    memberships: (options.matchingTenantIds ?? [targetTenantId]).map(
      (tenantId) => ({ tenantId, tenant: { name: "Amanah" } })
    ),
    memberProfile: null,
    deletedAt: null,
  }
  const challenge = {
    id: "challenge-a",
    tenantId: targetTenantId,
    userId: "user-a",
    purpose: "account_deletion_email",
    evidenceHash: privacyChallengeTokenHash(token),
    recipientEmailHash: privacyRecipientEmailHash("owner@example.test"),
    attemptCount: 0,
    maxAttempts: 5,
    expiresAt: options.expired ? new Date(0) : new Date(Date.now() + 100000),
    consumedAt: options.consumed ? new Date() : null,
  }
  const tx = {
    user: {
      findMany: async (args: unknown) => {
        reads.push(args)
        return options.found === false
          ? []
          : options.ambiguous
            ? [user, user]
            : [user]
      },
      findFirst: async (args: unknown) => {
        reads.push(args)
        return options.found === false ? null : user
      },
    },
    authChallenge: {
      findFirst: async () => challenge,
      create: async (args: { data: { tenantId: string } }) => {
        createdChallengeTenantId = args.data.tenantId
        writes.push("challenge")
        return { id: challenge.id }
      },
      updateMany: async () => {
        writes.push("consume-or-failed-attempt")
        return { count: 1 }
      },
      deleteMany: async (input: {
        where: { id: string; purpose: string; consumedAt: null }
      }) => {
        writes.push("discard")
        expect(input.where).toEqual({
          id: "challenge-a",
          purpose: "account_deletion_email",
          consumedAt: null,
        })
        return { count: 1 }
      },
    },
    accountPrivacyRequest: {
      findFirst: async () =>
        options.priorRequest
          ? { id: "request-existing", status: "submitted" }
          : null,
      create: async () => {
        writes.push("request")
        return { id: "request-a" }
      },
    },
    supportCase: {
      create: async () => {
        writes.push("support")
        return { id: "case-a" }
      },
    },
    auditLog: {
      create: async () => {
        writes.push("audit")
        return {}
      },
    },
  }
  const db = {
    ...tx,
    $transaction: async (fn: (value: typeof tx) => unknown) => fn(tx),
  } as unknown as PrismaClient
  return {
    db,
    writes,
    reads,
    getCreatedChallengeTenantId: () => createdChallengeTenantId,
  }
}
describe("external email-verified deletion request", () => {
  it("discards only the pending challenge after an undelivered email", async () => {
    const state = database()
    await discardUndeliveredAccountDeletionChallenge("challenge-a", state.db)
    expect(state.writes).toEqual(["discard"])
  })
  it("creates a challenge only for an existing workspace account, without disclosing other users", async () => {
    const absent = database({ found: false })
    expect(
      await beginExternalAccountDeletion(
        {
          email: "unknown@example.test",
          workspaceSlug: "amanah",
          tokenHash: privacyChallengeTokenHash(token),
          expiresAt: new Date(Date.now() + 100000),
        },
        absent.db
      )
    ).toBeNull()
    expect(absent.writes).toEqual([])
    const known = database()
    const result = await beginExternalAccountDeletion(
      {
        email: "owner@example.test",
        workspaceSlug: "amanah",
        tokenHash: privacyChallengeTokenHash(token),
        expiresAt: new Date(Date.now() + 100000),
      },
      known.db
    )
    expect(result?.challengeId).toBe("challenge-a")
    expect(known.writes).toEqual(["challenge"])
    expect(known.reads[0]).toMatchObject({
      where: {
        memberships: {
          some: {
            tenant: {
              OR: [
                { slug: "amanah" },
                {
                  domains: {
                    some: {
                      hostname: "amanah",
                      verificationStatus: "verified",
                    },
                  },
                },
              ],
            },
          },
        },
      },
      take: 2,
    })
  })
  it("resolves a verified custom domain only within the matching membership", async () => {
    const state = database({ targetTenantId: "tenant-b" })
    await beginExternalAccountDeletion(
      {
        email: "owner@example.test",
        workspaceSlug: "cooperative.ng",
        tokenHash: privacyChallengeTokenHash(token),
        expiresAt: new Date(Date.now() + 100000),
      },
      state.db
    )
    expect(state.reads[0]).toMatchObject({
      where: {
        memberships: {
          some: {
            tenant: {
              OR: [
                { slug: "cooperative.ng" },
                {
                  domains: {
                    some: {
                      hostname: "cooperative.ng",
                      verificationStatus: "verified",
                    },
                  },
                },
              ],
            },
          },
        },
      },
    })
    expect(state.reads[0]).toMatchObject({
      select: {
        memberships: {
          where: {
            tenant: {
              OR: [
                { slug: "cooperative.ng" },
                {
                  domains: {
                    some: {
                      hostname: "cooperative.ng",
                      verificationStatus: "verified",
                    },
                  },
                },
              ],
            },
          },
        },
      },
    })
    expect(state.getCreatedChallengeTenantId()).toBe("tenant-b")
  })
  it("uses a secondary workspace membership and refuses ambiguous accounts", async () => {
    const input = {
      email: "owner@example.test",
      workspaceSlug: "amanah",
      tokenHash: privacyChallengeTokenHash(token),
      expiresAt: new Date(Date.now() + 100000),
    }
    const secondary = database({ targetTenantId: "tenant-b" })
    await beginExternalAccountDeletion(input, secondary.db)
    expect(secondary.getCreatedChallengeTenantId()).toBe("tenant-b")
    await confirmExternalAccountDeletion(
      {
        challengeId: "challenge-a",
        token,
        noticeVersion: ACCOUNT_DELETION_NOTICE_VERSION,
      },
      secondary.db
    )
    expect(secondary.reads).toContainEqual({
      where: {
        id: "user-a",
        deletedAt: null,
        memberships: { some: { tenantId: "tenant-b" } },
      },
      select: { email: true },
    })
    const ambiguous = database({ ambiguous: true })
    expect(await beginExternalAccountDeletion(input, ambiguous.db)).toBeNull()
    expect(ambiguous.writes).toEqual([])
  })
  it("refuses a workspace identifier matching two tenants for the same account", async () => {
    const state = database({ matchingTenantIds: ["tenant-a", "tenant-b"] })
    expect(
      await beginExternalAccountDeletion(
        {
          email: "owner@example.test",
          workspaceSlug: "amanah",
          tokenHash: privacyChallengeTokenHash(token),
          expiresAt: new Date(Date.now() + 100000),
        },
        state.db
      )
    ).toBeNull()
    expect(state.writes).toEqual([])
  })
  it("accepts multiple roles in the same matching tenant", async () => {
    const state = database({ matchingTenantIds: ["tenant-a", "tenant-a"] })
    const result = await beginExternalAccountDeletion(
      {
        email: "owner@example.test",
        workspaceSlug: "amanah",
        tokenHash: privacyChallengeTokenHash(token),
        expiresAt: new Date(Date.now() + 100000),
      },
      state.db
    )
    expect(result?.challengeId).toBe("challenge-a")
    expect(state.getCreatedChallengeTenantId()).toBe("tenant-a")
  })
  it("rejects invalid, expired, used, and changed-email links before creating any request", async () => {
    for (const options of [
      { expired: true },
      { consumed: true },
      { currentEmail: "changed@example.test" },
    ]) {
      const state = database(options)
      await expect(
        confirmExternalAccountDeletion(
          {
            challengeId: "challenge-a",
            token,
            noticeVersion: ACCOUNT_DELETION_NOTICE_VERSION,
          },
          state.db
        )
      ).rejects.toThrow("invalid or expired")
      expect(state.writes).toEqual([])
    }
    const wrong = database()
    await expect(
      confirmExternalAccountDeletion(
        {
          challengeId: "challenge-a",
          token: "wrong-token",
          noticeVersion: ACCOUNT_DELETION_NOTICE_VERSION,
        },
        wrong.db
      )
    ).rejects.toThrow("invalid or expired")
    expect(wrong.writes).toEqual(["consume-or-failed-attempt"])
  })
  it("creates the tracked request and consumes the link in one serializable transaction", async () => {
    const state = database()
    expect(
      await confirmExternalAccountDeletion(
        {
          challengeId: "challenge-a",
          token,
          noticeVersion: ACCOUNT_DELETION_NOTICE_VERSION,
        },
        state.db
      )
    ).toEqual({ requestId: "request-a" })
    expect(state.writes).toEqual([
      "support",
      "request",
      "audit",
      "consume-or-failed-attempt",
    ])
  })

  it("consumes a fresh verified link without duplicating an active request", async () => {
    const state = database({ priorRequest: true })
    expect(
      await confirmExternalAccountDeletion(
        {
          challengeId: "challenge-a",
          token,
          noticeVersion: ACCOUNT_DELETION_NOTICE_VERSION,
        },
        state.db
      )
    ).toEqual({ requestId: "request-existing", status: "submitted" })
    expect(state.writes).toEqual(["consume-or-failed-attempt"])
  })
})
