import { createPrismaClient } from "../prisma"

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuidLike(value: string | null | undefined) {
  return Boolean(value && uuidPattern.test(value))
}

export type MembershipRole =
  | "super_admin"
  | "tenant_admin"
  | "finance_officer"
  | "operations_officer"
  | "member"

export type UserRecord = {
  id: string
  tenantId: string
  email: string
  fullName: string
  isPlatformOwner: boolean
}

export type UserCredentialRecord = UserRecord & {
  passwordHash: string | null
  phoneNumber: string | null
}

export type MembershipRecord = {
  id: string
  tenantId: string
  userId: string
  role: MembershipRole
  isDefault: boolean
}

const seedUsers: UserRecord[] = [
  {
    id: "user-platform-owner",
    tenantId: "tenant-amanah-demo",
    email: "owner@halaalvest.local",
    fullName: "Platform Owner",
    isPlatformOwner: true,
  },
  {
    id: "user-tenant-admin-amanah",
    tenantId: "tenant-amanah-demo",
    email: "admin@amanah.local",
    fullName: "Amanah Admin",
    isPlatformOwner: false,
  },
  {
    id: "user-finance-barakah",
    tenantId: "tenant-barakah-demo",
    email: "finance@barakah.local",
    fullName: "Barakah Finance",
    isPlatformOwner: false,
  },
]

const seedMemberships: MembershipRecord[] = [
  {
    id: "membership-platform-owner",
    tenantId: "tenant-amanah-demo",
    userId: "user-platform-owner",
    role: "super_admin",
    isDefault: true,
  },
  {
    id: "membership-amanah-admin",
    tenantId: "tenant-amanah-demo",
    userId: "user-tenant-admin-amanah",
    role: "tenant_admin",
    isDefault: true,
  },
  {
    id: "membership-barakah-finance",
    tenantId: "tenant-barakah-demo",
    userId: "user-finance-barakah",
    role: "finance_officer",
    isDefault: true,
  },
]

export function listSeedUsers() {
  return seedUsers
}

export function listSeedMemberships() {
  return seedMemberships
}

export function findUserById(userId: string | null | undefined) {
  if (!userId) {
    return null
  }

  return seedUsers.find((user) => user.id === userId) ?? null
}

export function findMembershipsForUser(userId: string | null | undefined) {
  if (!userId) {
    return []
  }

  return seedMemberships.filter((membership) => membership.userId === userId)
}

export function findActiveMembership(input: {
  tenantId?: string | null
  userId?: string | null
}) {
  const memberships = findMembershipsForUser(input.userId)

  if (memberships.length === 0) {
    return null
  }

  if (input.tenantId) {
    return memberships.find((membership) => membership.tenantId === input.tenantId) ?? null
  }

  return memberships.find((membership) => membership.isDefault) ?? memberships[0] ?? null
}

export async function findUserByIdAsync(userId: string | null | undefined) {
  if (!userId) {
    return null
  }

  if (!isUuidLike(userId)) {
    return findUserById(userId)
  }

  const prisma = createPrismaClient()

  if (!prisma) {
    return findUserById(userId)
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  })

  if (!user) {
    return null
  }

  return {
    id: user.id,
    tenantId: user.tenantId,
    email: user.email,
    fullName: user.fullName,
    isPlatformOwner: user.isPlatformOwner,
  } satisfies UserRecord
}

export async function findUserByEmailAsync(input: {
  email: string
  tenantId?: string | null
}) {
  const normalizedEmail = input.email.trim().toLowerCase()

  if (!normalizedEmail) {
    return null
  }

  const prisma = createPrismaClient()

  if (!prisma) {
    const user = seedUsers.find(
      (candidate) =>
        candidate.email.toLowerCase() === normalizedEmail &&
        (!input.tenantId || candidate.tenantId === input.tenantId),
    )

    if (!user) {
      return null
    }

    return {
      ...user,
      passwordHash: null,
      phoneNumber: null,
    } satisfies UserCredentialRecord
  }

  const user = await prisma.user.findFirst({
    where: {
      email: normalizedEmail,
      deletedAt: null,
      ...(input.tenantId ? { tenantId: input.tenantId } : {}),
    },
  })

  if (!user) {
    return null
  }

  return {
    id: user.id,
    tenantId: user.tenantId,
    email: user.email,
    fullName: user.fullName,
    isPlatformOwner: user.isPlatformOwner,
    passwordHash: user.passwordHash,
    phoneNumber: user.phoneNumber,
  } satisfies UserCredentialRecord
}

export async function findMembershipsForUserAsync(userId: string | null | undefined) {
  if (!userId) {
    return []
  }

  if (!isUuidLike(userId)) {
    return findMembershipsForUser(userId)
  }

  const prisma = createPrismaClient()

  if (!prisma) {
    return findMembershipsForUser(userId)
  }

  const memberships = await prisma.membership.findMany({
    where: {
      userId,
    },
  })

  return memberships.map(
    (membership) =>
      ({
        id: membership.id,
        tenantId: membership.tenantId,
        userId: membership.userId,
        role: membership.role,
        isDefault: membership.isDefault,
      }) satisfies MembershipRecord,
  )
}

export async function findActiveMembershipAsync(input: {
  tenantId?: string | null
  userId?: string | null
}) {
  const memberships = await findMembershipsForUserAsync(input.userId)

  if (memberships.length === 0) {
    return null
  }

  if (input.tenantId) {
    return memberships.find((membership) => membership.tenantId === input.tenantId) ?? null
  }

  return memberships.find((membership) => membership.isDefault) ?? memberships[0] ?? null
}

export async function listTenantUsersWithMemberships(tenantId: string) {
  const prisma = createPrismaClient()

  if (!prisma) {
    return seedUsers
      .filter((user) => user.tenantId === tenantId)
      .map((user) => ({
        ...user,
        memberships: seedMemberships.filter((membership) => membership.userId === user.id),
      }))
  }

  const users = await prisma.user.findMany({
    where: {
      tenantId,
      deletedAt: null,
    },
    include: {
      memberships: {
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  })

  return users.map((user) => ({
    id: user.id,
    tenantId: user.tenantId,
    email: user.email,
    fullName: user.fullName,
    isPlatformOwner: user.isPlatformOwner,
    memberships: user.memberships.map((membership) => ({
      id: membership.id,
      tenantId: membership.tenantId,
      userId: membership.userId,
      role: membership.role,
      isDefault: membership.isDefault,
    })),
  }))
}

export async function provisionTenantUserRole(input: {
  actorUserId: string
  email: string
  fullName: string
  makeDefault?: boolean
  role: MembershipRole
  tenantId: string
}) {
  const prisma = createPrismaClient()

  if (!prisma) {
    throw new Error("Database not configured")
  }

  const normalizedEmail = input.email.trim().toLowerCase()
  const normalizedFullName = input.fullName.trim()

  if (!normalizedEmail || !normalizedFullName) {
    throw new Error("Full name and email are required.")
  }

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: {
        tenantId_email: {
          tenantId: input.tenantId,
          email: normalizedEmail,
        },
      },
      update: {
        fullName: normalizedFullName,
      },
      create: {
        tenantId: input.tenantId,
        email: normalizedEmail,
        fullName: normalizedFullName,
      },
    })

    if (input.makeDefault) {
      await tx.membership.updateMany({
        where: {
          tenantId: input.tenantId,
          userId: user.id,
        },
        data: {
          isDefault: false,
        },
      })
    }

    const membership = await tx.membership.upsert({
      where: {
        tenantId_userId_role: {
          tenantId: input.tenantId,
          userId: user.id,
          role: input.role,
        },
      },
      update: {
        isDefault: input.makeDefault ?? false,
      },
      create: {
        tenantId: input.tenantId,
        userId: user.id,
        role: input.role,
        isDefault: input.makeDefault ?? false,
      },
    })

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        actorType: "user",
        action: "membership.provisioned",
        entityType: "Membership",
        entityId: membership.id,
        metadata: {
          email: normalizedEmail,
          fullName: normalizedFullName,
          isDefault: membership.isDefault,
          role: membership.role,
          userId: user.id,
        },
        occurredAt: new Date(),
      },
    })

    return {
      membership: {
        id: membership.id,
        tenantId: membership.tenantId,
        userId: membership.userId,
        role: membership.role,
        isDefault: membership.isDefault,
      } satisfies MembershipRecord,
      user: {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        fullName: user.fullName,
        isPlatformOwner: user.isPlatformOwner,
      } satisfies UserRecord,
    }
  })
}
