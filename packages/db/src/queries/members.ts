import { createPrismaClient } from "../prisma.js"
import type { PrismaClient } from "../generated/prisma/client.js"
import type { MemberStatus, MemberType } from "../generated/prisma/client.js"

export type ListMembersFilters = {
  status?: MemberStatus
  memberType?: MemberType
  search?: string
  page?: number
  pageSize?: number
}

export async function listMembers(
  tenantId: string,
  filters?: ListMembersFilters,
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const page = filters?.page ?? 1
  const pageSize = filters?.pageSize ?? 25

  const where = {
    tenantId,
    ...(filters?.status && { status: filters.status }),
    ...(filters?.memberType && { memberType: filters.memberType }),
    ...(filters?.search && {
      OR: [
        { fullName: { contains: filters.search, mode: "insensitive" as const } },
        { memberNumber: { contains: filters.search, mode: "insensitive" as const } },
      ],
    }),
  }

  const [items, total] = await Promise.all([
    prisma.member.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        deductionSource: true,
        user: { select: { id: true, email: true, fullName: true } },
      },
    }),
    prisma.member.count({ where }),
  ])

  return { items, total, page, pageSize }
}

export async function getMemberById(
  tenantId: string,
  memberId: string,
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.member.findFirst({
    where: { id: memberId, tenantId },
    include: {
      deductionSource: true,
      user: { select: { id: true, email: true, fullName: true } },
      contributionPlans: { where: { isActive: true } },
    },
  })
}

export type CreateMemberInput = {
  tenantId: string
  memberNumber: string
  fullName: string
  memberType: MemberType
  joinedAt: Date
  userId?: string
  deductionSourceId?: string
  actorUserId: string
}

export async function createMember(
  input: CreateMemberInput,
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.$transaction(async (tx) => {
    const member = await tx.member.create({
      data: {
        tenantId: input.tenantId,
        memberNumber: input.memberNumber,
        fullName: input.fullName,
        memberType: input.memberType,
        joinedAt: input.joinedAt,
        userId: input.userId,
        deductionSourceId: input.deductionSourceId,
        status: "active",
      },
    })

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        actorType: "user",
        action: "member.created",
        entityType: "Member",
        entityId: member.id,
        metadata: {
          memberNumber: member.memberNumber,
          fullName: member.fullName,
          memberType: member.memberType,
        },
        occurredAt: new Date(),
      },
    })

    return member
  })
}

export type UpdateMemberInput = {
  fullName?: string
  memberType?: MemberType
  deductionSourceId?: string | null
  actorUserId: string
}

export async function updateMember(
  tenantId: string,
  memberId: string,
  input: UpdateMemberInput,
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.$transaction(async (tx) => {
    const member = await tx.member.update({
      where: { id: memberId, tenantId },
      data: {
        ...(input.fullName !== undefined && { fullName: input.fullName }),
        ...(input.memberType !== undefined && { memberType: input.memberType }),
        ...(input.deductionSourceId !== undefined && { deductionSourceId: input.deductionSourceId }),
      },
    })

    await tx.auditLog.create({
      data: {
        tenantId,
        actorUserId: input.actorUserId,
        actorType: "user",
        action: "member.updated",
        entityType: "Member",
        entityId: member.id,
        metadata: {
          fullName: input.fullName,
          memberType: input.memberType,
        },
        occurredAt: new Date(),
      },
    })

    return member
  })
}

export async function updateMemberStatus(
  tenantId: string,
  memberId: string,
  newStatus: MemberStatus,
  actorUserId: string,
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.$transaction(async (tx) => {
    const member = await tx.member.update({
      where: { id: memberId, tenantId },
      data: {
        status: newStatus,
        ...(newStatus === "exited" && { exitedAt: new Date() }),
      },
    })

    await tx.auditLog.create({
      data: {
        tenantId,
        actorUserId,
        actorType: "user",
        action: "member.status_changed",
        entityType: "Member",
        entityId: member.id,
        metadata: { newStatus },
        occurredAt: new Date(),
      },
    })

    return member
  })
}
