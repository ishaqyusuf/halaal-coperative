import { describe, expect, test } from "bun:test"
import {
  createMemberSignupLink,
  rotateMemberSignupLinkToken,
  setMemberSignupLinkEnabled,
  updateMemberSignupLink,
  updateTenantMemberSignupSettings,
} from "./member-signup-links"

function createLockedSignupLinksPrismaStub() {
  const linkCreates: unknown[] = []
  const linkLookups: unknown[] = []
  const linkUpdates: unknown[] = []
  const policyUpserts: unknown[] = []

  return {
    appliedBackfillMonth: {
      findMany: async () => [],
    },
    auditLog: {
      count: async () => 0,
    },
    backfillBatch: {
      count: async () => 0,
      findMany: async () => [],
    },
    chargeDefinitionVersion: {
      count: async () => 1,
    },
    legacyLoanMigrationDraft: {
      count: async () => 0,
    },
    loan: {
      count: async () => 0,
    },
    member: {
      findMany: async () => [],
    },
    memberSignupLink: {
      create: async (input: unknown) => {
        linkCreates.push(input)

        return {
          id: "signup-link-1",
        }
      },
      findFirst: async (input: unknown) => {
        linkLookups.push(input)

        return {
          id: "signup-link-1",
        }
      },
      update: async (input: unknown) => {
        linkUpdates.push(input)

        return {
          id: "signup-link-1",
          isEnabled: true,
          maxSignups: null,
          name: "Remote signup",
          tokenVersion: 2,
        }
      },
    },
    shareBusinessProfitEntry: {
      count: async () => 1,
    },
    tenant: {
      findUnique: async () => ({
        id: "tenant-1",
        initialMigrationStatus: "historical_setup_in_progress",
        migrationEmergencyUnlockUntil: null,
        migrationFinalizedAt: null,
        startDate: new Date("2025-01-01T00:00:00.000Z"),
      }),
    },
    tenantPolicy: {
      upsert: async (input: unknown) => {
        policyUpserts.push(input)

        return {
          id: "tenant-policy-1",
        }
      },
    },
    tenantShareStructureVersion: {
      count: async () => 1,
    },
    linkCreates,
    linkLookups,
    linkUpdates,
    policyUpserts,
  }
}

describe("member signup link live write guards", () => {
  test("blocks signup access settings before live operations", async () => {
    const prisma = createLockedSignupLinksPrismaStub()

    await expect(
      updateTenantMemberSignupSettings(
        {
          actorUserId: "user-1",
          memberSignupAccessMode: "public",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Live financial record writes are locked")

    expect(prisma.policyUpserts).toHaveLength(0)
  })

  test("blocks signup link creation before live operations", async () => {
    const prisma = createLockedSignupLinksPrismaStub()

    await expect(
      createMemberSignupLink(
        {
          actorUserId: "user-1",
          name: "Remote signup",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Live financial record writes are locked")

    expect(prisma.linkCreates).toHaveLength(0)
  })

  test("blocks signup link updates before live operations", async () => {
    const prisma = createLockedSignupLinksPrismaStub()

    await expect(
      updateMemberSignupLink(
        {
          actorUserId: "user-1",
          linkId: "signup-link-1",
          name: "Updated remote signup",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Live financial record writes are locked")

    expect(prisma.linkLookups).toHaveLength(0)
    expect(prisma.linkUpdates).toHaveLength(0)
  })

  test("blocks signup link enable toggles before live operations", async () => {
    const prisma = createLockedSignupLinksPrismaStub()

    await expect(
      setMemberSignupLinkEnabled(
        {
          actorUserId: "user-1",
          enabled: false,
          linkId: "signup-link-1",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Live financial record writes are locked")

    expect(prisma.linkLookups).toHaveLength(0)
    expect(prisma.linkUpdates).toHaveLength(0)
  })

  test("blocks signup link token rotation before live operations", async () => {
    const prisma = createLockedSignupLinksPrismaStub()

    await expect(
      rotateMemberSignupLinkToken(
        {
          actorUserId: "user-1",
          linkId: "signup-link-1",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Live financial record writes are locked")

    expect(prisma.linkLookups).toHaveLength(0)
    expect(prisma.linkUpdates).toHaveLength(0)
  })
})
