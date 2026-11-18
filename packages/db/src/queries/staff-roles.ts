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
 * reachable: a person's last role can't be removed (use
 * removeTenantPersonFromCooperative), an admin can't remove their own admin
 * role, the last cooperative admin can't be removed, and member logins are
 * not removed here.
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

    const otherRoleCount = await tx.membership.count({
      where: {
        tenantId: input.tenantId,
        userId: membership.userId,
        id: { not: membership.id },
      },
    })

    if (otherRoleCount === 0) {
      throw ExpectedQueryError.precondition(
        "This is their only role. Use Remove from cooperative instead."
      )
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

export type RemovedTenantPerson = {
  email: string
  fullName: string
  removalId: string
  removedAt: Date
  roles: MembershipRole[]
  userId: string
}

/** People removed from the cooperative who can be restored, newest first. */
export async function listRemovedTenantPeople(
  tenantId: string
): Promise<RemovedTenantPerson[]> {
  const prisma = createPrismaClient()

  if (!prisma) {
    return []
  }

  const removals = await prisma.membershipRemoval.findMany({
    where: { tenantId, restoredAt: null, user: { deletedAt: null } },
    orderBy: { removedAt: "desc" },
    select: {
      id: true,
      removedAt: true,
      roles: true,
      userId: true,
      user: { select: { email: true, fullName: true } },
    },
    take: 200,
  })

  return removals.map((removal) => ({
    email: removal.user.email,
    fullName: removal.user.fullName,
    removalId: removal.id,
    removedAt: removal.removedAt,
    roles: removal.roles,
    userId: removal.userId,
  }))
}

/**
 * "Remove from cooperative": takes all of a staff person's roles in this
 * cooperative away at once and records them so an admin can restore them.
 * Their account, ledger and audit history stay, and roles they hold in other
 * cooperatives are untouched. Their phone sign-ins for this cooperative end.
 * Same guards as removing one role: not yourself, not the only admin, not a
 * member login (managed from the member's record), and a platform admin only
 * by a platform admin.
 */
export async function removeTenantPersonFromCooperative(input: {
  actorUserId: string
  /** Platform admins may remove another platform admin; cooperative admins can't. */
  canRemovePlatformAdmin: boolean
  tenantId: string
  userId: string
}) {
  const prisma = createPrismaClient()

  if (!prisma) {
    throw new Error("Database not configured")
  }

  return prisma.$transaction(async (tx) => {
    const memberships = await tx.membership.findMany({
      where: { tenantId: input.tenantId, userId: input.userId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        role: true,
        user: { select: { email: true, fullName: true } },
      },
    })
    const person = memberships[0]?.user

    if (!person) {
      throw ExpectedQueryError.notFound(
        "This person was already removed from the cooperative."
      )
    }

    const roles = memberships.map((membership) => membership.role)

    if (input.userId === input.actorUserId) {
      throw ExpectedQueryError.precondition(
        "You can't remove yourself. Ask another admin to do it."
      )
    }

    if (roles.includes("member")) {
      throw ExpectedQueryError.precondition(
        "This person is also a member. Member logins are managed from the member's record."
      )
    }

    if (roles.includes("super_admin") && !input.canRemovePlatformAdmin) {
      throw ExpectedQueryError.permission(
        "Only Halaalvest staff can remove a platform admin."
      )
    }

    if (roles.includes("tenant_admin")) {
      const otherAdmins = await tx.membership.count({
        where: {
          tenantId: input.tenantId,
          role: "tenant_admin",
          userId: { not: input.userId },
          user: { deletedAt: null },
        },
      })

      if (otherAdmins === 0) {
        throw ExpectedQueryError.precondition(
          "This is the cooperative's only admin. Add another admin first."
        )
      }
    }

    const now = new Date()

    await tx.membership.deleteMany({
      where: { tenantId: input.tenantId, userId: input.userId },
    })
    await tx.mobileDeviceSession.updateMany({
      where: {
        tenantId: input.tenantId,
        userId: input.userId,
        revokedAt: null,
      },
      data: {
        revocationReason: "removed_from_cooperative",
        revokedAt: now,
        revokedByUserId: input.actorUserId,
      },
    })

    const removal = await tx.membershipRemoval.create({
      data: {
        removedAt: now,
        removedByUserId: input.actorUserId,
        roles,
        tenantId: input.tenantId,
        userId: input.userId,
      },
      select: { id: true },
    })

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        actorType: "user",
        action: "membership.person_removed",
        entityType: "MembershipRemoval",
        entityId: removal.id,
        metadata: {
          email: person.email,
          fullName: person.fullName,
          roles,
          userId: input.userId,
        },
        occurredAt: now,
      },
    })

    return { fullName: person.fullName, removalId: removal.id, roles }
  })
}

/**
 * Undoes "Remove from cooperative": gives the person back the roles they had.
 * A platform admin role comes back only when a platform admin restores it.
 */
export async function restoreTenantPerson(input: {
  actorUserId: string
  canRestorePlatformAdmin: boolean
  removalId: string
  tenantId: string
}) {
  const prisma = createPrismaClient()

  if (!prisma) {
    throw new Error("Database not configured")
  }

  return prisma.$transaction(async (tx) => {
    const removal = await tx.membershipRemoval.findFirst({
      where: { id: input.removalId, tenantId: input.tenantId },
      select: {
        id: true,
        restoredAt: true,
        roles: true,
        userId: true,
        user: { select: { deletedAt: true, email: true, fullName: true } },
      },
    })

    if (!removal) {
      throw ExpectedQueryError.notFound("That removal wasn't found.")
    }

    if (removal.restoredAt) {
      throw ExpectedQueryError.conflict(
        `${removal.user.fullName} was already restored.`
      )
    }

    if (removal.user.deletedAt) {
      throw ExpectedQueryError.precondition(
        "This account was deleted, so it can't be restored."
      )
    }

    if (removal.roles.includes("super_admin") && !input.canRestorePlatformAdmin) {
      throw ExpectedQueryError.permission(
        "Only Halaalvest staff can restore a platform admin."
      )
    }

    const existing = await tx.membership.findMany({
      where: { tenantId: input.tenantId, userId: removal.userId },
      select: { isDefault: true, role: true },
    })
    const missing = removal.roles.filter(
      (role) => !existing.some((membership) => membership.role === role)
    )
    const needsDefault = !existing.some((membership) => membership.isDefault)

    if (missing.length > 0) {
      await tx.membership.createMany({
        data: missing.map((role, index) => ({
          isDefault: needsDefault && index === 0,
          role,
          tenantId: input.tenantId,
          userId: removal.userId,
        })),
        skipDuplicates: true,
      })
    }

    const now = new Date()

    await tx.membershipRemoval.update({
      where: { id: removal.id },
      data: { restoredAt: now, restoredByUserId: input.actorUserId },
    })

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        actorType: "user",
        action: "membership.person_restored",
        entityType: "MembershipRemoval",
        entityId: removal.id,
        metadata: {
          email: removal.user.email,
          fullName: removal.user.fullName,
          roles: removal.roles,
          userId: removal.userId,
        },
        occurredAt: now,
      },
    })

    return { fullName: removal.user.fullName, roles: removal.roles }
  })
}
