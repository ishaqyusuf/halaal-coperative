import { describe, expect, test } from "bun:test"
import {
  createMember,
  createMemberDocument,
  updateMember,
  updateMemberDocumentReview,
  updateMemberKyc,
  updateMemberStatus,
} from "./members"

function createMemberPrismaStub({
  appliedBackfillBatches = 0,
  chargeScheduleVersions = 1,
  initialMigrationStatus = "historical_setup_in_progress",
  shareBusinessProfitEntries = 1,
  shareStructureVersions = 1,
  startDate = new Date("2025-01-01T00:00:00.000Z"),
}: {
  appliedBackfillBatches?: number
  chargeScheduleVersions?: number
  initialMigrationStatus?: string
  shareBusinessProfitEntries?: number
  shareStructureVersions?: number
  startDate?: Date | null
} = {}) {
  const memberCreates: unknown[] = []
  const memberDocumentCreates: unknown[] = []
  const memberDocumentLookups: unknown[] = []
  const memberDocumentUpdates: unknown[] = []
  const memberUpdates: unknown[] = []

  const tx = {
    appliedBackfillMonth: {
      findMany: async () => [],
    },
    auditLog: {
      count: async () => 0,
      create: async (input: unknown) => input,
    },
    backfillBatch: {
      count: async () => appliedBackfillBatches,
      findMany: async () => [],
    },
    chargeDefinitionVersion: {
      count: async () => chargeScheduleVersions,
    },
    contributionPlan: {
      create: async (input: unknown) => input,
    },
    legacyLoanMigrationDraft: {
      count: async () => 0,
    },
    loan: {
      count: async () => 0,
    },
    member: {
      create: async (input: {
        data: {
          address?: string | null
          email?: string | null
          fullName: string
          id?: string
          memberNumber: string
          memberType: string
          occupation?: string | null
          phoneNumber?: string | null
        }
      }) => {
        memberCreates.push(input)

        return {
          address: input.data.address ?? null,
          email: input.data.email ?? null,
          fullName: input.data.fullName,
          id: "member-1",
          memberNumber: input.data.memberNumber,
          memberType: input.data.memberType,
          occupation: input.data.occupation ?? null,
          phoneNumber: input.data.phoneNumber ?? null,
        }
      },
      findMany: async () => [],
      update: async (input: unknown) => {
        memberUpdates.push(input)

        return {
          fullName: "Updated Member",
          id: "member-1",
          memberNumber: "MBR-001",
          memberType: "individual",
        }
      },
    },
    memberDocument: {
      create: async (input: unknown) => {
        memberDocumentCreates.push(input)

        return {
          id: "member-document-1",
        }
      },
      findFirst: async (input: unknown) => {
        memberDocumentLookups.push(input)

        return {
          id: "member-document-1",
        }
      },
      update: async (input: unknown) => {
        memberDocumentUpdates.push(input)

        return {
          id: "member-document-1",
        }
      },
    },
    shareBusinessProfitEntry: {
      count: async () => shareBusinessProfitEntries,
    },
    tenant: {
      findUnique: async () => ({
        id: "tenant-1",
        initialMigrationStatus,
        migrationEmergencyUnlockUntil: null,
        migrationFinalizedAt:
          initialMigrationStatus === "live_operations"
            ? new Date("2025-02-01T00:00:00.000Z")
            : null,
        startDate,
      }),
    },
    tenantShareStructureVersion: {
      count: async () => shareStructureVersions,
    },
  }

  return {
    $transaction: async (callback: (tx: typeof tx) => Promise<unknown>) =>
      callback(tx),
    memberDocumentCreates,
    memberDocumentLookups,
    memberDocumentUpdates,
    memberCreates,
    memberUpdates,
  }
}

const memberInput = {
  actorUserId: "user-1",
  fullName: "Aisha Bello",
  joinedAt: new Date("2025-01-01T00:00:00.000Z"),
  memberNumber: "MBR-001",
  memberType: "individual" as const,
  tenantId: "tenant-1",
}

describe("member profile migration guards", () => {
  test("blocks member creation before historical finance setup is complete", async () => {
    const prisma = createMemberPrismaStub({
      chargeScheduleVersions: 0,
    })

    await expect(createMember(memberInput, prisma as never)).rejects.toThrow(
      "Member profiles cannot be created",
    )
    expect(prisma.memberCreates).toHaveLength(0)
  })

  test("blocks member creation after member backfill starts", async () => {
    const prisma = createMemberPrismaStub({
      appliedBackfillBatches: 1,
    })

    await expect(createMember(memberInput, prisma as never)).rejects.toThrow(
      "Member profiles are locked because member ledger backfill",
    )
    expect(prisma.memberCreates).toHaveLength(0)
  })

  test("allows member creation during migration after setup is ready", async () => {
    const prisma = createMemberPrismaStub()

    await createMember(memberInput, prisma as never)

    expect(prisma.memberCreates).toHaveLength(1)
  })

  test("allows member creation after tenant enters live operations", async () => {
    const prisma = createMemberPrismaStub({
      chargeScheduleVersions: 0,
      initialMigrationStatus: "live_operations",
      shareBusinessProfitEntries: 0,
      shareStructureVersions: 0,
      startDate: null,
    })

    await createMember(memberInput, prisma as never)

    expect(prisma.memberCreates).toHaveLength(1)
  })

  test("blocks member updates after member backfill starts", async () => {
    const prisma = createMemberPrismaStub({
      appliedBackfillBatches: 1,
    })

    await expect(
      updateMember(
        "tenant-1",
        "member-1",
        {
          actorUserId: "user-1",
          fullName: "Updated Member",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Member profiles are locked because member ledger backfill")
    expect(prisma.memberUpdates).toHaveLength(0)
  })

  test("blocks member status updates before live operations", async () => {
    const prisma = createMemberPrismaStub()

    await expect(
      updateMemberStatus(
        "tenant-1",
        "member-1",
        "active",
        "user-1",
        prisma as never,
      ),
    ).rejects.toThrow("Live financial record writes are locked")

    expect(prisma.memberUpdates).toHaveLength(0)
  })

  test("blocks member KYC updates before live operations", async () => {
    const prisma = createMemberPrismaStub()

    await expect(
      updateMemberKyc(
        {
          actorUserId: "user-1",
          kycStatus: "verified",
          memberId: "member-1",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Live financial record writes are locked")

    expect(prisma.memberUpdates).toHaveLength(0)
  })

  test("blocks member document creation before live operations", async () => {
    const prisma = createMemberPrismaStub()

    await expect(
      createMemberDocument(
        {
          actorUserId: "user-1",
          documentType: "government_id",
          documentUrl: "https://example.com/id.pdf",
          memberId: "member-1",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Live financial record writes are locked")

    expect(prisma.memberDocumentCreates).toHaveLength(0)
  })

  test("blocks member document review before live operations", async () => {
    const prisma = createMemberPrismaStub()

    await expect(
      updateMemberDocumentReview(
        {
          actorUserId: "user-1",
          documentId: "member-document-1",
          reviewStatus: "approved",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Live financial record writes are locked")

    expect(prisma.memberDocumentLookups).toHaveLength(0)
    expect(prisma.memberDocumentUpdates).toHaveLength(0)
  })
})
