import { describe, expect, test } from "bun:test"

import {
  tenantServiceAccessModes,
  tenantServiceKeys,
  updateTenantOperationProfileService,
  type TenantServiceAccessMode,
  type TenantServiceKey,
} from "./operation-profile"

function createServiceUpdatePrismaStub(input: {
  accessMode: TenantServiceAccessMode
  forceOptimisticConflict?: boolean
}) {
  const profile = {
    id: "profile-1",
    reviewedAt: null as Date | null,
    reviewedByUserId: null as string | null,
    tenantId: "tenant-1",
  }
  const settings = tenantServiceKeys.map((serviceKey) => ({
    accessMode: serviceKey === "procurement" ? input.accessMode : "office_only",
    serviceKey,
    tenantId: "tenant-1",
  })) as {
    accessMode: TenantServiceAccessMode
    serviceKey: TenantServiceKey
    tenantId: string
  }[]
  const auditEntries: { data: Record<string, unknown> }[] = []

  const prisma = {
    auditLog: {
      create: async (entry: { data: Record<string, unknown> }) => {
        auditEntries.push(entry)
        return entry
      },
    },
    tenantOperationProfile: {
      create: async () => profile,
      findUnique: async () => profile,
      update: async ({ data }: { data: Partial<typeof profile> }) => {
        Object.assign(profile, data)
        return profile
      },
    },
    tenantPolicy: {
      findUnique: async () => ({
        foodPurchaseMaximumActiveObligationsPerMember: 1,
        foodPurchaseRequiresOpenCycle: true,
        procurementMaximumActiveObligationsPerMember: 1,
      }),
    },
    tenantServiceSetting: {
      findMany: async () => settings,
      findUnique: async ({
        where,
      }: {
        where: {
          tenantId_serviceKey: {
            serviceKey: TenantServiceKey
            tenantId: string
          }
        }
      }) =>
        settings.find(
          (setting) =>
            setting.tenantId === where.tenantId_serviceKey.tenantId &&
            setting.serviceKey === where.tenantId_serviceKey.serviceKey
        ) ?? null,
      updateMany: async ({
        data,
        where,
      }: {
        data: { accessMode: TenantServiceAccessMode }
        where: {
          accessMode: TenantServiceAccessMode
          serviceKey: TenantServiceKey
          tenantId: string
        }
      }) => {
        if (input.forceOptimisticConflict) return { count: 0 }
        const setting = settings.find(
          (candidate) =>
            candidate.tenantId === where.tenantId &&
            candidate.serviceKey === where.serviceKey &&
            candidate.accessMode === where.accessMode
        )
        if (!setting) return { count: 0 }
        setting.accessMode = data.accessMode
        return { count: 1 }
      },
      upsert: async ({
        create,
        where,
      }: {
        create: (typeof settings)[number]
        where: {
          tenantId_serviceKey: {
            serviceKey: TenantServiceKey
            tenantId: string
          }
        }
      }) => {
        const existing = settings.find(
          (setting) =>
            setting.tenantId === where.tenantId_serviceKey.tenantId &&
            setting.serviceKey === where.tenantId_serviceKey.serviceKey
        )
        if (existing) return existing
        settings.push(create)
        return create
      },
    },
  }

  return {
    auditEntries,
    client: {
      ...prisma,
      $transaction: async <T>(
        run: (transaction: typeof prisma) => Promise<T>
      ) => run(prisma),
    },
    settings,
  }
}

describe("focused Operation Profile service updates", () => {
  for (const previous of tenantServiceAccessModes) {
    for (const next of tenantServiceAccessModes) {
      test(`${previous} -> ${next} preserves every unrelated service`, async () => {
        const prisma = createServiceUpdatePrismaStub({ accessMode: previous })
        const unrelatedBefore = prisma.settings
          .filter((setting) => setting.serviceKey !== "procurement")
          .map((setting) => ({ ...setting }))

        const result = await updateTenantOperationProfileService(
          {
            actorUserId: "admin-1",
            changeReason: "Approved operating policy review.",
            expectedAccessMode: previous,
            nextAccessMode: next,
            serviceKey: "procurement",
            tenantId: "tenant-1",
          },
          prisma.client as never
        )

        expect(result.services.procurement.accessMode).toBe(next)
        expect(
          prisma.settings.filter(
            (setting) => setting.serviceKey !== "procurement"
          )
        ).toEqual(unrelatedBefore)
        expect(prisma.auditEntries).toHaveLength(previous === next ? 0 : 1)

        if (previous !== next) {
          expect(prisma.auditEntries[0]).toMatchObject({
            data: {
              action: "tenant_operation_profile.service_access_updated",
              actorUserId: "admin-1",
              metadata: {
                serviceKey: "procurement",
              },
              tenantId: "tenant-1",
            },
          })
        }
      })
    }
  }

  test("rejects stale expected state before writing an audit event", async () => {
    const prisma = createServiceUpdatePrismaStub({ accessMode: "office_only" })

    await expect(
      updateTenantOperationProfileService(
        {
          actorUserId: "admin-1",
          changeReason: "Reviewed.",
          expectedAccessMode: "member_self_service",
          nextAccessMode: "read_only",
          serviceKey: "procurement",
          tenantId: "tenant-1",
        },
        prisma.client as never
      )
    ).rejects.toThrow("changed on another device")
    expect(prisma.auditEntries).toEqual([])
  })

  test("rejects a concurrent compare-and-set miss", async () => {
    const prisma = createServiceUpdatePrismaStub({
      accessMode: "office_only",
      forceOptimisticConflict: true,
    })

    await expect(
      updateTenantOperationProfileService(
        {
          actorUserId: "admin-1",
          changeReason: "Reviewed.",
          expectedAccessMode: "office_only",
          nextAccessMode: "member_self_service",
          serviceKey: "procurement",
          tenantId: "tenant-1",
        },
        prisma.client as never
      )
    ).rejects.toThrow("changed on another device")
    expect(prisma.auditEntries).toEqual([])
  })

  test("requires an audit reason for restrictive changes", async () => {
    const prisma = createServiceUpdatePrismaStub({
      accessMode: "member_self_service",
    })

    await expect(
      updateTenantOperationProfileService(
        {
          actorUserId: "admin-1",
          expectedAccessMode: "member_self_service",
          nextAccessMode: "office_only",
          serviceKey: "procurement",
          tenantId: "tenant-1",
        },
        prisma.client as never
      )
    ).rejects.toThrow("A reason is required")
    expect(prisma.auditEntries).toEqual([])
  })
})
