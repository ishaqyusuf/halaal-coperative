import { describe, expect, test } from "bun:test"
import { updateTenantProfile } from "./tenants"

function createTenantProfilePrismaStub({
  initialMigrationStatus = "live_operations",
  startDate = new Date("2025-01-01T00:00:00.000Z"),
}: {
  initialMigrationStatus?: string
  startDate?: Date | null
} = {}) {
  const auditLogCreates: unknown[] = []
  const tenantUpdates: unknown[] = []

  return {
    appliedBackfillMonth: {
      findMany: async () => [],
    },
    auditLog: {
      count: async () => 0,
      create: async (input: unknown) => {
        auditLogCreates.push(input)

        return input
      },
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
    shareBusinessProfitEntry: {
      count: async () => 1,
    },
    tenant: {
      findUnique: async (input: {
        select?: {
          startDate?: boolean
        }
      }) => {
        if (
          input.select?.startDate &&
          Object.keys(input.select).length === 1
        ) {
          return {
            startDate,
          }
        }

        return {
          id: "tenant-1",
          initialMigrationStatus,
          migrationEmergencyUnlockUntil: null,
          migrationFinalizedAt:
            initialMigrationStatus === "finalized" ||
            initialMigrationStatus === "live_operations"
              ? new Date("2026-01-31T00:00:00.000Z")
              : null,
          startDate,
        }
      },
      update: async (input: unknown) => {
        tenantUpdates.push(input)

        return {
          id: "tenant-1",
        }
      },
    },
    tenantShareStructureVersion: {
      count: async () => 1,
    },
    auditLogCreates,
    tenantUpdates,
  }
}

const profileInput = {
  actorUserId: "user-1",
  currentSize: 120,
  memberNumberPrefix: "MBR",
  name: "Halaal Cooperative",
  officeAddress: "Kaduna",
  region: "Kaduna",
  startDate: "2025-01-01",
  tenantId: "tenant-1",
  timezone: "Africa/Lagos",
}

describe("tenant profile migration guards", () => {
  test("blocks finance start date changes after migration finalization", async () => {
    const prisma = createTenantProfilePrismaStub()

    await expect(
      updateTenantProfile(
        {
          ...profileInput,
          startDate: "2025-02-01",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Finance start date is locked")

    expect(prisma.tenantUpdates).toHaveLength(0)
    expect(prisma.auditLogCreates).toHaveLength(0)
  })

  test("allows ordinary profile updates after migration finalization when start date is unchanged", async () => {
    const prisma = createTenantProfilePrismaStub()

    await updateTenantProfile(
      {
        ...profileInput,
        name: "Updated Cooperative",
      },
      prisma as never,
    )

    expect(prisma.tenantUpdates).toHaveLength(1)
    expect(prisma.auditLogCreates).toHaveLength(1)
  })
})
