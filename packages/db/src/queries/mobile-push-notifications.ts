import { QueryInfrastructureError } from "../query-error"
import { createHash } from "node:crypto"
import {
  MOBILE_NOTIFICATION_CATEGORIES,
  type MobileNotificationCategoryKey,
  isMandatoryMobileNotificationCategory,
} from "@halaalvest/domain/mobile-notifications"
import type { Prisma, PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError } from "../query-error"
import type { MembershipRole } from "./auth"
import { listNotificationPreferences } from "./notifications"

const expoPushTokenPattern = /^(?:Exponent|Expo)PushToken\[[^\]\s]{8,512}\]$/

function requirePrisma(operation: string, override?: PrismaClient) {
  const prisma = override ?? createPrismaClient()
  if (!prisma) {
    throw new QueryInfrastructureError(`${operation} is unavailable without database configuration.`)
  }
  return prisma
}

export function hashMobilePushToken(providerToken: string) {
  return createHash("sha256").update(providerToken).digest("hex")
}

export async function resolveMobilePushRecipient(
  input: {
    intendedRole?: MembershipRole | null
    tenantId: string
    userEmail: string
  },
  prismaOverride?: PrismaClient
) {
  const email = input.userEmail.trim().toLowerCase()
  if (!email) return null
  const prisma = requirePrisma("Mobile push recipient resolution", prismaOverride)
  const user = await prisma.user.findFirst({
    select: {
      id: true,
      memberships: {
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        select: { role: true },
        where: input.intendedRole ? { role: input.intendedRole } : undefined,
      },
    },
    where: {
      deletedAt: null,
      email: { equals: email, mode: "insensitive" },
      tenantId: input.tenantId,
    },
  })
  const role = user?.memberships[0]?.role
  return user && role ? { intendedRole: role, userId: user.id } : null
}

function normalizeProviderToken(value: string) {
  const token = value.trim()
  if (!expoPushTokenPattern.test(token)) {
    throw ExpectedQueryError.validation("The push endpoint is not valid.")
  }
  return token
}

async function writePushAudit(
  tx: Prisma.TransactionClient,
  input: {
    action: string
    actorUserId?: string | null
    entityId: string
    metadata: Prisma.InputJsonValue
    tenantId: string
  }
) {
  await tx.auditLog.create({
    data: {
      action: input.action,
      actorType: input.actorUserId ? "user" : "system",
      actorUserId: input.actorUserId ?? null,
      entityId: input.entityId,
      entityType: "MobilePushRegistration",
      metadata: input.metadata,
      occurredAt: new Date(),
      tenantId: input.tenantId,
    },
  })
}

export async function registerMobilePushEndpoint(
  input: {
    actorUserId: string
    mobileDeviceSessionId: string
    permissionStatus: "granted"
    platform: string
    projectId?: string | null
    providerToken: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = requirePrisma("Mobile push registration", prismaOverride)
  const providerToken = normalizeProviderToken(input.providerToken)
  const tokenHash = hashMobilePushToken(providerToken)
  const platform = input.platform.trim().slice(0, 40) || "unknown"
  const projectId = input.projectId?.trim().slice(0, 120) || null
  const now = new Date()

  return prisma.$transaction(async (tx) => {
    const session = await tx.mobileDeviceSession.findFirst({
      select: { id: true },
      where: {
        expiresAt: { gt: now },
        id: input.mobileDeviceSessionId,
        revokedAt: null,
        tenantId: input.tenantId,
        userId: input.actorUserId,
      },
    })
    if (!session) {
      throw ExpectedQueryError.permission(
        "This device session cannot register notifications."
      )
    }

    await tx.mobilePushRegistration.deleteMany({
      where: {
        mobileDeviceSessionId: { not: session.id },
        tokenHash,
      },
    })
    const registration = await tx.mobilePushRegistration.upsert({
      create: {
        lastValidatedAt: now,
        mobileDeviceSessionId: session.id,
        permissionStatus: input.permissionStatus,
        platform,
        projectId,
        providerToken,
        registeredAt: now,
        status: "active",
        tenantId: input.tenantId,
        tokenHash,
        userId: input.actorUserId,
      },
      update: {
        disabledAt: null,
        failureCode: null,
        lastValidatedAt: now,
        permissionStatus: input.permissionStatus,
        platform,
        projectId,
        providerToken,
        registeredAt: now,
        status: "active",
        tokenHash,
      },
      where: { mobileDeviceSessionId: session.id },
    })
    await writePushAudit(tx, {
      action: "mobile.push.registered",
      actorUserId: input.actorUserId,
      entityId: registration.id,
      metadata: {
        permissionStatus: input.permissionStatus,
        platform,
        projectId,
        tokenFingerprint: tokenHash.slice(0, 12),
      },
      tenantId: input.tenantId,
    })
    return {
      id: registration.id,
      lastValidatedAt: registration.lastValidatedAt.toISOString(),
      status: "registered" as const,
    }
  })
}

export async function disableMobilePushEndpoint(
  input: {
    actorUserId: string
    mobileDeviceSessionId: string
    permissionStatus: "denied" | "undetermined" | "unavailable"
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = requirePrisma("Mobile push disablement", prismaOverride)
  return prisma.$transaction(async (tx) => {
    const registration = await tx.mobilePushRegistration.findFirst({
      where: {
        mobileDeviceSessionId: input.mobileDeviceSessionId,
        tenantId: input.tenantId,
        userId: input.actorUserId,
      },
    })
    if (!registration) return { disabled: false as const }

    const now = new Date()
    await tx.mobilePushRegistration.update({
      data: {
        disabledAt: now,
        permissionStatus: input.permissionStatus,
        status: "disabled",
      },
      where: { id: registration.id },
    })
    await writePushAudit(tx, {
      action: "mobile.push.disabled",
      actorUserId: input.actorUserId,
      entityId: registration.id,
      metadata: { permissionStatus: input.permissionStatus },
      tenantId: input.tenantId,
    })
    return { disabled: true as const }
  })
}

export async function disableMobilePushEndpointForProviderFailure(
  input: {
    failureCode: string
    registrationId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = requirePrisma("Mobile push provider failure", prismaOverride)
  return prisma.$transaction(async (tx) => {
    const registration = await tx.mobilePushRegistration.findFirst({
      where: { id: input.registrationId, tenantId: input.tenantId },
    })
    if (!registration) return { disabled: false as const }
    await tx.mobilePushRegistration.update({
      data: {
        disabledAt: new Date(),
        failureCode: input.failureCode.slice(0, 80),
        status: "revoked",
      },
      where: { id: registration.id },
    })
    await writePushAudit(tx, {
      action: "mobile.push.revoked",
      entityId: registration.id,
      metadata: { failureCode: input.failureCode.slice(0, 80) },
      tenantId: input.tenantId,
    })
    return { disabled: true as const }
  })
}

export async function getMobilePushRegistrationState(
  input: {
    mobileDeviceSessionId?: string | null
    tenantId: string
    userId: string
  },
  prismaOverride?: PrismaClient
) {
  if (!input.mobileDeviceSessionId) return null
  const prisma = requirePrisma("Mobile push registration state", prismaOverride)
  const registration = await prisma.mobilePushRegistration.findFirst({
    select: {
      lastValidatedAt: true,
      permissionStatus: true,
      status: true,
    },
    where: {
      mobileDeviceSessionId: input.mobileDeviceSessionId,
      tenantId: input.tenantId,
      userId: input.userId,
    },
  })
  return registration
    ? {
        lastValidatedAt: registration.lastValidatedAt.toISOString(),
        permissionStatus: registration.permissionStatus,
        status: registration.status,
      }
    : null
}

function tenantPolicyAllowsCategory(
  rows: Awaited<ReturnType<typeof listNotificationPreferences>>,
  role: MembershipRole,
  category: MobileNotificationCategoryKey
) {
  const relevant = rows.filter((row) => {
    const normalized = row.notificationType.toLowerCase()
    const categoryMatch =
      normalized === category ||
      normalized.includes(category) ||
      (category === "transactions" &&
        ["receipt", "payment", "contribution", "share"].some((part) =>
          normalized.includes(part)
        ))
    return (
      categoryMatch &&
      row.channel === "push" &&
      (row.role === null || row.role === role)
    )
  })
  return relevant.length ? relevant.some((row) => row.enabled) : true
}

export async function getMobileUserNotificationPreferences(
  input: {
    memberLoginEnabled: boolean
    role: MembershipRole
    tenantId: string
    userId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = requirePrisma("Mobile notification preferences", prismaOverride)
  const [tenantRows, userRows] = await Promise.all([
    listNotificationPreferences(input.tenantId, prisma),
    prisma.mobileUserNotificationPreference.findMany({
      where: {
        channel: "push",
        tenantId: input.tenantId,
        userId: input.userId,
      },
    }),
  ])
  const userPreference = new Map(
    userRows.map((row) => [row.notificationType, row.enabled])
  )
  const subscriptionAllowsRole =
    input.role !== "member" || input.memberLoginEnabled

  return MOBILE_NOTIFICATION_CATEGORIES.map((category) => {
    const mandatory = category.mandatory
    const tenantEnabled = tenantPolicyAllowsCategory(
      tenantRows,
      input.role,
      category.key
    )
    const available =
      subscriptionAllowsRole && (mandatory || tenantEnabled)
    const userEnabled = userPreference.get(category.key)
    return {
      available,
      channel: "push" as const,
      description: category.description,
      enabled:
        available &&
        (mandatory ? true : (userEnabled ?? category.defaultEnabled)),
      key: category.key,
      mandatory,
      title: category.title,
    }
  })
}

export async function updateMobileUserNotificationPreference(
  input: {
    actorUserId: string
    enabled: boolean
    notificationType: MobileNotificationCategoryKey
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  if (
    !input.enabled &&
    isMandatoryMobileNotificationCategory(input.notificationType)
  ) {
    throw ExpectedQueryError.validation(
      "Security and transaction notifications always stay on."
    )
  }
  const prisma = requirePrisma("Mobile notification preference update", prismaOverride)
  return prisma.$transaction(async (tx) => {
    const preference = await tx.mobileUserNotificationPreference.upsert({
      create: {
        channel: "push",
        enabled: input.enabled,
        notificationType: input.notificationType,
        tenantId: input.tenantId,
        userId: input.actorUserId,
      },
      update: { enabled: input.enabled },
      where: {
        tenantId_userId_notificationType_channel: {
          channel: "push",
          notificationType: input.notificationType,
          tenantId: input.tenantId,
          userId: input.actorUserId,
        },
      },
    })
    await tx.auditLog.create({
      data: {
        action: "mobile.notification.preference_updated",
        actorType: "user",
        actorUserId: input.actorUserId,
        entityId: preference.id,
        entityType: "MobileUserNotificationPreference",
        metadata: {
          channel: "push",
          enabled: input.enabled,
          notificationType: input.notificationType,
        },
        occurredAt: new Date(),
        tenantId: input.tenantId,
      },
    })
    return {
      enabled: preference.enabled,
      notificationType: input.notificationType,
    }
  })
}

export async function listEligibleMobilePushRegistrations(
  input: {
    category: MobileNotificationCategoryKey
    memberLoginEnabled: boolean
    role: MembershipRole
    tenantId: string
    userId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = requirePrisma("Mobile push recipient lookup", prismaOverride)
  const preferences = await getMobileUserNotificationPreferences(
    {
      memberLoginEnabled: input.memberLoginEnabled,
      role: input.role,
      tenantId: input.tenantId,
      userId: input.userId,
    },
    prisma
  )
  const category = preferences.find((item) => item.key === input.category)
  if (!category?.enabled) return []
  return prisma.mobilePushRegistration.findMany({
    select: {
      id: true,
      platform: true,
      providerToken: true,
      tokenHash: true,
    },
    where: {
      mobileDeviceSession: {
        expiresAt: { gt: new Date() },
        revokedAt: null,
      },
      status: "active",
      tenantId: input.tenantId,
      userId: input.userId,
    },
  })
}
