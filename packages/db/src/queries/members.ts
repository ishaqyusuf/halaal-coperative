import type {
  KycStatus,
  MemberStatus,
  MemberType,
  PrismaClient,
  RepaymentScheduleStatus,
} from "@prisma/client"
import { createPrismaClient } from "../prisma"
import { getMemberTransactions } from "./ledger"

export type ListMembersFilters = {
  kycStatus?: KycStatus
  joinedFrom?: Date
  joinedTo?: Date
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
    ...(filters?.kycStatus && { kycStatus: filters.kycStatus }),
    ...(filters?.status && { status: filters.status }),
    ...(filters?.memberType && { memberType: filters.memberType }),
    ...((filters?.joinedFrom || filters?.joinedTo) && {
      joinedAt: {
        ...(filters?.joinedFrom && { gte: filters.joinedFrom }),
        ...(filters?.joinedTo && { lte: filters.joinedTo }),
      },
    }),
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
  currentSavingsBalance?: number
  monthlyCommitment?: number
  servingLoan?: {
    amountServed: number
    monthlyCommitment: number
    principalAmount: number
    startDate: Date
  }
  userId?: string
  deductionSourceId?: string
  actorUserId: string
}

function buildRepaymentSchedule(input: {
  principalAmount: number
  startDate: Date
  termMonths: number
}): Array<{
  amountPaid: number
  chargeDue: number
  dueAt: Date
  installmentNumber: number
  principalDue: number
  status: RepaymentScheduleStatus
  totalDue: number
}> {
  const installmentAmount = input.principalAmount / input.termMonths

  return Array.from({ length: input.termMonths }, (_, index) => {
    const dueAt = new Date(input.startDate)
    dueAt.setUTCMonth(dueAt.getUTCMonth() + index + 1)

    const roundedPrincipal = Number(installmentAmount.toFixed(2))

    return {
      amountPaid: 0,
      chargeDue: 0,
      dueAt,
      installmentNumber: index + 1,
      principalDue: roundedPrincipal,
      status: dueAt <= new Date() ? "due" : "pending",
      totalDue: roundedPrincipal,
    }
  })
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
        totalSavingsSnapshot: input.currentSavingsBalance ?? 0,
        userId: input.userId,
        deductionSourceId: input.deductionSourceId,
        status: "active",
      },
    })

    if (input.monthlyCommitment && input.monthlyCommitment > 0) {
      await tx.contributionPlan.create({
        data: {
          amount: input.monthlyCommitment,
          interval: "monthly",
          isActive: true,
          memberId: member.id,
          name: "Monthly commitment",
          startsAt: input.joinedAt,
          tenantId: input.tenantId,
        },
      })
    }

    if (input.servingLoan) {
      const outstandingPrincipal = Number(
        Math.max(0, input.servingLoan.principalAmount - input.servingLoan.amountServed).toFixed(2),
      )
      const termMonths = Math.max(
        1,
        Math.ceil(input.servingLoan.principalAmount / input.servingLoan.monthlyCommitment),
      )
      const estimatedMonthlyServicing = Number(input.servingLoan.monthlyCommitment.toFixed(2))

      const loanProduct = await tx.loanProduct.upsert({
        where: {
          tenantId_name: {
            name: "Imported active loan",
            tenantId: input.tenantId,
          },
        },
        update: {
          isActive: true,
          loanType: "normal",
          maxSavingsMultiple: 2,
          termMonths,
        },
        create: {
          isActive: true,
          loanType: "normal",
          maxSavingsMultiple: 2,
          name: "Imported active loan",
          tenantId: input.tenantId,
          termMonths,
        },
      })

      const request = await tx.loanRequest.create({
        data: {
          availablePoolSnapshot: 0,
          createdByUserId: input.actorUserId,
          eligibleAmountSnapshot: input.currentSavingsBalance ?? 0,
          estimatedMonthlyServicing,
          extraMonthlySavingsAmount: 0,
          loanProductId: loanProduct.id,
          memberId: member.id,
          requestedAmount: input.servingLoan.principalAmount,
          requestedAt: input.servingLoan.startDate,
          requestedTermMonths: termMonths,
          reviewNotes: "Created from member onboarding current-state form.",
          status: "approved",
          tenantId: input.tenantId,
        },
      })

      await tx.loanApproval.create({
        data: {
          action: "approved",
          actedAt: input.servingLoan.startDate,
          actorUserId: input.actorUserId,
          loanRequestId: request.id,
          notes: "Approved during member creation current-state capture.",
          tenantId: input.tenantId,
        },
      })

      const loan = await tx.loan.create({
        data: {
          disbursedAt: input.servingLoan.startDate,
          estimatedMonthlyServicing,
          extraMonthlySavingsAmount: 0,
          firstRepaymentDueAt: input.servingLoan.startDate,
          loanProductId: loanProduct.id,
          loanRequestId: request.id,
          memberId: member.id,
          outstandingPrincipal,
          principalAmount: input.servingLoan.principalAmount,
          status: outstandingPrincipal > 0 ? "active" : "completed",
          tenantId: input.tenantId,
          termMonths,
        },
      })

      const repaymentSchedule = buildRepaymentSchedule({
        principalAmount: input.servingLoan.principalAmount,
        startDate: input.servingLoan.startDate,
        termMonths,
      })
      let remainingPaid = Math.max(0, input.servingLoan.amountServed)

      await tx.repaymentScheduleItem.createMany({
        data: repaymentSchedule.map((item) => {
          const applied = Math.min(remainingPaid, item.totalDue)
          remainingPaid -= applied

          return {
            amountPaid: applied,
            chargeDue: item.chargeDue,
            dueAt: item.dueAt,
            installmentNumber: item.installmentNumber,
            loanId: loan.id,
            principalDue: item.principalDue,
            status: applied >= item.totalDue ? "paid" : applied > 0 ? "partially_paid" : item.status,
            tenantId: input.tenantId,
            totalDue: item.totalDue,
          }
        }),
      })
    }

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        actorType: "user",
        action: "member.created",
        entityType: "Member",
        entityId: member.id,
        metadata: {
          currentSavingsBalance: input.currentSavingsBalance ?? 0,
          memberNumber: member.memberNumber,
          monthlyCommitment: input.monthlyCommitment ?? 0,
          fullName: member.fullName,
          memberType: member.memberType,
          servingLoan: input.servingLoan
            ? {
                amountServed: input.servingLoan.amountServed,
                monthlyCommitment: input.servingLoan.monthlyCommitment,
                principalAmount: input.servingLoan.principalAmount,
                startDate: input.servingLoan.startDate.toISOString(),
              }
            : null,
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

export async function updateMemberKyc(
  input: {
    actorUserId: string
    governmentIdNumber?: string | null
    kycDocumentType?: string | null
    kycDocumentUrl?: string | null
    kycReviewNotes?: string | null
    kycStatus: KycStatus
    memberId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.$transaction(async (tx) => {
    const member = await tx.member.update({
      where: { id: input.memberId, tenantId: input.tenantId },
      data: {
        governmentIdNumber: input.governmentIdNumber ?? null,
        kycDocumentType: input.kycDocumentType ?? null,
        kycDocumentUrl: input.kycDocumentUrl ?? null,
        kycDocumentUploadedAt: input.kycDocumentUrl ? new Date() : null,
        kycReviewNotes: input.kycReviewNotes ?? null,
        kycStatus: input.kycStatus,
      },
    })

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        actorType: "user",
        action: "member.kyc_updated",
        entityType: "Member",
        entityId: member.id,
        metadata: {
          governmentIdNumber: input.governmentIdNumber ?? null,
          kycDocumentType: input.kycDocumentType ?? null,
          kycDocumentUrl: input.kycDocumentUrl ?? null,
          kycReviewNotes: input.kycReviewNotes ?? null,
          kycStatus: input.kycStatus,
        },
        occurredAt: new Date(),
      },
    })

    return member
  })
}

export async function createMemberDocument(
  input: {
    actorUserId: string
    documentType: string
    documentUrl: string
    memberId: string
    reviewNotes?: string | null
    reviewStatus?: string
    tenantId: string
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.$transaction(async (tx) => {
    const document = await tx.memberDocument.create({
      data: {
        documentType: input.documentType,
        documentUrl: input.documentUrl,
        memberId: input.memberId,
        reviewNotes: input.reviewNotes ?? null,
        reviewStatus: input.reviewStatus ?? "pending",
        reviewedAt: input.reviewStatus && input.reviewStatus !== "pending" ? new Date() : null,
        tenantId: input.tenantId,
      },
    })

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        actorType: "user",
        action: "member_document.created",
        entityType: "MemberDocument",
        entityId: document.id,
        metadata: {
          documentType: input.documentType,
          memberId: input.memberId,
          reviewStatus: input.reviewStatus ?? "pending",
        },
        occurredAt: new Date(),
      },
    })

    return document
  })
}

export async function updateMemberDocumentReview(
  input: {
    actorUserId: string
    documentId: string
    reviewNotes?: string | null
    reviewStatus: string
    tenantId: string
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.$transaction(async (tx) => {
    const existingDocument = await tx.memberDocument.findFirst({
      where: {
        id: input.documentId,
        tenantId: input.tenantId,
      },
    })

    if (!existingDocument) {
      throw new Error("Member document not found")
    }

    const document = await tx.memberDocument.update({
      where: {
        id: existingDocument.id,
      },
      data: {
        reviewNotes: input.reviewNotes ?? null,
        reviewStatus: input.reviewStatus,
        reviewedAt: input.reviewStatus === "pending" ? null : new Date(),
      },
    })

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        actorType: "user",
        action: "member_document.reviewed",
        entityType: "MemberDocument",
        entityId: document.id,
        metadata: {
          reviewStatus: input.reviewStatus,
        },
        occurredAt: new Date(),
      },
    })

    return document
  })
}

export type MemberStatementSummary = {
  memberId: string
  memberNumber: string
  fullName: string
  memberType: MemberType
  status: MemberStatus
  joinedAt: Date
  exitedAt: Date | null
  email: string | null
  deductionSourceName: string | null
  activeCommitmentAmount: number
  activeCommitmentStartsAt: Date | null
  totalSavingsSnapshot: number
  totalContributions: number
  totalCommittedContributions: number
  totalExtraSavingsContributions: number
  contributionsCount: number
  lastContributionAt: Date | null
  totalLoanPrincipal: number
  totalOutstandingPrincipal: number
  activeLoanCount: number
  totalEstimatedMonthlyServicing: number
  totalLoanExtraSavingsAmount: number
  totalRepaymentsPosted: number
  lastRepaymentAt: Date | null
}

export async function listMemberStatementSummaries(
  tenantId: string,
  prismaOverride?: PrismaClient,
): Promise<MemberStatementSummary[]> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const [members, contributionTotals, repaymentTotals, loanTotals] = await Promise.all([
    prisma.member.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: {
        deductionSource: { select: { name: true } },
        user: { select: { email: true } },
        contributionPlans: {
          where: { isActive: true },
          orderBy: { startsAt: "desc" },
          take: 1,
        },
      },
    }),
    prisma.contribution.groupBy({
      by: ["memberId"],
      where: {
        tenantId,
        status: "posted",
      },
      _count: { _all: true },
      _sum: {
        amount: true,
        committedAmount: true,
        extraSavingsAmount: true,
      },
      _max: { postedAt: true },
    }),
    prisma.repayment.groupBy({
      by: ["memberId"],
      where: {
        tenantId,
        status: "posted",
      },
      _sum: { amount: true },
      _max: { paidAt: true },
    }),
    prisma.loan.groupBy({
      by: ["memberId"],
      where: {
        tenantId,
        status: {
          in: ["approved", "disbursed", "active", "defaulted"],
        },
      },
      _count: { _all: true },
      _sum: {
        principalAmount: true,
        outstandingPrincipal: true,
        estimatedMonthlyServicing: true,
        extraMonthlySavingsAmount: true,
      },
    }),
  ])

  const contributionMap = new Map(contributionTotals.map((item) => [item.memberId, item]))
  const repaymentMap = new Map(repaymentTotals.map((item) => [item.memberId, item]))
  const loanMap = new Map(loanTotals.map((item) => [item.memberId, item]))

  return members.map((member) => {
    const activePlan = member.contributionPlans[0] ?? null
    const contributionTotal = contributionMap.get(member.id)
    const repaymentTotal = repaymentMap.get(member.id)
    const loanTotal = loanMap.get(member.id)

    return {
      memberId: member.id,
      memberNumber: member.memberNumber,
      fullName: member.fullName,
      memberType: member.memberType,
      status: member.status,
      joinedAt: member.joinedAt,
      exitedAt: member.exitedAt,
      email: member.user?.email ?? null,
      deductionSourceName: member.deductionSource?.name ?? null,
      activeCommitmentAmount: Number(activePlan?.amount ?? 0),
      activeCommitmentStartsAt: activePlan?.startsAt ?? null,
      totalSavingsSnapshot: Number(member.totalSavingsSnapshot),
      totalContributions: Number(contributionTotal?._sum.amount ?? 0),
      totalCommittedContributions: Number(contributionTotal?._sum.committedAmount ?? 0),
      totalExtraSavingsContributions: Number(contributionTotal?._sum.extraSavingsAmount ?? 0),
      contributionsCount: contributionTotal?._count._all ?? 0,
      lastContributionAt: contributionTotal?._max.postedAt ?? null,
      totalLoanPrincipal: Number(loanTotal?._sum.principalAmount ?? 0),
      totalOutstandingPrincipal: Number(loanTotal?._sum.outstandingPrincipal ?? 0),
      activeLoanCount: loanTotal?._count._all ?? 0,
      totalEstimatedMonthlyServicing: Number(loanTotal?._sum.estimatedMonthlyServicing ?? 0),
      totalLoanExtraSavingsAmount: Number(loanTotal?._sum.extraMonthlySavingsAmount ?? 0),
      totalRepaymentsPosted: Number(repaymentTotal?._sum.amount ?? 0),
      lastRepaymentAt: repaymentTotal?._max.paidAt ?? null,
    }
  })
}

export async function getMemberStatementDetail(
  tenantId: string,
  memberId: string,
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const member = await prisma.member.findFirst({
    where: { id: memberId, tenantId },
    include: {
      deductionSource: { select: { name: true } },
      user: { select: { email: true, fullName: true } },
      documents: {
        orderBy: { uploadedAt: "desc" },
        take: 20,
      },
      contributionPlans: {
        orderBy: { startsAt: "desc" },
        take: 12,
      },
    },
  })

  if (!member) {
    return null
  }

  const [contributions, loans, repayments, ledgerTransactions, summary] = await Promise.all([
    prisma.contribution.findMany({
      where: { tenantId, memberId },
      include: {
        contributionPlan: true,
      },
      orderBy: { postedAt: "desc" },
      take: 25,
    }),
    prisma.loan.findMany({
      where: { tenantId, memberId },
      include: {
        loanProduct: true,
        repaymentScheduleItems: {
          orderBy: { installmentNumber: "asc" },
          take: 6,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.repayment.findMany({
      where: { tenantId, memberId },
      include: {
        loan: {
          include: {
            loanProduct: true,
          },
        },
        repaymentScheduleItem: true,
      },
      orderBy: { paidAt: "desc" },
      take: 25,
    }),
    getMemberTransactions(tenantId, memberId, prisma),
    listMemberStatementSummaries(tenantId, prisma),
  ])

  return {
    member,
    contributions,
    ledgerTransactions,
    loans,
    repayments,
    summary: summary.find((item) => item.memberId === memberId) ?? null,
  }
}

export async function getMemberKycSummary(
  tenantId: string,
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const [notStarted, pending, verified, rejected, legacyWithDocuments, memberDocuments, approvedDocuments] = await Promise.all([
    prisma.member.count({ where: { tenantId, kycStatus: "not_started" } }),
    prisma.member.count({ where: { tenantId, kycStatus: "pending" } }),
    prisma.member.count({ where: { tenantId, kycStatus: "verified" } }),
    prisma.member.count({ where: { tenantId, kycStatus: "rejected" } }),
    prisma.member.count({ where: { tenantId, kycDocumentUrl: { not: null } } }),
    prisma.memberDocument.count({ where: { tenantId } }),
    prisma.memberDocument.count({ where: { tenantId, reviewStatus: "verified" } }),
  ])

  return {
    approvedDocuments,
    legacyWithDocuments,
    memberDocuments,
    notStarted,
    pending,
    rejected,
    verified,
    withDocuments: legacyWithDocuments + memberDocuments,
  }
}
