import { describe, expect, test } from "bun:test"
import {
  createHistoricalMemberSharePurchase,
  listHistoricalMemberSharePurchases,
} from "./historical-share-purchases"

function purchaseRow(overrides: Record<string, unknown> = {}) {
  return {
    createdAt: new Date("2026-07-11T10:00:00.000Z"),
    createdByUserId: "user-1",
    id: "share-purchase-1",
    member: {
      fullName: "Aisha Bello",
      memberNumber: "M-001",
    },
    memberId: "member-1",
    notes: "Receipt 18",
    paidAt: new Date("2025-03-15T00:00:00.000Z"),
    postedShareLedgerEntryId: "share-ledger-1",
    shareCapitalAmount: 30000,
    shareUnits: 3,
    tenantId: "tenant-1",
    unitAmountSnapshot: 10000,
    updatedAt: new Date("2026-07-11T10:00:00.000Z"),
    ...overrides,
  }
}

function createPrismaStub({
  memberBelongsToTenant = true,
  shareConfigurationMode = "unit_based",
}: {
  memberBelongsToTenant?: boolean
  shareConfigurationMode?: string
} = {}) {
  const auditLogCreates: unknown[] = []
  const ledgerCreates: unknown[] = []
  const purchaseCreates: unknown[] = []
  const purchaseUpdates: unknown[] = []

  const tx = {
    auditLog: {
      count: async () => 1,
      create: async (input: unknown) => {
        auditLogCreates.push(input)
        return input
      },
    },
    historicalMemberSharePurchase: {
      create: async (input: any) => {
        purchaseCreates.push(input)
        return purchaseRow({
          ...input.data,
          id: "share-purchase-1",
          postedShareLedgerEntryId: null,
        })
      },
      findMany: async () => [purchaseRow()],
      update: async (input: any) => {
        purchaseUpdates.push(input)
        return purchaseRow(input.data)
      },
    },
    member: {
      findFirst: async () =>
        memberBelongsToTenant ? { id: "member-1" } : null,
    },
    memberShareLedgerEntry: {
      create: async (input: any) => {
        ledgerCreates.push(input)
        return {
          id: "share-ledger-1",
          ...input.data,
        }
      },
    },
    tenantPolicy: {
      findUnique: async () => ({
        shareConfigurationMode,
        shareUnitAmount: 10000,
      }),
    },
  }

  return {
    ...tx,
    $transaction: async (callback: (transaction: typeof tx) => Promise<unknown>) =>
      callback(tx),
    auditLogCreates,
    ledgerCreates,
    purchaseCreates,
    purchaseUpdates,
  }
}

describe("historical member share purchases", () => {
  test("lists purchases within tenant and member scope", async () => {
    const prisma = createPrismaStub()
    const rows = await listHistoricalMemberSharePurchases(
      {
        memberId: "member-1",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      memberId: "member-1",
      shareCapitalAmount: 30000,
      shareUnits: 3,
      tenantId: "tenant-1",
      unitAmountSnapshot: 10000,
    })
  })

  test("creates a unit-share purchase and posts a backfill ledger entry", async () => {
    const prisma = createPrismaStub()
    const purchase = await createHistoricalMemberSharePurchase(
      {
        actorUserId: "user-1",
        memberId: "member-1",
        notes: "Receipt 18",
        paidAt: new Date("2025-03-15T18:30:00.000Z"),
        shareUnits: 3,
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(purchase).toMatchObject({
      paidAt: new Date("2025-03-15T00:00:00.000Z"),
      postedShareLedgerEntryId: "share-ledger-1",
      shareCapitalAmount: 30000,
      shareUnits: 3,
      unitAmountSnapshot: 10000,
    })
    expect(prisma.purchaseCreates[0]).toMatchObject({
      data: {
        memberId: "member-1",
        notes: "Receipt 18",
        shareCapitalAmount: 30000,
        shareUnits: 3,
        tenantId: "tenant-1",
        unitAmountSnapshot: 10000,
      },
    })
    expect(prisma.ledgerCreates[0]).toMatchObject({
      data: {
        amount: 30000,
        memberId: "member-1",
        sourceId: "share-purchase-1",
        sourceType: "backfill",
        tenantId: "tenant-1",
      },
    })
    expect(prisma.auditLogCreates[0]).toMatchObject({
      data: {
        action: "migration.share_purchase.created",
        actorUserId: "user-1",
        entityId: "share-purchase-1",
        entityType: "HistoricalMemberSharePurchase",
        metadata: {
          postedShareLedgerEntryId: "share-ledger-1",
          shareCapitalAmount: 30000,
          shareUnits: 3,
          unitAmountSnapshot: 10000,
        },
        tenantId: "tenant-1",
      },
    })
  })

  test("rejects non-positive share units", async () => {
    const prisma = createPrismaStub()

    await expect(
      createHistoricalMemberSharePurchase(
        {
          actorUserId: "user-1",
          memberId: "member-1",
          paidAt: new Date("2025-03-15T00:00:00.000Z"),
          shareUnits: 0,
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("Share units must be a positive whole number")

    expect(prisma.purchaseCreates).toHaveLength(0)
  })

  test("rejects amount-based share tenants", async () => {
    const prisma = createPrismaStub({
      shareConfigurationMode: "monthly_history",
    })

    await expect(
      createHistoricalMemberSharePurchase(
        {
          actorUserId: "user-1",
          memberId: "member-1",
          paidAt: new Date("2025-03-15T00:00:00.000Z"),
          shareUnits: 3,
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("unit-based share configuration")

    expect(prisma.purchaseCreates).toHaveLength(0)
  })
})
