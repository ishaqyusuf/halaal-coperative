import type {
  MemberOnboardingStatus,
  PrismaClient,
} from "../../generated/prisma/client"
import { AppError, type ErrorCode } from "@halaalvest/errors"
import { createPrismaClient } from "../prisma"
import { createMemberWithState, type CreateMemberInput } from "./members"
import { getTenantInitialMigrationState } from "./migration"
import { assertQaIdentityLane } from "./qa-maintenance"

export type ListMemberOnboardingFilters = {
  cursor?: string | null
  page?: number
  pageSize?: number
  search?: string
  sort?: [MemberOnboardingSortField, "asc" | "desc"] | null
  status?: MemberOnboardingStatus
}

export type MemberOnboardingSortField =
  | "emailVerifiedAt"
  | "fullName"
  | "memberNumber"
  | "phoneNumber"
  | "status"
  | "submittedAt"

async function assertMemberOnboardingWritesOpen(
  tenantId: string,
  prisma: PrismaClient,
  operation: string
) {
  const migrationState = await getTenantInitialMigrationState(tenantId, prisma)

  if (!migrationState.snapshot.canUseLiveFinancialWrites) {
    throw memberOnboardingError(
      "PRECONDITION_FAILED",
      "Member onboarding writes are locked until initial migration is finalized.",
      operation
    )
  }
}

function memberOnboardingError(
  code: ErrorCode,
  publicMessage: string,
  operation: string
) {
  return new AppError({
    code,
    internalMessage: publicMessage,
    operation,
    publicMessage,
  })
}

function memberOnboardingDatabaseError(operation: string) {
  return new AppError({
    code: "UNEXPECTED",
    internalMessage: "Database not configured",
    operation,
  })
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
  const operation = "memberOnboarding.create"
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw memberOnboardingDatabaseError(operation)
  await assertMemberOnboardingWritesOpen(input.tenantId, prisma, operation)

  const normalizedEmail = input.email.trim().toLowerCase()
  const normalizedMemberNumber = input.memberNumber.trim()
  const normalizedFullName = input.fullName.trim()
  const normalizedPhoneNumber = input.phoneNumber?.trim() || null
  await assertQaIdentityLane({
    email: normalizedEmail,
    prisma,
    tenantId: input.tenantId,
  })

  if (
    !normalizedEmail ||
    !normalizedMemberNumber ||
    !normalizedFullName ||
    !input.passwordHash
  ) {
    throw memberOnboardingError(
      "VALIDATION_FAILED",
      "Name, email, member number, and password are required.",
      operation
    )
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
        throw memberOnboardingError(
          "NOT_FOUND",
          "This member signup link could not be found.",
          operation
        )
      }

      if (signupLink.tokenVersion !== input.signupLinkTokenVersion) {
        throw memberOnboardingError(
          "CONFLICT",
          "This member signup link has been replaced. Ask the cooperative for the latest link.",
          operation
        )
      }

      if (!signupLink.isEnabled) {
        throw memberOnboardingError(
          "PRECONDITION_FAILED",
          "This member signup link is currently disabled.",
          operation
        )
      }

      if (
        signupLink.expiresAt &&
        signupLink.expiresAt.getTime() <= Date.now()
      ) {
        throw memberOnboardingError(
          "PRECONDITION_FAILED",
          "This member signup link has expired.",
          operation
        )
      }

      if (signupLink.maxSignups !== null) {
        const usedCount = await tx.memberOnboardingRequest.count({
          where: {
            signupLinkId: signupLink.id,
            tenantId: input.tenantId,
          },
        })

        if (usedCount >= signupLink.maxSignups) {
          throw memberOnboardingError(
            "PRECONDITION_FAILED",
            "This member signup link has reached its signup limit.",
            operation
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
      throw memberOnboardingError(
        "CONFLICT",
        "A member already exists with this cooperative number or email.",
        operation
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
      throw memberOnboardingError(
        "CONFLICT",
        "An onboarding request already exists for this email or cooperative number.",
        operation
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
  const operation = "memberOnboarding.verify"
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw memberOnboardingDatabaseError(operation)
  await assertMemberOnboardingWritesOpen(input.tenantId, prisma, operation)

  return prisma.$transaction(async (tx) => {
    const request = await tx.memberOnboardingRequest.findFirst({
      where: {
        id: input.requestId,
        tenantId: input.tenantId,
      },
    })

    if (!request) {
      throw memberOnboardingError(
        "NOT_FOUND",
        "Onboarding request not found.",
        operation
      )
    }

    if (request.status === "approved") {
      return request
    }

    if (request.status === "rejected" || request.status === "cancelled") {
      throw memberOnboardingError(
        "CONFLICT",
        "This onboarding request is no longer active.",
        operation
      )
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
  if (!prisma) throw memberOnboardingDatabaseError("memberOnboarding.list")

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

  const [sortField, sortDirection] = filters?.sort ?? ["submittedAt", "desc"]
  const orderBy =
    sortField === "submittedAt"
      ? [{ createdAt: sortDirection }, { id: sortDirection }]
      : sortField === "emailVerifiedAt"
        ? [{ emailVerifiedAt: sortDirection }, { createdAt: "desc" as const }]
        : sortField === "fullName"
          ? [{ fullName: sortDirection }, { createdAt: "desc" as const }]
          : sortField === "memberNumber"
            ? [{ memberNumber: sortDirection }, { createdAt: "desc" as const }]
            : sortField === "phoneNumber"
              ? [{ phoneNumber: sortDirection }, { createdAt: "desc" as const }]
              : [{ status: sortDirection }, { createdAt: "desc" as const }]

  const [items, total] = await Promise.all([
    prisma.memberOnboardingRequest.findMany({
      where,
      orderBy,
      ...(filters?.cursor
        ? { cursor: { id: filters.cursor }, skip: 1 }
        : { skip: (page - 1) * pageSize }),
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

export async function getMemberOnboardingRequestSummary(
  tenantId: string,
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw memberOnboardingDatabaseError("memberOnboarding.summary")

  const counts = await prisma.memberOnboardingRequest.groupBy({
    by: ["status"],
    where: { tenantId },
    _count: { _all: true },
  })

  const countByStatus = new Map(
    counts.map((row) => [row.status, row._count._all])
  )

  return {
    approvedCount: countByStatus.get("approved") ?? 0,
    awaitingVerificationCount:
      countByStatus.get("pending_email_verification") ?? 0,
    pendingApprovalCount: countByStatus.get("pending_approval") ?? 0,
    rejectedCount: countByStatus.get("rejected") ?? 0,
    total: counts.reduce((total, row) => total + row._count._all, 0),
  }
}

export async function getMemberOnboardingRequestById(
  tenantId: string,
  requestId: string,
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw memberOnboardingDatabaseError("memberOnboarding.getById")

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
  const operation = "memberOnboarding.approve"
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw memberOnboardingDatabaseError(operation)

  return prisma.$transaction(async (tx) => {
    const migrationState = await getTenantInitialMigrationState(
      input.tenantId,
      tx as PrismaClient
    )

    if (!migrationState.snapshot.canUseLiveFinancialWrites) {
      throw memberOnboardingError(
        "PRECONDITION_FAILED",
        "Member onboarding approvals are locked until initial migration is finalized.",
        operation
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
      throw memberOnboardingError(
        "NOT_FOUND",
        "Onboarding request not found.",
        operation
      )
    }

    if (request.status !== "pending_approval") {
      throw memberOnboardingError(
        "PRECONDITION_FAILED",
        "Only verified onboarding requests can be approved.",
        operation
      )
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
      throw memberOnboardingError(
        "CONFLICT",
        "This onboarding request is already linked to an existing member.",
        operation
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
  const operation = "memberOnboarding.reject"
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw memberOnboardingDatabaseError(operation)
  await assertMemberOnboardingWritesOpen(input.tenantId, prisma, operation)

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
      throw memberOnboardingError(
        "NOT_FOUND",
        "Onboarding request not found.",
        operation
      )
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
