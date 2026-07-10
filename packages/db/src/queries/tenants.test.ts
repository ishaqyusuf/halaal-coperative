import { describe, expect, test } from "bun:test"
import {
  resolveTenantState,
  updateTenantProfile,
  updateTenantTrustProfile,
} from "./tenants"

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
  city: "Kaduna North",
  country: "Nigeria",
  currentSize: 120,
  memberNumberPrefix: "MBR",
  name: "Halaal Cooperative",
  officeAddress: "Kaduna",
  region: "Kaduna",
  state: "Kaduna",
  startDate: "2025-01-01",
  tenantId: "tenant-1",
  timezone: "Africa/Lagos",
}

function createTenantTrustPrismaStub() {
  const auditLogCreates: unknown[] = []
  const tenantUpdates: unknown[] = []

  return {
    auditLog: {
      create: async (input: unknown) => {
        auditLogCreates.push(input)

        return input
      },
    },
    tenant: {
      update: async (input: {
        data: Record<string, unknown>
      }) => {
        tenantUpdates.push(input)

        return input.data
      },
    },
    auditLogCreates,
    tenantUpdates,
  }
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

  test("persists location fields and mirrors state into region", async () => {
    const prisma = createTenantProfilePrismaStub()

    await updateTenantProfile(
      {
        ...profileInput,
        city: " Kaduna North ",
        country: " Nigeria ",
        region: "Legacy Region",
        state: " Kaduna ",
      },
      prisma as never,
    )

    const update = prisma.tenantUpdates[0] as {
      data: Record<string, unknown>
    }
    const audit = prisma.auditLogCreates[0] as {
      data: {
        metadata: Record<string, unknown>
      }
    }

    expect(update.data).toMatchObject({
      city: "Kaduna North",
      country: "Nigeria",
      region: "Kaduna",
      state: "Kaduna",
    })
    expect(audit.data.metadata).toMatchObject({
      city: "Kaduna North",
      country: "Nigeria",
      region: "Kaduna",
      state: "Kaduna",
    })
  })

  test("maps existing region as the state display fallback", () => {
    expect(resolveTenantState({ region: "Kaduna", state: null })).toBe(
      "Kaduna",
    )
  })

  test("uses legacy region as the stored state when no state is supplied", async () => {
    const prisma = createTenantProfilePrismaStub()

    await updateTenantProfile(
      {
        ...profileInput,
        region: "Kaduna",
        state: null,
      },
      prisma as never,
    )

    const update = prisma.tenantUpdates[0] as {
      data: Record<string, unknown>
    }

    expect(update.data).toMatchObject({
      region: "Kaduna",
      state: "Kaduna",
    })
  })
})

describe("tenant trust profile", () => {
  test("normalizes legal, incident, and recovery evidence with audit metadata", async () => {
    const prisma = createTenantTrustPrismaStub()

    const profile = await updateTenantTrustProfile(
      {
        actorUserId: "user-1",
        backupRetentionNote: " Daily managed backups ",
        dataProcessingUrl: "https://example.com/dpa",
        incidentContactEmail: "TRUST@EXAMPLE.COM",
        incidentContactName: " Risk Desk ",
        legalTermsUrl: "https://example.com/terms",
        privacyPolicyUrl: "https://example.com/privacy",
        recoveryPointObjective: "24 hours",
        recoveryTimeObjective: "2 business days",
        tenantId: "tenant-1",
      },
      prisma as never,
    )

    expect(profile).toMatchObject({
      backupRetentionNote: "Daily managed backups",
      dataProcessingUrl: "https://example.com/dpa",
      incidentContactEmail: "trust@example.com",
      incidentContactName: "Risk Desk",
      legalTermsUrl: "https://example.com/terms",
      privacyPolicyUrl: "https://example.com/privacy",
      recoveryPointObjective: "24 hours",
      recoveryTimeObjective: "2 business days",
      reviewedByUserId: "user-1",
    })
    expect(profile.reviewedAt).toBeInstanceOf(Date)
    expect(prisma.tenantUpdates).toHaveLength(1)
    expect(prisma.auditLogCreates[0]).toMatchObject({
      data: {
        action: "tenant.trust_profile_updated",
        actorUserId: "user-1",
        entityId: "tenant-1",
        entityType: "Tenant",
        tenantId: "tenant-1",
      },
    })
  })

  test("rejects invalid trust profile URLs and email addresses", async () => {
    const prisma = createTenantTrustPrismaStub()

    await expect(
      updateTenantTrustProfile(
        {
          actorUserId: "user-1",
          incidentContactEmail: "trust@example.com",
          legalTermsUrl: "ftp://example.com/terms",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("must use http or https")

    await expect(
      updateTenantTrustProfile(
        {
          actorUserId: "user-1",
          incidentContactEmail: "not-an-email",
          tenantId: "tenant-1",
        },
        prisma as never,
      ),
    ).rejects.toThrow("valid email")
    expect(prisma.tenantUpdates).toHaveLength(0)
    expect(prisma.auditLogCreates).toHaveLength(0)
  })
})
