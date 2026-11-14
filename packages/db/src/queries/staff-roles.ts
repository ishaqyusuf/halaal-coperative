import type { MembershipRole } from "./auth"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError } from "../query-error"

const adminRoles: MembershipRole[] = ["super_admin", "tenant_admin"]

export type TenantStaffPerson = {
  email: string
  fullName: string
  id: string
  roles: Array<{
    id: string
    isDefault: boolean
    role: MembershipRole
  }>
}

/**
 * People who hold a staff role in the cooperative, with each of their roles
 * (a member login they also have is included so the row is complete).
 * Member-only logins are left out: a cooperative can have thousands.
 * Two statements: the people, then their roles.
 */
export async function listTenantStaffPeople(
  tenantId: string
): Promise<TenantStaffPerson[]> {
  const prisma = createPrismaClient()

  if (!prisma) {
    return []
  }

  const users = await prisma.user.findMany({
    where: {
      tenantId,
      deletedAt: null,
      memberships: { some: { tenantId, role: { not: "member" } } },
    },
    select: {
      email: true,
      fullName: true,
      id: true,
      memberships: {
        where: { tenantId },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        select: { id: true, isDefault: true, role: true },
      },
    },
    orderBy: { fullName: "asc" },
    take: 500,
  })

  return users.map((user) => ({
    email: user.email,
    fullName: user.fullName,
    id: user.id,
    roles: user.memberships,
  }))
}

/**
 * Takes one staff role away from a person. Guards that keep the cooperative
 * reachable: an admin can't remove their own admin role, the last
 * cooperative admin can't be removed, and member logins are not removed here.
 * If the removed role was the one opened first at sign-in, the person's
 * oldest other role takes its place.
 */
export async function removeTenantStaffRole(input: {
  actorUserId: string
  /** The role the admin confirmed; refused if the row now holds another. */
  expectedRole: MembershipRole
  membershipId: string
  tenantId: string
}) {
  const prisma = createPrismaClient()

  if (!prisma) {
    throw new Error("Database not configured")
  }

  return prisma.$transaction(async (tx) => {
    const membership = await tx.membership.findFirst({
      where: { id: input.membershipId, tenantId: input.tenantId },
      select: {
        id: true,
        isDefault: true,
        role: true,
        userId: true,
        user: { select: { email: true, fullName: true } },
      },
    })

    if (!membership) {
      throw ExpectedQueryError.notFound("That role was already removed.")
    }

    if (membership.role !== input.expectedRole) {
      throw ExpectedQueryError.conflict(
        "This role changed while you were looking. Reload the page."
      )
    }

    if (membership.role === "member") {
      throw ExpectedQueryError.precondition(
        "Member logins are managed from the member's record."
      )
    }

    if (adminRoles.includes(membership.role)) {
      if (membership.userId === input.actorUserId) {
        throw ExpectedQueryError.precondition(
          "You can't remove your own admin role. Ask another admin to do it."
        )
      }

      const otherAdmins = await tx.membership.count({
        where: {
          tenantId: input.tenantId,
          role: "tenant_admin",
          id: { not: membership.id },
          user: { deletedAt: null },
        },
      })

      if (membership.role === "tenant_admin" && otherAdmins === 0) {
        throw ExpectedQueryError.precondition(
          "This is the cooperative's only admin. Add another admin first."
        )
      }
    }

    await tx.membership.delete({ where: { id: membership.id } })

    const remaining = await tx.membership.findMany({
      where: { tenantId: input.tenantId, userId: membership.userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, isDefault: true, role: true },
    })

    if (membership.isDefault && remaining[0] && !remaining.some((m) => m.isDefault)) {
      await tx.membership.update({
        where: { id: remaining[0].id },
        data: { isDefault: true },
      })
    }

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        actorType: "user",
        action: "membership.removed",
        entityType: "Membership",
        entityId: membership.id,
        metadata: {
          email: membership.user.email,
          fullName: membership.user.fullName,
          remainingRoles: remaining.map((m) => m.role),
          role: membership.role,
          userId: membership.userId,
        },
        occurredAt: new Date(),
      },
    })

    return {
      fullName: membership.user.fullName,
      remainingRoles: remaining.map((m) => m.role),
      role: membership.role,
    }
  })
}
