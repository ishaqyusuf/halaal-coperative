import type {
  MemberOnboardingStatus,
  PrismaClient,
} from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { createMemberWithState, type CreateMemberInput } from "./members"
import { getTenantInitialMigrationState } from "./migration"

export type ListMemberOnboardingFilters = {
  page?: number
  pageSize?: number
  search?: string
  status?: MemberOnboardingStatus
}

async function assertMemberOnboardingWritesOpen(
  tenantId: string,
  prisma: PrismaClient
) {
  const migrationState = await getTenantInitialMigrationState(tenantId, prisma)

  if (!migrationState.snapshot.canUseLiveFinancialWrites) {
    throw new Error(
      "Member onboarding writes are locked until initial migration is finalized."
    )
  }
}

export async function createMemberOnboardingRequest(
  input: {
    email: string
    fullName: string
    memberNumber: string
    passwordHash: string
    phoneNumber?: string | null
    signupLinkId?: string | null
    signupLinkTokenVersion?: number | null
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  await assertMemberOnboardingWritesOpen(input.tenantId, prisma)

  const normalizedEmail = input.email.trim().toLowerCase()
  const normalizedMemberNumber = input.memberNumber.trim()
  const normalizedFullName = input.fullName.trim()
  const normalizedPhoneNumber = input.phoneNumber?.trim() || null

  if (
    !normalizedEmail ||
    !normalizedMemberNumber ||
    !normalizedFullName ||
    !input.passwordHash
  ) {
    throw new Error("Name, email, member number, and password are required.")
  }

  return prisma.$transaction(async (tx) => {
    if (input.signupLinkId) {
      const signupLink = await tx.memberSignupLink.findFirst({
        where: {
          id: input.signupLinkId,
          tenantId: input.tenantId,
        },
        select: {
          expiresAt: true,
          id: true,
          isEnabled: true,
          maxSignups: true,
          tokenVersion: true,
        },
      })

      if (!signupLink) {
        throw new Error("This member signup link could not be found.")
      }

      if (signupLink.tokenVersion !== input.signupLinkTokenVersion) {
        throw new Error(
          "This member signup link has been replaced. Ask the cooperative for the latest link."
        )
      }

      if (!signupLink.isEnabled) {
        throw new Error("This member signup link is currently disabled.")
      }

      if (
        signupLink.expiresAt &&
        signupLink.expiresAt.getTime() <= Date.now()
      ) {
        throw new Error("This member signup link has expired.")
      }

      if (signupLink.maxSignups !== null) {
        const usedCount = await tx.memberOnboardingRequest.count({
          where: {
            signupLinkId: signupLink.id,
            tenantId: input.tenantId,
          },
        })

        if (usedCount >= signupLink.maxSignups) {
          throw new Error(
            "This member signup link has reached its signup limit."
          )
        }
      }
    }

    const existingMember = await tx.member.findFirst({
      where: {
        tenantId: input.tenantId,
        OR: [
          { memberNumber: normalizedMemberNumber },
          { user: { email: normalizedEmail } },
        ],
      },
    })

    if (existingMember) {
      throw new Error(
        "A member already exists with this cooperative number or email."
      )
    }

    const existingOnboarding = await tx.memberOnboardingRequest.findFirst({
      where: {
        tenantId: input.tenantId,
        OR: [
          { email: normalizedEmail },
          { memberNumber: normalizedMemberNumber },
        ],
        status: {
          in: ["pending_email_verification", "pending_approval", "approved"],
        },
      },
    })

    if (existingOnboarding) {
      throw new Error(
        "An onboarding request already exists for this email or cooperative number."
      )
    }

    const user = await tx.user.create({
      data: {
        email: normalizedEmail,
        fullName: normalizedFullName,
        passwordHash: input.passwordHash,
        phoneNumber: normalizedPhoneNumber,
        tenantId: input.tenantId,
      },
    })

    const request = await tx.memberOnboardingRequest.create({
      data: {
        email: normalizedEmail,
        fullName: normalizedFullName,
        memberNumber: normalizedMemberNumber,
        phoneNumber: normalizedPhoneNumber,
        signupLinkId: input.signupLinkId ?? null,
        tenantId: input.tenantId,
        userId: user.id,
      },
    })

    if (input.signupLinkId) {
      await tx.memberSignupLink.update({
        where: {
          id: input.signupLinkId,
        },
        data: {
          lastUsedAt: new Date(),
        },
      })
    }

    await tx.auditLog.create({
      data: {
        action: "member_onboarding.requested",
        actorType: "user",
        actorUserId: user.id,
        entityId: request.id,
        entityType: "MemberOnboardingRequest",
        metadata: {
          email: normalizedEmail,
          fullName: normalizedFullName,
          memberNumber: normalizedMemberNumber,
          phoneNumber: normalizedPhoneNumber,
          signupLinkId: input.signupLinkId ?? null,
          status: request.status,
        },
        occurredAt: new Date(),
        tenantId: input.tenantId,
      },
    })

    return {
      request,
      user,
    }
  })
}

export async function verifyMemberOnboardingRequest(
  input: {
    requestId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  await assertMemberOnboardingWritesOpen(input.tenantId, prisma)

  return prisma.$transaction(async (tx) => {
    const request = await tx.memberOnboardingRequest.findFirst({
      where: {
        id: input.requestId,
        tenantId: input.tenantId,
      },
    })

    if (!request) {
      throw new Error("Onboarding request not found.")
    }

    if (request.status === "approved") {
      return request
    }

    if (request.status === "rejected" || request.status === "cancelled") {
      throw new Error("This onboarding request is no longer active.")
    }

    const nextStatus: MemberOnboardingStatus =
      request.emailVerifiedAt || request.status === "pending_approval"
        ? request.status
        : "pending_approval"

    const updated = await tx.memberOnboardingRequest.update({
      where: {
        id: request.id,
      },
      data: {
        emailVerifiedAt: request.emailVerifiedAt ?? new Date(),
        status: nextStatus,
      },
    })

    await tx.auditLog.create({
      data: {
        action: "member_onboarding.email_verified",
        actorType: "user",
        actorUserId: request.userId,
        entityId: request.id,
        entityType: "MemberOnboardingRequest",
        metadata: {
          status: updated.status,
        },
        occurredAt: new Date(),
        tenantId: input.tenantId,
      },
    })

    return updated
  })
}

export async function listMemberOnboardingRequests(
  tenantId: string,
  filters?: ListMemberOnboardingFilters,
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const page = filters?.page ?? 1
  const pageSize = filters?.pageSize ?? 25

  const where = {
    tenantId,
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.search
      ? {
          OR: [
            {
              fullName: {
                contains: filters.search,
                mode: "insensitive" as const,
              },
            },
            {
              email: { contains: filters.search, mode: "insensitive" as const },
            },
            {
              memberNumber: {
                contains: filters.search,
                mode: "insensitive" as const,
              },
            },
            {
              phoneNumber: {
                contains: filters.search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
  }

  const [items, total] = await Promise.all([
    prisma.memberOnboardingRequest.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phoneNumber: true,
          },
        },
      },
    }),
    prisma.memberOnboardingRequest.count({ where }),
  ])

  return { items, total, page, pageSize }
}

export async function getMemberOnboardingRequestById(
  tenantId: string,
  requestId: string,
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.memberOnboardingRequest.findFirst({
    where: {
      id: requestId,
      tenantId,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          phoneNumber: true,
        },
      },
    },
  })
}

export async function getPendingMemberOnboardingForUser(
  input: {
    tenantId: string
    userId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) {
    return null
  }

  return prisma.memberOnboardingRequest.findFirst({
    where: {
      tenantId: input.tenantId,
      userId: input.userId,
      status: {
        in: ["pending_email_verification", "pending_approval"],
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })
}

export async function approveMemberOnboardingRequest(
  input: {
    actorUserId: string
    requestId: string
    tenantId: string
    reviewNotes?: string | null
    memberState?: Pick<
      CreateMemberInput,
      "currentSavingsBalance" | "monthlyCommitment" | "servingLoan"
    >
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.$transaction(async (tx) => {
    const migrationState = await getTenantInitialMigrationState(
      input.tenantId,
      tx as PrismaClient
    )

    if (!migrationState.snapshot.canUseLiveFinancialWrites) {
      throw new Error(
        "Member onboarding approvals are locked until initial migration is finalized."
      )
    }

    const request = await tx.memberOnboardingRequest.findFirst({
      where: {
        id: input.requestId,
        tenantId: input.tenantId,
      },
      include: {
        user: true,
      },
    })

    if (!request) {
      throw new Error("Onboarding request not found.")
    }

    if (request.status !== "pending_approval") {
      throw new Error("Only verified onboarding requests can be approved.")
    }

    const existingMember = await tx.member.findFirst({
      where: {
        tenantId: input.tenantId,
        OR: [
          { memberNumber: request.memberNumber },
          { userId: request.userId },
        ],
      },
    })

    if (existingMember) {
      throw new Error(
        "This onboarding request is already linked to an existing member."
      )
    }

    await tx.membership.updateMany({
      where: {
        tenantId: input.tenantId,
        userId: request.userId,
      },
      data: {
        isDefault: false,
      },
    })

    await tx.membership.upsert({
      where: {
        tenantId_userId_role: {
          role: "member",
          tenantId: input.tenantId,
          userId: request.userId,
        },
      },
      update: {
        isDefault: true,
      },
      create: {
        isDefault: true,
        role: "member",
        tenantId: input.tenantId,
        userId: request.userId,
      },
    })

    const member = await createMemberWithState(tx, {
      actorUserId: input.actorUserId,
      currentSavingsBalance: input.memberState?.currentSavingsBalance,
      deductionSourceId: undefined,
      email: request.email,
      fullName: request.fullName,
      joinedAt: new Date(),
      memberNumber: request.memberNumber,
      memberType: "individual",
      monthlyCommitment: input.memberState?.monthlyCommitment,
      phoneNumber: request.phoneNumber,
      servingLoan: input.memberState?.servingLoan,
      tenantId: input.tenantId,
      userId: request.userId,
    })

    const approvedRequest = await tx.memberOnboardingRequest.update({
      where: {
        id: request.id,
      },
      data: {
        approvedAt: new Date(),
        approvedByUserId: input.actorUserId,
        status: "approved",
      },
    })

    await tx.auditLog.create({
      data: {
        action: "member_onboarding.approved",
        actorType: "user",
        actorUserId: input.actorUserId,
        entityId: request.id,
        entityType: "MemberOnboardingRequest",
        metadata: {
          approvedByUserId: input.actorUserId,
          memberId: member.id,
          reviewNotes: input.reviewNotes?.trim() || null,
          status: approvedRequest.status,
          userId: request.userId,
        },
        occurredAt: new Date(),
        tenantId: input.tenantId,
      },
    })

    return {
      member,
      request: approvedRequest,
      user: request.user,
    }
  })
}

export async function rejectMemberOnboardingRequest(
  input: {
    actorUserId: string
    reason?: string | null
    requestId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  await assertMemberOnboardingWritesOpen(input.tenantId, prisma)

  return prisma.$transaction(async (tx) => {
    const request = await tx.memberOnboardingRequest.findFirst({
      where: {
        id: input.requestId,
        tenantId: input.tenantId,
      },
      include: {
        user: true,
      },
    })

    if (!request) {
      throw new Error("Onboarding request not found.")
    }

    const rejected = await tx.memberOnboardingRequest.update({
      where: {
        id: request.id,
      },
      data: {
        rejectedAt: new Date(),
        rejectionReason: input.reason?.trim() || null,
        status: "rejected",
      },
    })

    await tx.auditLog.create({
      data: {
        action: "member_onboarding.rejected",
        actorType: "user",
        actorUserId: input.actorUserId,
        entityId: request.id,
        entityType: "MemberOnboardingRequest",
        metadata: {
          reason: input.reason?.trim() || null,
          status: rejected.status,
          userId: request.userId,
        },
        occurredAt: new Date(),
        tenantId: input.tenantId,
      },
    })

    return {
      request: rejected,
      user: request.user,
    }
  })
}
