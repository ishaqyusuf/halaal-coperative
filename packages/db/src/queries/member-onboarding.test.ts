import { describe, expect, test } from "bun:test"
import {
  approveMemberOnboardingRequest,
  createMemberOnboardingRequest,
  rejectMemberOnboardingRequest,
  verifyMemberOnboardingRequest,
} from "./member-onboarding"

function createLockedMigrationApprovalPrismaStub() {
  const onboardingRequestFindFirstCalls: unknown[] = []

  const tx = {
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
      count: async () => 0,
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
    memberOnboardingRequest: {
      findFirst: async (input: unknown) => {
        onboardingRequestFindFirstCalls.push(input)
        return null
      },
    },
    shareBusinessProfitEntry: {
      count: async () => 0,
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
    tenantShareStructureVersion: {
      count: async () => 0,
    },
  }

  return {
    $transaction: async (callback: (tx: typeof tx) => Promise<unknown>) =>
      callback(tx),
    onboardingRequestFindFirstCalls,
  }
}

function createLockedOnboardingWritePrismaStub() {
  const transactions: unknown[] = []
  const userCreates: unknown[] = []
  const requestCreates: unknown[] = []
  const requestUpdates: unknown[] = []

  const tx = {
    auditLog: {
      create: async (input: unknown) => input,
    },
    member: {
      findFirst: async () => null,
    },
    memberOnboardingRequest: {
      create: async (input: unknown) => {
        requestCreates.push(input)

        return {
          id: "request-1",
        }
      },
      findFirst: async () => ({
        id: "request-1",
        status: "pending_email_verification",
        userId: "user-1",
      }),
      update: async (input: unknown) => {
        requestUpdates.push(input)

        return input
      },
    },
    user: {
      create: async (input: unknown) => {
        userCreates.push(input)

        return {
          id: "user-1",
        }
      },
    },
  }

  return {
    $transaction: async (callback: (tx: typeof tx) => Promise<unknown>) => {
      transactions.push(callback)

      return callback(tx)
    },
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
      count: async () => 0,
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
    shareBusinessProfitEntry: {
      count: async () => 0,
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
    tenantShareStructureVersion: {
      count: async () => 0,
    },
    requestCreates,
    requestUpdates,
    transactions,
    userCreates,
  }
}

describe("member onboarding approval", () => {
  test("blocks onboarding request creation before initial migration is finalized", async () => {
    const prisma = createLockedOnboardingWritePrismaStub()

    await expect(
      createMemberOnboardingRequest(
        {
          email: "aisha@example.com",
          fullName: "Aisha Bello",
          memberNumber: "MBR-001",
          passwordHash: "hashed-password",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Member onboarding writes are locked")

    expect(prisma.transactions).toHaveLength(0)
    expect(prisma.userCreates).toHaveLength(0)
    expect(prisma.requestCreates).toHaveLength(0)
  })

  test("blocks onboarding email verification before initial migration is finalized", async () => {
    const prisma = createLockedOnboardingWritePrismaStub()

    await expect(
      verifyMemberOnboardingRequest(
        {
          requestId: "request-1",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Member onboarding writes are locked")

    expect(prisma.transactions).toHaveLength(0)
    expect(prisma.requestUpdates).toHaveLength(0)
  })

  test("blocks approval before initial migration is finalized", async () => {
    const prisma = createLockedMigrationApprovalPrismaStub()

    await expect(
      approveMemberOnboardingRequest(
        {
          actorUserId: "user-1",
          requestId: "request-1",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("locked until initial migration is finalized")
    expect(prisma.onboardingRequestFindFirstCalls).toHaveLength(0)
  })

  test("blocks onboarding rejection before initial migration is finalized", async () => {
    const prisma = createLockedOnboardingWritePrismaStub()

    await expect(
      rejectMemberOnboardingRequest(
        {
          actorUserId: "user-1",
          reason: "Incomplete profile",
          requestId: "request-1",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Member onboarding writes are locked")

    expect(prisma.transactions).toHaveLength(0)
    expect(prisma.requestUpdates).toHaveLength(0)
  })
})
