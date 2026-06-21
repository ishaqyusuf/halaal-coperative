import { describe, expect, test } from "bun:test"
import {
  applyCharge,
  createChargeDefinition,
  updateChargeDefinition,
} from "./charges"

function createChargePrismaStub({
  appliedBackfillBatches = 0,
  initialMigrationStatus = "historical_setup_in_progress",
}: {
  appliedBackfillBatches?: number
  initialMigrationStatus?: string
} = {}) {
  const chargeDefinitionCreates: unknown[] = []
  const chargeDefinitionLookups: unknown[] = []
  const chargeDefinitionUpdates: unknown[] = []
  const chargeDefinitionVersionCreates: unknown[] = []
  const ledgerLookups: unknown[] = []

  const tx = {
    chargeDefinition: {
      create: async (input: unknown) => {
        chargeDefinitionCreates.push(input)

        return {
          id: "charge-definition-1",
        }
      },
      findFirst: async () => ({
        id: "charge-definition-1",
        amount: 100,
        chargeValueType: "fixed_amount",
        kind: "fixed",
      }),
      update: async (input: unknown) => {
        chargeDefinitionUpdates.push(input)

        return {
          id: "charge-definition-1",
        }
      },
    },
    chargeDefinitionVersion: {
      create: async (input: unknown) => {
        chargeDefinitionVersionCreates.push(input)
        return input
      },
      findFirst: async () => ({
        amount: 150,
        chargeValueType: "fixed_amount",
        kind: "fixed",
      }),
    },
  }

  return {
    $transaction: async (callback: (tx: typeof tx) => Promise<unknown>) =>
      callback(tx),
    appliedBackfillMonth: {
      findMany: async () => [],
    },
    auditLog: {
      count: async () => 0,
    },
    backfillBatch: {
      count: async () => appliedBackfillBatches,
      findMany: async () => [],
    },
    chargeDefinition: {
      findFirst: async (input: unknown) => {
        chargeDefinitionLookups.push(input)
        return null
      },
    },
    chargeDefinitionVersion: {
      count: async () => 1,
    },
    ledgerAccount: {
      findUnique: async (input: unknown) => {
        ledgerLookups.push(input)
        return null
      },
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
      findUnique: async () => ({
        id: "tenant-1",
        initialMigrationStatus,
        migrationEmergencyUnlockUntil: null,
        migrationFinalizedAt:
          initialMigrationStatus === "finalized" ||
          initialMigrationStatus === "live_operations"
            ? new Date("2026-01-31T00:00:00.000Z")
            : null,
        startDate: new Date("2025-01-01T00:00:00.000Z"),
      }),
    },
    tenantShareStructureVersion: {
      count: async () => 1,
    },
    chargeDefinitionCreates,
    chargeDefinitionLookups,
    chargeDefinitionUpdates,
    chargeDefinitionVersionCreates,
    ledgerLookups,
  }
}

describe("charge migration guards", () => {
  test("blocks historical charge setup after migration finalization", async () => {
    const prisma = createChargePrismaStub({
      initialMigrationStatus: "finalized",
    })

    await expect(
      createChargeDefinition(
        {
          amount: 100,
          code: "ADMIN",
          effectiveFrom: new Date("2025-01-01T00:00:00.000Z"),
          kind: "fixed",
          name: "Admin levy",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Charge definition writes are locked")

    expect(prisma.chargeDefinitionCreates).toHaveLength(0)
  })

  test("allows new live charge definitions after go-live when not backdated", async () => {
    const prisma = createChargePrismaStub({
      initialMigrationStatus: "live_operations",
    })

    await createChargeDefinition(
      {
        amount: 100,
        code: "ADMIN",
        effectiveFrom: new Date("2099-01-01T00:00:00.000Z"),
        kind: "fixed",
        name: "Admin levy",
        tenantId: "tenant-1",
      },
      prisma as never,
    )

    expect(prisma.chargeDefinitionCreates).toHaveLength(1)
    expect(prisma.chargeDefinitionVersionCreates).toHaveLength(1)
  })

  test("blocks backdated live charge definitions after go-live", async () => {
    const prisma = createChargePrismaStub({
      initialMigrationStatus: "live_operations",
    })

    await expect(
      createChargeDefinition(
        {
          amount: 100,
          code: "ADMIN",
          effectiveFrom: new Date("2025-01-01T00:00:00.000Z"),
          kind: "fixed",
          name: "Admin levy",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("cannot be backdated")

    expect(prisma.chargeDefinitionCreates).toHaveLength(0)
  })

  test("blocks live charge application before live operations", async () => {
    const prisma = createChargePrismaStub()

    await expect(
      applyCharge(
        {
          actorUserId: "user-1",
          amount: 100,
          assessedAt: new Date("2025-02-01T00:00:00.000Z"),
          chargeDefinitionId: "charge-definition-1",
          memberId: "member-1",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Live financial record writes are locked")

    expect(prisma.chargeDefinitionLookups).toHaveLength(0)
    expect(prisma.ledgerLookups).toHaveLength(0)
  })

  test("blocks historical charge setup after member backfill starts", async () => {
    const prisma = createChargePrismaStub({
      appliedBackfillBatches: 1,
    })

    await expect(
      createChargeDefinition(
        {
          amount: 100,
          code: "ADMIN",
          effectiveFrom: new Date("2025-01-01T00:00:00.000Z"),
          kind: "fixed",
          name: "Admin levy",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("member ledger backfill has already started")

    expect(prisma.chargeDefinitionCreates).toHaveLength(0)
  })

  test("allows live charge activation changes after go-live", async () => {
    const prisma = createChargePrismaStub({
      initialMigrationStatus: "live_operations",
    })

    await updateChargeDefinition(
      "tenant-1",
      "charge-definition-1",
      {
        isActive: false,
      },
      prisma as never,
    )

    expect(prisma.chargeDefinitionUpdates).toHaveLength(1)
    expect(prisma.chargeDefinitionVersionCreates).toHaveLength(0)
  })

  test("blocks backdated live charge amount updates after go-live", async () => {
    const prisma = createChargePrismaStub({
      initialMigrationStatus: "live_operations",
    })

    await expect(
      updateChargeDefinition(
        "tenant-1",
        "charge-definition-1",
        {
          amount: 150,
          effectiveFrom: new Date("2025-01-01T00:00:00.000Z"),
        },
        prisma as never,
      ),
    ).rejects.toThrow("cannot be backdated")

    expect(prisma.chargeDefinitionVersionCreates).toHaveLength(0)
  })

  test("allows backfill charge posting through the live-write guard", async () => {
    const prisma = createChargePrismaStub()

    await expect(
      applyCharge(
        {
          actorUserId: "user-1",
          amount: 100,
          assessedAt: new Date("2025-02-01T00:00:00.000Z"),
          chargeDefinitionId: "charge-definition-1",
          memberId: "member-1",
          sourceType: "backfill",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Charge definition not found")

    expect(prisma.chargeDefinitionLookups).toHaveLength(1)
    expect(prisma.ledgerLookups).toHaveLength(0)
  })

  test("allows import charge posting through the live-write guard", async () => {
    const prisma = createChargePrismaStub()

    await expect(
      applyCharge(
        {
          actorUserId: "user-1",
          amount: 100,
          assessedAt: new Date("2025-02-01T00:00:00.000Z"),
          chargeDefinitionId: "charge-definition-1",
          memberId: "member-1",
          sourceType: "import",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("Charge definition not found")

    expect(prisma.chargeDefinitionLookups).toHaveLength(1)
    expect(prisma.ledgerLookups).toHaveLength(0)
  })
})
