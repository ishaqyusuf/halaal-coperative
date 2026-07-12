import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { createAuditLogEntry } from "./audit"

export const tenantServiceAccessModes = [
  "disabled",
  "office_only",
  "member_self_service",
  "read_only",
] as const

export type TenantServiceAccessMode = (typeof tenantServiceAccessModes)[number]

export const tenantServiceKeys = [
  "payment_receipts",
  "procurement",
  "food_purchase",
  "support_cases",
  "collection_sources",
  "collection_source_batch_posting",
] as const

export type TenantServiceKey = (typeof tenantServiceKeys)[number]

export const defaultTenantServiceAccessModes = {
  collection_source_batch_posting: "disabled",
  collection_sources: "disabled",
  food_purchase: "disabled",
  payment_receipts: "office_only",
  procurement: "disabled",
  support_cases: "member_self_service",
} satisfies Record<TenantServiceKey, TenantServiceAccessMode>

export type TenantServiceCapability = {
  accessMode: TenantServiceAccessMode
  canMemberCreate: boolean
  canSettleExisting: boolean
  canStaffCreate: boolean
  canViewExisting: boolean
  serviceKey: TenantServiceKey
  shouldShowInMemberNav: boolean
  shouldShowInStaffNav: boolean
}

export type TenantOperationProfilePolicy = {
  foodPurchaseMaximumActiveObligationsPerMember: number
  foodPurchaseRequiresOpenCycle: boolean
  procurementMaximumActiveObligationsPerMember: number
}

export type TenantOperationProfileReadModel = {
  policy: TenantOperationProfilePolicy
  reviewedAt: Date | null
  reviewedByUserId: string | null
  services: Record<TenantServiceKey, TenantServiceCapability>
  tenantId: string
}

export type UpdateTenantOperationProfileInput = {
  actorUserId?: string | null
  changeReason?: string | null
  policy?: Partial<TenantOperationProfilePolicy>
  services?: Partial<Record<TenantServiceKey, TenantServiceAccessMode>>
  tenantId: string
}

function getPrisma(prismaOverride?: PrismaClient) {
  const prisma = prismaOverride ?? createPrismaClient()

  if (!prisma) {
    throw new Error("Database not configured")
  }

  return prisma as any
}

function isTenantServiceKey(value: unknown): value is TenantServiceKey {
  return (
    typeof value === "string" &&
    tenantServiceKeys.includes(value as TenantServiceKey)
  )
}

function isTenantServiceAccessMode(
  value: unknown
): value is TenantServiceAccessMode {
  return (
    typeof value === "string" &&
    tenantServiceAccessModes.includes(value as TenantServiceAccessMode)
  )
}

function normalizePositiveInteger(value: unknown, fallback: number) {
  const numberValue = Number(value)

  return Number.isInteger(numberValue) && numberValue > 0
    ? numberValue
    : fallback
}

function normalizeInputPositiveInteger(
  value: unknown,
  fallback: number,
  label: string
) {
  if (typeof value === "undefined") {
    return fallback
  }

  const numberValue = Number(value)

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw new Error(`${label} must be a positive whole number.`)
  }

  return numberValue
}

function buildServiceCapability(
  serviceKey: TenantServiceKey,
  accessMode: TenantServiceAccessMode
): TenantServiceCapability {
  return {
    accessMode,
    canMemberCreate: accessMode === "member_self_service",
    canSettleExisting: true,
    canStaffCreate:
      accessMode === "office_only" || accessMode === "member_self_service",
    canViewExisting: true,
    serviceKey,
    shouldShowInMemberNav: accessMode === "member_self_service",
    shouldShowInStaffNav: accessMode !== "disabled",
  }
}

function buildDefaultServices(): Record<
  TenantServiceKey,
  TenantServiceCapability
> {
  return tenantServiceKeys.reduce(
    (services, serviceKey) => ({
      ...services,
      [serviceKey]: buildServiceCapability(
        serviceKey,
        defaultTenantServiceAccessModes[serviceKey]
      ),
    }),
    {} as Record<TenantServiceKey, TenantServiceCapability>
  )
}

function normalizePolicy(policy: Record<string, unknown> | null | undefined) {
  return {
    foodPurchaseMaximumActiveObligationsPerMember: normalizePositiveInteger(
      policy?.foodPurchaseMaximumActiveObligationsPerMember,
      1
    ),
    foodPurchaseRequiresOpenCycle:
      typeof policy?.foodPurchaseRequiresOpenCycle === "boolean"
        ? policy.foodPurchaseRequiresOpenCycle
        : true,
    procurementMaximumActiveObligationsPerMember: normalizePositiveInteger(
      policy?.procurementMaximumActiveObligationsPerMember,
      1
    ),
  } satisfies TenantOperationProfilePolicy
}

function assertTenantServiceAccessMode(
  value: unknown
): asserts value is TenantServiceAccessMode {
  if (!isTenantServiceAccessMode(value)) {
    throw new Error("Invalid tenant service access mode.")
  }
}

function normalizeInputPolicy(
  input: Partial<TenantOperationProfilePolicy> | undefined,
  fallback: TenantOperationProfilePolicy
) {
  return {
    foodPurchaseMaximumActiveObligationsPerMember: normalizeInputPositiveInteger(
      input?.foodPurchaseMaximumActiveObligationsPerMember,
      fallback.foodPurchaseMaximumActiveObligationsPerMember,
      "Foodstuff Purchase active obligation limit"
    ),
    foodPurchaseRequiresOpenCycle:
      typeof input?.foodPurchaseRequiresOpenCycle === "boolean"
        ? input.foodPurchaseRequiresOpenCycle
        : fallback.foodPurchaseRequiresOpenCycle,
    procurementMaximumActiveObligationsPerMember: normalizeInputPositiveInteger(
      input?.procurementMaximumActiveObligationsPerMember,
      fallback.procurementMaximumActiveObligationsPerMember,
      "Procurement active obligation limit"
    ),
  } satisfies TenantOperationProfilePolicy
}

function isRestrictiveAccessChange(input: {
  next: TenantServiceAccessMode
  previous: TenantServiceAccessMode
}) {
  return (
    input.next !== input.previous &&
    (input.next === "disabled" ||
      input.next === "read_only" ||
      (input.previous === "member_self_service" &&
        input.next !== "member_self_service"))
  )
}

function isUniqueConstraintFailure(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  )
}

async function findTenantOperationProfileByTenantId(
  tenantId: string,
  prisma: ReturnType<typeof getPrisma>
) {
  return prisma.tenantOperationProfile.findUnique({
    where: { tenantId },
  })
}

async function ensureTenantServiceSettingDefault(input: {
  accessMode: TenantServiceAccessMode
  operationProfileId: string
  prisma: ReturnType<typeof getPrisma>
  serviceKey: TenantServiceKey
  tenantId: string
}) {
  try {
    return await input.prisma.tenantServiceSetting.upsert({
      where: {
        tenantId_serviceKey: {
          serviceKey: input.serviceKey,
          tenantId: input.tenantId,
        },
      },
      create: {
        accessMode: input.accessMode,
        operationProfileId: input.operationProfileId,
        serviceKey: input.serviceKey,
        tenantId: input.tenantId,
      },
      update: {},
    })
  } catch (error) {
    if (!isUniqueConstraintFailure(error)) {
      throw error
    }

    const existing = await input.prisma.tenantServiceSetting.findUnique?.({
      where: {
        tenantId_serviceKey: {
          serviceKey: input.serviceKey,
          tenantId: input.tenantId,
        },
      },
    })

    if (!existing) {
      throw error
    }

    return existing
  }
}

export async function ensureTenantOperationProfileDefaults(
  tenantId: string,
  prismaOverride?: PrismaClient
) {
  const prisma = getPrisma(prismaOverride)

  let profile = await findTenantOperationProfileByTenantId(tenantId, prisma)

  if (!profile) {
    try {
      profile = await prisma.tenantOperationProfile.create({
        data: { tenantId },
      })
    } catch (error) {
      if (!isUniqueConstraintFailure(error)) {
        throw error
      }

      profile = await findTenantOperationProfileByTenantId(tenantId, prisma)
    }
  }

  if (!profile) {
    throw new Error("Could not initialize tenant operation profile.")
  }

  await Promise.all(
    tenantServiceKeys.map((serviceKey) =>
      ensureTenantServiceSettingDefault({
        accessMode: defaultTenantServiceAccessModes[serviceKey],
        operationProfileId: profile.id,
        prisma,
        serviceKey,
        tenantId,
      })
    )
  )

  return profile
}

export async function getTenantOperationProfile(
  tenantId: string,
  prismaOverride?: PrismaClient
): Promise<TenantOperationProfileReadModel> {
  const prisma = getPrisma(prismaOverride)
  const profile = await ensureTenantOperationProfileDefaults(tenantId, prisma)

  const [settings, policy] = await Promise.all([
    prisma.tenantServiceSetting.findMany({
      where: { tenantId },
    }),
    prisma.tenantPolicy.findUnique({
      select: {
        foodPurchaseMaximumActiveObligationsPerMember: true,
        foodPurchaseRequiresOpenCycle: true,
        procurementMaximumActiveObligationsPerMember: true,
      },
      where: { tenantId },
    }),
  ])
  const services = buildDefaultServices()

  for (const setting of settings) {
    const serviceKey = setting.serviceKey as unknown
    const accessMode = setting.accessMode as unknown

    if (
      isTenantServiceKey(serviceKey) &&
      isTenantServiceAccessMode(accessMode)
    ) {
      services[serviceKey] = buildServiceCapability(serviceKey, accessMode)
    }
  }

  return {
    policy: normalizePolicy(policy),
    reviewedAt: profile.reviewedAt ?? null,
    reviewedByUserId: profile.reviewedByUserId ?? null,
    services,
    tenantId,
  }
}

export async function updateTenantOperationProfile(
  input: UpdateTenantOperationProfileInput,
  prismaOverride?: PrismaClient
): Promise<TenantOperationProfileReadModel> {
  const prisma = getPrisma(prismaOverride)
  const previous = await getTenantOperationProfile(input.tenantId, prisma)
  const policy = normalizeInputPolicy(input.policy, previous.policy)
  const nextAccessModes: Record<TenantServiceKey, TenantServiceAccessMode> = {
    ...defaultTenantServiceAccessModes,
  }

  for (const serviceKey of tenantServiceKeys) {
    nextAccessModes[serviceKey] = previous.services[serviceKey].accessMode
  }

  for (const [serviceKey, accessMode] of Object.entries(input.services ?? {})) {
    if (!isTenantServiceKey(serviceKey)) {
      throw new Error("Invalid tenant service key.")
    }

    assertTenantServiceAccessMode(accessMode)
    nextAccessModes[serviceKey] = accessMode
  }

  const restrictiveServiceKeys = tenantServiceKeys.filter((serviceKey) =>
    isRestrictiveAccessChange({
      next: nextAccessModes[serviceKey],
      previous: previous.services[serviceKey].accessMode,
    })
  )
  const changeReason = input.changeReason?.trim() ?? ""

  if (restrictiveServiceKeys.length > 0 && changeReason.length === 0) {
    throw new Error(
      "A reason is required when disabling a service, making it view-only, or removing member self-service access."
    )
  }

  await ensureTenantOperationProfileDefaults(input.tenantId, prisma)

  const profile = await prisma.tenantOperationProfile.update({
    where: { tenantId: input.tenantId },
    data: {
      reviewedAt: new Date(),
      reviewedByUserId: input.actorUserId ?? null,
    },
  })

  await Promise.all([
    prisma.tenantPolicy.upsert({
      where: { tenantId: input.tenantId },
      create: {
        foodPurchaseMaximumActiveObligationsPerMember:
          policy.foodPurchaseMaximumActiveObligationsPerMember,
        foodPurchaseRequiresOpenCycle: policy.foodPurchaseRequiresOpenCycle,
        procurementMaximumActiveObligationsPerMember:
          policy.procurementMaximumActiveObligationsPerMember,
        tenantId: input.tenantId,
      },
      update: {
        foodPurchaseMaximumActiveObligationsPerMember:
          policy.foodPurchaseMaximumActiveObligationsPerMember,
        foodPurchaseRequiresOpenCycle: policy.foodPurchaseRequiresOpenCycle,
        procurementMaximumActiveObligationsPerMember:
          policy.procurementMaximumActiveObligationsPerMember,
      },
    }),
    ...tenantServiceKeys.map((serviceKey) =>
      prisma.tenantServiceSetting.upsert({
        where: {
          tenantId_serviceKey: {
            serviceKey,
            tenantId: input.tenantId,
          },
        },
        create: {
          accessMode: nextAccessModes[serviceKey],
          operationProfileId: profile.id,
          serviceKey,
          tenantId: input.tenantId,
        },
        update: {
          accessMode: nextAccessModes[serviceKey],
          operationProfileId: profile.id,
        },
      })
    ),
  ])

  const next = await getTenantOperationProfile(input.tenantId, prisma)

  await createAuditLogEntry(
    {
      action: "tenant_operation_profile.reviewed",
      actorType: "user",
      actorUserId: input.actorUserId ?? null,
      entityId: profile.id,
      entityType: "TenantOperationProfile",
      metadata: {
        changeReason: changeReason || null,
        next,
        previous,
        restrictiveServiceKeys,
      },
      tenantId: input.tenantId,
    },
    prisma
  )

  return next
}
