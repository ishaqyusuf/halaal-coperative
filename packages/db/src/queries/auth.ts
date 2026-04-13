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
    email: "owner@halaal-vest.local",
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

export async function findMembershipsForUserAsync(userId: string | null | undefined) {
  if (!userId) {
    return []
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
import { createPrismaClient } from "../prisma.js"
