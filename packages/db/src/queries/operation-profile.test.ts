import { describe, expect, test } from "bun:test"
import {
  defaultTenantServiceAccessModes,
  ensureTenantOperationProfileDefaults,
  getTenantOperationProfile,
  tenantServiceKeys,
  updateTenantOperationProfile,
  type TenantServiceAccessMode,
  type TenantServiceKey,
} from "./operation-profile"

function createOperationProfilePrismaStub(input?: {
  policy?: Record<string, unknown> | null
  profile?: {
    id: string
    reviewedAt?: Date | null
    reviewedByUserId?: string | null
    tenantId: string
  }
  settings?: Array<{
    accessMode: TenantServiceAccessMode
    serviceKey: TenantServiceKey
    tenantId: string
  }>
}) {
  let profile = input?.profile ?? {
    id: "profile-1",
    reviewedAt: null,
    reviewedByUserId: null,
    tenantId: "tenant-1",
  }
  let policy = input?.policy ?? null
  const auditLogCreates: unknown[] = []
  const serviceSettings = [...(input?.settings ?? [])]
  const serviceSettingUpserts: unknown[] = []
  let failNextProfileCreateWithUniqueConstraint = false
  let failNextServiceSettingUpsertWithUniqueConstraint = false

  return {
    auditLogCreates,
    failNextProfileCreateWithUniqueConstraint: () => {
      failNextProfileCreateWithUniqueConstraint = true
    },
    failNextServiceSettingUpsertWithUniqueConstraint: () => {
      failNextServiceSettingUpsertWithUniqueConstraint = true
    },
    profile,
    serviceSettingUpserts,
    auditLog: {
      create: async (createInput: unknown) => {
        auditLogCreates.push(createInput)

        return createInput
      },
    },
    tenantOperationProfile: {
      create: async ({ data }: { data: Partial<typeof profile> }) => {
        if (failNextProfileCreateWithUniqueConstraint) {
          failNextProfileCreateWithUniqueConstraint = false
          profile = {
            ...profile,
            ...data,
          }
          const error = new Error("Unique constraint failed")
          Object.assign(error, { code: "P2002" })

          throw error
        }

        profile = {
          ...profile,
          ...data,
        }

        return profile
      },
      findUnique: async ({ where }: { where: { tenantId: string } }) =>
        profile.tenantId === where.tenantId ? profile : null,
      update: async ({
        data,
        where,
      }: {
        data: Partial<typeof profile>
        where: { tenantId: string }
      }) => {
        if (profile.tenantId !== where.tenantId) {
          throw new Error("Profile not found")
        }

        profile = {
          ...profile,
          ...data,
        }

        return profile
      },
    },
    tenantPolicy: {
      findUnique: async () => policy,
      upsert: async (upsertInput: {
        create: Record<string, unknown>
        update: Record<string, unknown>
      }) => {
        policy = {
          ...(policy ?? {}),
          ...upsertInput.create,
          ...upsertInput.update,
        }

        return policy
      },
    },
    tenantServiceSetting: {
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
        serviceSettings.find(
          (setting) =>
            setting.tenantId === where.tenantId_serviceKey.tenantId &&
            setting.serviceKey === where.tenantId_serviceKey.serviceKey
        ) ?? null,
      findMany: async ({ where }: { where: { tenantId: string } }) =>
        serviceSettings.filter(
          (setting) => setting.tenantId === where.tenantId
        ),
      upsert: async (upsertInput: {
        create: {
          accessMode: TenantServiceAccessMode
          serviceKey: TenantServiceKey
          tenantId: string
        }
        update?: Partial<{
          accessMode: TenantServiceAccessMode
          operationProfileId: string
        }>
        where: {
          tenantId_serviceKey: {
            serviceKey: TenantServiceKey
            tenantId: string
          }
        }
      }) => {
        serviceSettingUpserts.push(upsertInput)
        const existing = serviceSettings.find(
          (setting) =>
            setting.tenantId ===
              upsertInput.where.tenantId_serviceKey.tenantId &&
            setting.serviceKey ===
              upsertInput.where.tenantId_serviceKey.serviceKey
        )

        if (failNextServiceSettingUpsertWithUniqueConstraint) {
          failNextServiceSettingUpsertWithUniqueConstraint = false
          if (!existing) {
            serviceSettings.push(upsertInput.create)
          }
          const error = new Error("Unique constraint failed")
          Object.assign(error, { code: "P2002" })

          throw error
        }

        if (existing) {
          Object.assign(existing, upsertInput.update ?? {})

          return existing
        }

        serviceSettings.push(upsertInput.create)

        return upsertInput.create
      },
    },
  }
}

describe("tenant operation profile", () => {
  test("ensures default service settings for every tenant service", async () => {
    const prisma = createOperationProfilePrismaStub()

    await ensureTenantOperationProfileDefaults("tenant-1", prisma as never)

    expect(prisma.serviceSettingUpserts).toHaveLength(tenantServiceKeys.length)
    expect(
      prisma.serviceSettingUpserts.map((input) => {
        const upsertInput = input as {
          create: { accessMode: string; serviceKey: string }
        }

        return [upsertInput.create.serviceKey, upsertInput.create.accessMode]
      })
    ).toEqual(
      tenantServiceKeys.map((serviceKey) => [
        serviceKey,
        defaultTenantServiceAccessModes[serviceKey],
      ])
    )
  })

  test("recovers when concurrent default initialization already created the profile", async () => {
    const prisma = createOperationProfilePrismaStub()
    prisma.failNextProfileCreateWithUniqueConstraint()

    await ensureTenantOperationProfileDefaults("missing-tenant", prisma as never)

    expect(prisma.serviceSettingUpserts).toHaveLength(tenantServiceKeys.length)
  })

  test("recovers when concurrent default initialization already created a service setting", async () => {
    const prisma = createOperationProfilePrismaStub()
    prisma.failNextServiceSettingUpsertWithUniqueConstraint()

    await ensureTenantOperationProfileDefaults("tenant-1", prisma as never)

    expect(prisma.serviceSettingUpserts).toHaveLength(tenantServiceKeys.length)
  })

  test("reads normalized defaults and derived service permissions", async () => {
    const profileReviewedAt = new Date("2026-07-12T10:00:00.000Z")
    const prisma = createOperationProfilePrismaStub({
      policy: {
        foodPurchaseMaximumActiveObligationsPerMember: 2,
        foodPurchaseRequiresOpenCycle: false,
        procurementMaximumActiveObligationsPerMember: 3,
      },
      profile: {
        id: "profile-1",
        reviewedAt: profileReviewedAt,
        reviewedByUserId: "user-1",
        tenantId: "tenant-1",
      },
      settings: [
        {
          accessMode: "member_self_service",
          serviceKey: "procurement",
          tenantId: "tenant-1",
        },
        {
          accessMode: "read_only",
          serviceKey: "food_purchase",
          tenantId: "tenant-1",
        },
      ],
    })

    const profile = await getTenantOperationProfile("tenant-1", prisma as never)

    expect(profile).toMatchObject({
      policy: {
        foodPurchaseMaximumActiveObligationsPerMember: 2,
        foodPurchaseRequiresOpenCycle: false,
        procurementMaximumActiveObligationsPerMember: 3,
      },
      reviewedAt: profileReviewedAt,
      reviewedByUserId: "user-1",
      tenantId: "tenant-1",
    })
    expect(profile.services.procurement).toMatchObject({
      accessMode: "member_self_service",
      canMemberCreate: true,
      canStaffCreate: true,
      shouldShowInMemberNav: true,
      shouldShowInStaffNav: true,
    })
    expect(profile.services.food_purchase).toMatchObject({
      accessMode: "read_only",
      canMemberCreate: false,
      canSettleExisting: true,
      canStaffCreate: false,
      canViewExisting: true,
      shouldShowInMemberNav: false,
      shouldShowInStaffNav: true,
    })
    expect(profile.services.payment_receipts).toMatchObject({
      accessMode: "office_only",
      canMemberCreate: false,
      canStaffCreate: true,
    })
  })

  test("falls back to safe policy defaults when tenant policy is missing", async () => {
    const prisma = createOperationProfilePrismaStub({ policy: null })

    const profile = await getTenantOperationProfile("tenant-1", prisma as never)

    expect(profile.policy).toEqual({
      foodPurchaseMaximumActiveObligationsPerMember: 1,
      foodPurchaseRequiresOpenCycle: true,
      procurementMaximumActiveObligationsPerMember: 1,
    })
  })

  test("updates reviewed service modes and typed policy caps", async () => {
    const prisma = createOperationProfilePrismaStub()

    const profile = await updateTenantOperationProfile(
      {
        actorUserId: "user-1",
        changeReason: "Support will be handled at the front desk.",
        policy: {
          foodPurchaseMaximumActiveObligationsPerMember: 2,
          foodPurchaseRequiresOpenCycle: false,
          procurementMaximumActiveObligationsPerMember: 3,
        },
        services: {
          collection_source_batch_posting: "office_only",
          collection_sources: "office_only",
          food_purchase: "member_self_service",
          payment_receipts: "member_self_service",
          procurement: "office_only",
          support_cases: "read_only",
        },
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(profile.reviewedAt).toBeInstanceOf(Date)
    expect(profile.reviewedByUserId).toBe("user-1")
    expect(profile.policy).toEqual({
      foodPurchaseMaximumActiveObligationsPerMember: 2,
      foodPurchaseRequiresOpenCycle: false,
      procurementMaximumActiveObligationsPerMember: 3,
    })
    expect(profile.services.payment_receipts).toMatchObject({
      accessMode: "member_self_service",
      canMemberCreate: true,
    })
    expect(profile.services.procurement).toMatchObject({
      accessMode: "office_only",
      canMemberCreate: false,
      canStaffCreate: true,
    })
    expect(prisma.auditLogCreates).toHaveLength(1)
    expect(prisma.auditLogCreates[0]).toMatchObject({
      data: {
        action: "tenant_operation_profile.reviewed",
        actorUserId: "user-1",
        entityType: "TenantOperationProfile",
        metadata: {
          changeReason: "Support will be handled at the front desk.",
          restrictiveServiceKeys: ["support_cases"],
        },
      },
    })
  })

  test("requires a reason when removing member self-service access", async () => {
    const prisma = createOperationProfilePrismaStub({
      settings: [
        {
          accessMode: "member_self_service",
          serviceKey: "payment_receipts",
          tenantId: "tenant-1",
        },
      ],
    })

    await expect(
      updateTenantOperationProfile(
        {
          services: {
            payment_receipts: "office_only",
          },
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow("A reason is required")
  })

  test("rejects invalid policy cap updates", async () => {
    const prisma = createOperationProfilePrismaStub()

    await expect(
      updateTenantOperationProfile(
        {
          policy: {
            procurementMaximumActiveObligationsPerMember: 0,
          },
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow(
      "Procurement active obligation limit must be a positive whole number."
    )

    await expect(
      updateTenantOperationProfile(
        {
          policy: {
            foodPurchaseMaximumActiveObligationsPerMember: 1.5,
          },
          tenantId: "tenant-1",
        },
        prisma as never
      )
    ).rejects.toThrow(
      "Foodstuff Purchase active obligation limit must be a positive whole number."
    )
  })
})
