import type { MembershipRecord, UserRecord } from "./auth"
import type { TenantRecord } from "./tenants"
import { createPrismaClient } from "../prisma"

export type QaAuthorizationRecord = {
  clientKind: string
  contractVersion: number
  credentialId: string
  environment: string
  expiresAt: Date
  id: string
  qaDomain: string
}

export type QaAccessProfileRecord = {
  member: { code: string; id: string } | null
  membership: MembershipRecord
  tenant: TenantRecord
  user: UserRecord
}

const seedCredentialIds = new Map<string, string>()
const seedAuthorizations = new Map<
  string,
  QaAuthorizationRecord & {
    clientSignalHash: string
    revokedAt: Date | null
    tokenHash: string
  }
>()

const seedQaTenant: TenantRecord = {
  cooperativeCodePrefix: "SFA",
  currencyCode: "NGN",
  dataClassification: "qa",
  id: "tenant-safa-qa",
  memberCount: 1,
  memberNumberPrefix: "KAD-",
  name: "Safa Multipurpose Cooperative",
  qaPurgeStartedAt: null,
  region: "Kaduna",
  slug: "safa-qa",
  status: "active",
  timezone: "Africa/Lagos",
}

const seedQaProfiles: QaAccessProfileRecord[] = [
  {
    member: null,
    membership: {
      id: "membership-safa-qa-admin",
      isDefault: true,
      role: "tenant_admin",
      tenantId: seedQaTenant.id,
      userId: "user-safa-qa-admin",
    },
    tenant: seedQaTenant,
    user: {
      email: "admin@safa.qa.test",
      fullName: "Safa Cooperative Admin",
      id: "user-safa-qa-admin",
      isPlatformOwner: false,
      tenantId: seedQaTenant.id,
    },
  },
  {
    member: { code: "KAD-0042", id: "member-safa-qa-zainab" },
    membership: {
      id: "membership-safa-qa-member",
      isDefault: true,
      role: "member",
      tenantId: seedQaTenant.id,
      userId: "user-safa-qa-zainab",
    },
    tenant: seedQaTenant,
    user: {
      email: "zainab@safa.qa.test",
      fullName: "Zainab Musa",
      id: "user-safa-qa-zainab",
      isPlatformOwner: false,
      tenantId: seedQaTenant.id,
    },
  },
  {
    member: null,
    membership: {
      id: "membership-safa-qa-finance",
      isDefault: true,
      role: "finance_officer",
      tenantId: seedQaTenant.id,
      userId: "user-safa-qa-finance",
    },
    tenant: seedQaTenant,
    user: {
      email: "finance@safa.qa.test",
      fullName: "Hauwa Usman",
      id: "user-safa-qa-finance",
      isPlatformOwner: false,
      tenantId: seedQaTenant.id,
    },
  },
]

export function findSeedQaUserById(userId: string) {
  return (
    seedQaProfiles.find((profile) => profile.user.id === userId)?.user ?? null
  )
}

export function findSeedQaMembershipsForUser(userId: string) {
  return seedQaProfiles
    .filter((profile) => profile.user.id === userId)
    .map((profile) => profile.membership)
}

function mapTenant(input: {
  cooperativeCodePrefix: string | null
  currencyCode: string
  dataClassification: "live" | "qa"
  id: string
  memberNumberPrefix: string | null
  name: string
  qaPurgeStartedAt: Date | null
  region: string | null
  slug: string
  status: "pending" | "active" | "suspended" | "archived"
  timezone: string
}) {
  return {
    ...input,
    memberCount: 0,
    qaPurgeStartedAt: input.qaPurgeStartedAt?.toISOString() ?? null,
  } satisfies TenantRecord
}

export async function createQaTesterCredential(input: {
  createdByUserId: string
  credentialDigest: string
  expiresAt: Date
  qaDomain: string
  testerLabel: string
}) {
  const prisma = createPrismaClient()
  if (!prisma) {
    const id = crypto.randomUUID()
    seedCredentialIds.set(input.credentialDigest, id)
    return { id }
  }
  return prisma.qaTesterCredential.create({
    data: input,
    select: { id: true },
  })
}

export async function revokeQaTesterCredential(input: {
  credentialId: string
  revokedAt?: Date
}) {
  const prisma = createPrismaClient()
  const revokedAt = input.revokedAt ?? new Date()
  if (!prisma) {
    for (const authorization of seedAuthorizations.values()) {
      if (authorization.credentialId === input.credentialId) {
        authorization.revokedAt = revokedAt
      }
    }
    return { id: input.credentialId }
  }
  return prisma.$transaction(async (tx) => {
    const credential = await tx.qaTesterCredential.update({
      data: { revokedAt },
      select: { id: true },
      where: { id: input.credentialId },
    })
    await tx.qaClientAuthorization.updateMany({
      data: { revokedAt },
      where: { credentialId: input.credentialId, revokedAt: null },
    })
    return credential
  })
}

export async function authorizeQaClient(input: {
  clientKind: string
  clientSignalHash: string
  contractVersion: number
  credentialDigest: string
  environment: string
  expiresAt: Date
  fallbackCredentialDigest?: string | null
  qaDomain: string
  tokenHash: string
}) {
  const prisma = createPrismaClient()
  const now = new Date()
  if (!prisma) {
    const configuredMatches =
      input.fallbackCredentialDigest === input.credentialDigest
    const credentialId = seedCredentialIds.get(input.credentialDigest)
    if (!configuredMatches && !credentialId) return null
    const record = {
      clientKind: input.clientKind,
      clientSignalHash: input.clientSignalHash,
      contractVersion: input.contractVersion,
      credentialId: credentialId ?? "seed-configured-credential",
      environment: input.environment,
      expiresAt: input.expiresAt,
      id: crypto.randomUUID(),
      qaDomain: input.qaDomain,
      revokedAt: null,
      tokenHash: input.tokenHash,
    }
    seedAuthorizations.set(record.id, record)
    return record
  }

  const credential = await prisma.qaTesterCredential.findFirst({
    select: { id: true },
    where: {
      credentialDigest: input.credentialDigest,
      expiresAt: { gt: now },
      OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }],
      qaDomain: input.qaDomain,
      revokedAt: null,
    },
  })
  if (!credential) {
    const domainCredential = await prisma.qaTesterCredential.findFirst({
      orderBy: { createdAt: "desc" },
      select: { failedAttemptCount: true, id: true },
      where: {
        expiresAt: { gt: now },
        qaDomain: input.qaDomain,
        revokedAt: null,
      },
    })
    if (domainCredential) {
      const failedAttemptCount = domainCredential.failedAttemptCount + 1
      await prisma.qaTesterCredential.update({
        data: {
          failedAttemptCount,
          lockedUntil:
            failedAttemptCount >= 5
              ? new Date(now.getTime() + 15 * 60 * 1000)
              : null,
        },
        where: { id: domainCredential.id },
      })
    }
    return null
  }

  return prisma.$transaction(async (tx) => {
    await tx.qaTesterCredential.update({
      data: { failedAttemptCount: 0, lastUsedAt: now, lockedUntil: null },
      where: { id: credential.id },
    })
    return tx.qaClientAuthorization.create({
      data: {
        clientKind: input.clientKind,
        clientSignalHash: input.clientSignalHash,
        contractVersion: input.contractVersion,
        credentialId: credential.id,
        environment: input.environment,
        expiresAt: input.expiresAt,
        qaDomain: input.qaDomain,
        tokenHash: input.tokenHash,
      },
    })
  })
}

export async function getQaAuthorizationByToken(input: {
  clientSignalHash: string
  tokenHash: string
}) {
  const prisma = createPrismaClient()
  const now = new Date()
  if (!prisma) {
    return (
      [...seedAuthorizations.values()].find(
        (record) =>
          record.tokenHash === input.tokenHash &&
          record.clientSignalHash === input.clientSignalHash &&
          !record.revokedAt &&
          record.expiresAt > now
      ) ?? null
    )
  }
  return prisma.qaClientAuthorization.findFirst({
    where: {
      clientSignalHash: input.clientSignalHash,
      credential: { expiresAt: { gt: now }, revokedAt: null },
      expiresAt: { gt: now },
      revokedAt: null,
      tokenHash: input.tokenHash,
    },
  })
}

export async function isQaAuthorizationActive(id: string) {
  return Boolean(await getActiveQaAuthorization(id))
}

export async function getActiveQaAuthorization(id: string) {
  const prisma = createPrismaClient()
  const now = new Date()
  if (!prisma) {
    const record = seedAuthorizations.get(id)
    return record && !record.revokedAt && record.expiresAt > now ? record : null
  }
  return prisma.qaClientAuthorization.findFirst({
    where: {
      credential: { expiresAt: { gt: now }, revokedAt: null },
      expiresAt: { gt: now },
      id,
      revokedAt: null,
    },
  })
}

export async function listQaAccessProfiles(qaDomain: string) {
  const prisma = createPrismaClient()
  if (!prisma) {
    return qaDomain === "safa.qa.test" ? seedQaProfiles : []
  }
  const memberships = await prisma.membership.findMany({
    include: {
      tenant: true,
      user: { include: { memberProfile: true } },
    },
    orderBy: [{ tenant: { name: "asc" } }, { user: { fullName: "asc" } }],
    where: {
      tenant: {
        dataClassification: "qa",
        qaPurgeStartedAt: null,
        qaSourceDomain: qaDomain,
        status: "active",
      },
      user: { deletedAt: null },
    },
  })
  return memberships.map(
    (membership) =>
      ({
        member: membership.user.memberProfile
          ? {
              code: membership.user.memberProfile.memberNumber,
              id: membership.user.memberProfile.id,
            }
          : null,
        membership: {
          id: membership.id,
          isDefault: membership.isDefault,
          role: membership.role,
          tenantId: membership.tenantId,
          userId: membership.userId,
        },
        tenant: mapTenant(membership.tenant),
        user: {
          email: membership.user.email,
          fullName: membership.user.fullName,
          id: membership.user.id,
          isPlatformOwner: membership.user.isPlatformOwner,
          tenantId: membership.user.tenantId,
        },
      }) satisfies QaAccessProfileRecord
  )
}

/** Server-authorized domain entry uses an expiring system receipt, never a client credential. */
export async function authorizeQaDomainClient(
  input: Omit<
    Parameters<typeof authorizeQaClient>[0],
    "credentialDigest" | "fallbackCredentialDigest"
  > & { receiptDigest: string }
) {
  if (!["local", "development", "preview"].includes(input.environment))
    return null
  if (!(await listQaAccessProfiles(input.qaDomain)).length) return null
  const prisma = createPrismaClient()
  let expiresAt = input.expiresAt
  if (prisma) {
    const grant = await prisma.qaTesterCredential.upsert({
      where: { credentialDigest: input.receiptDigest },
      create: {
        credentialDigest: input.receiptDigest,
        qaDomain: input.qaDomain,
        testerLabel: "system-domain-entry",
        createdByUserId: null,
        expiresAt: input.expiresAt,
      },
      update: {},
    })
    if (grant.revokedAt || grant.expiresAt <= new Date()) return null
    expiresAt = new Date(
      Math.min(expiresAt.getTime(), grant.expiresAt.getTime())
    )
  }
  return authorizeQaClient({
    ...input,
    expiresAt,
    credentialDigest: input.receiptDigest,
    fallbackCredentialDigest: input.receiptDigest,
  })
}
