import type {
  KycStatus,
  MemberStatus,
  MemberType,
  Prisma,
  PrismaClient,
  RepaymentScheduleStatus,
} from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError } from "../query-error"
import { getMemberTransactions } from "./ledger"
import {
  getMembersOperationalReadiness,
  isMemberMigrationFinalized,
  type MemberOperationalReadiness,
} from "./member-readiness"
import { getTenantInitialMigrationState } from "./migration"
import { ensureMemberInGeneratedMonthlyRecord } from "./monthly-records"
import { getTenantOperationProfile } from "./operation-profile"
import { assertQaIdentityLane } from "./qa-maintenance"

export type ListMembersFilters = {
  kycStatus?: KycStatus
  joinedFrom?: Date
  joinedTo?: Date
  migrationStatus?: MemberMigrationFilterStatus
  status?: MemberStatus
  memberType?: MemberType
  search?: string
  page?: number
  pageSize?: number
}

export type MemberMigrationFilterStatus = "pending" | "finalized"

export type ListMembersTableFilters = Omit<
  ListMembersFilters,
  "page" | "search"
> & {
  cursor?: string | null
  pageSize?: number
  q?: string | null
  sort?: [MembersTableSortField, "asc" | "desc"] | null
}

export type MembersTableSortField =
  | "fullName"
  | "memberNumber"
  | "memberType"
  | "status"
  | "kycStatus"
  | "joinedAt"

const memberListInclude = {
  deductionSource: true,
  user: { select: { id: true, email: true, fullName: true } },
} satisfies Prisma.MemberInclude

function serializeMemberListItem<
  TMember extends { totalSavingsSnapshot?: unknown },
>(member: TMember) {
  return {
    ...member,
    totalSavingsSnapshot: Number(member.totalSavingsSnapshot ?? 0),
  }
}

function buildMemberWhere(
  tenantId: string,
  filters?: ListMembersFilters
): Prisma.MemberWhereInput {
  return {
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
        {
          fullName: { contains: filters.search, mode: "insensitive" as const },
        },
        {
          memberNumber: {
            contains: filters.search,
            mode: "insensitive" as const,
          },
        },
      ],
    }),
  }
}

function getMembersTableOrderBy(
  sort?: ListMembersTableFilters["sort"]
): Prisma.MemberOrderByWithRelationInput[] {
  if (!sort) {
    return [{ joinedAt: "desc" }, { createdAt: "desc" }]
  }

  const [field, direction] = sort

  return [{ [field]: direction }, { createdAt: "desc" }]
}

function matchesMemberMigrationStatus(
  readiness: MemberOperationalReadiness | null | undefined,
  migrationStatus?: MemberMigrationFilterStatus
) {
  if (!migrationStatus || !readiness) {
    return !migrationStatus
  }

  const isFinalized = isMemberMigrationFinalized(readiness)

  return migrationStatus === "finalized" ? isFinalized : !isFinalized
}

export async function listMembers(
  tenantId: string,
  filters?: ListMembersFilters,
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const page = filters?.page ?? 1
  const pageSize = filters?.pageSize ?? 25

  const where = buildMemberWhere(tenantId, filters)

  const [items, total] = await Promise.all([
    prisma.member.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: memberListInclude,
    }),
    prisma.member.count({ where }),
  ])

  return { items: items.map(serializeMemberListItem), total, page, pageSize }
}

export async function getMemberRegistrySummary(
  tenantId: string,
  filters?: ListMembersFilters,
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const where = buildMemberWhere(tenantId, filters)
  const members = await prisma.member.findMany({
    select: {
      id: true,
      kycStatus: true,
      status: true,
      userId: true,
    },
    where,
  })
  const readinessByMemberId = await getMembersOperationalReadiness(
    {
      memberIds: members.map((member) => member.id),
      tenantId,
    },
    prisma
  )
  const filteredMembers = members.filter((member) =>
    matchesMemberMigrationStatus(
      readinessByMemberId.get(member.id),
      filters?.migrationStatus
    )
  )

  return {
    activeCount: filteredMembers.filter((member) => member.status === "active")
      .length,
    kycPendingCount: filteredMembers.filter(
      (member) => member.kycStatus !== "verified"
    ).length,
    linkedUsersCount: filteredMembers.filter((member) => member.userId !== null)
      .length,
    migrationFinalizedCount: filteredMembers.filter((member) =>
      matchesMemberMigrationStatus(
        readinessByMemberId.get(member.id),
        "finalized"
      )
    ).length,
    totalCount: filteredMembers.length,
  }
}

export async function getMemberByUserId(
  input: {
    tenantId: string
    userId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.member.findFirst({
    select: {
      email: true,
      fullName: true,
      id: true,
      kycStatus: true,
      memberNumber: true,
      memberType: true,
      status: true,
    },
    where: {
      tenantId: input.tenantId,
      userId: input.userId,
    },
  })
}

export async function ensureMemberPortalAccess(
  input: {
    actorUserId: string
    memberId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.$transaction(async (tx) => {
    const member = await tx.member.findFirst({
      where: {
        id: input.memberId,
        tenantId: input.tenantId,
      },
      include: {
        user: {
          select: {
            email: true,
            fullName: true,
            id: true,
            isPlatformOwner: true,
            passwordHash: true,
            phoneNumber: true,
            tenantId: true,
          },
        },
      },
    })

    if (!member) {
      throw ExpectedQueryError.notFound("Member not found.")
    }

    const email = (member.user?.email ?? member.email ?? "")
      .trim()
      .toLowerCase()

    if (!email) {
      throw ExpectedQueryError.precondition(
        "Add an email address to this member before sending portal access."
      )
    }

    const user =
      member.user ??
      (await tx.user.upsert({
        where: {
          tenantId_email: {
            tenantId: input.tenantId,
            email,
          },
        },
        update: {
          fullName: member.fullName,
          phoneNumber: member.phoneNumber ?? undefined,
        },
        create: {
          email,
          fullName: member.fullName,
          phoneNumber: member.phoneNumber ?? null,
          tenantId: input.tenantId,
        },
        select: {
          email: true,
          fullName: true,
          id: true,
          isPlatformOwner: true,
          passwordHash: true,
          phoneNumber: true,
          tenantId: true,
        },
      }))

    const linkedMember = await tx.member.findFirst({
      where: {
        tenantId: input.tenantId,
        userId: user.id,
      },
      select: {
        id: true,
      },
    })

    if (linkedMember && linkedMember.id !== member.id) {
      throw ExpectedQueryError.conflict(
        "This email is already linked to another member profile."
      )
    }

    if (member.userId !== user.id) {
      await tx.member.update({
        where: {
          id: member.id,
          tenantId: input.tenantId,
        },
        data: {
          userId: user.id,
        },
      })
    }

    await tx.membership.upsert({
      where: {
        tenantId_userId_role: {
          role: "member",
          tenantId: input.tenantId,
          userId: user.id,
        },
      },
      update: {},
      create: {
        isDefault: false,
        role: "member",
        tenantId: input.tenantId,
        userId: user.id,
      },
    })

    await tx.auditLog.create({
      data: {
        action: "member.portal_access_prepared",
        actorType: "user",
        actorUserId: input.actorUserId,
        entityId: member.id,
        entityType: "Member",
        metadata: {
          email,
          userId: user.id,
        },
        occurredAt: new Date(),
        tenantId: input.tenantId,
      },
    })

    return {
      member: {
        email,
        fullName: member.fullName,
        id: member.id,
        memberNumber: member.memberNumber,
      },
      user,
    }
  })
}

export async function listMembersTable(
  tenantId: string,
  filters?: ListMembersTableFilters,
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const pageSize = filters?.pageSize ?? 25
  const offset = filters?.cursor ? Number.parseInt(filters.cursor, 10) : 0
  const safeOffset = Number.isFinite(offset) && offset > 0 ? offset : 0
  const where = buildMemberWhere(tenantId, {
    ...filters,
    search: filters?.q ?? undefined,
  })

  const rows = await prisma.member.findMany({
    where,
    orderBy: getMembersTableOrderBy(filters?.sort),
    ...(filters?.migrationStatus
      ? {}
      : {
          skip: safeOffset,
          take: pageSize + 1,
        }),
    include: memberListInclude,
  })
  const readinessByMemberId = await getMembersOperationalReadiness(
    {
      memberIds: rows.map((member) => member.id),
      tenantId,
    },
    prisma
  )
  const filteredRows = rows.filter((member) =>
    matchesMemberMigrationStatus(
      readinessByMemberId.get(member.id),
      filters?.migrationStatus
    )
  )
  const pagedRows = filters?.migrationStatus
    ? filteredRows.slice(safeOffset, safeOffset + pageSize + 1)
    : filteredRows
  const hasNextPage = pagedRows.length > pageSize
  const data = pagedRows.slice(0, pageSize)
  const dataWithOperationalReadiness = data.map((member) => ({
    ...serializeMemberListItem(member),
    operationalReadiness: readinessByMemberId.get(member.id) ?? null,
  }))

  return {
    data: dataWithOperationalReadiness,
    meta: {
      cursor: hasNextPage ? String(safeOffset + pageSize) : null,
      hasNextPage,
      hasPreviousPage: safeOffset > 0,
    },
  }
}

export async function getMemberById(
  tenantId: string,
  memberId: string,
  prismaOverride?: PrismaClient
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
  address?: string | null
  currentSavingsBalance?: number
  email?: string | null
  monthlyCommitment?: number
  commitmentHistory?: Array<{
    amount: number
    effectiveFrom: Date
    notes?: string | null
  }>
  legacyLoanHistory?: Array<{
    closedAt?: Date | null
    guarantorOneMemberId?: string | null
    guarantorTwoMemberId?: string | null
    loanLabel?: string | null
    openedAt: Date
    outstandingPrincipalBalance?: number | null
    principalAmount: number
    savingsDuringLoan: number
    scheduledMonthlyPrincipalRepayment: number
    notes?: string | null
  }>
  occupation?: string | null
  phoneNumber?: string | null
  servingLoan?: {
    amountServed: number
    extraMonthlySavingsAmount: number
    monthlyCommitment: number
    paymentMonths: number
    principalAmount: number
    startDate: Date
  }
  userId?: string
  deductionSourceId?: string | null
  actorUserId: string
}

type MemberWriteClient = Prisma.TransactionClient

async function assertMemberProfileMutationOpen(
  tenantId: string,
  prisma: PrismaClient | Prisma.TransactionClient
) {
  const migrationState = await getTenantInitialMigrationState(
    tenantId,
    prisma as PrismaClient
  )

  if (migrationState.snapshot.canUseLiveFinancialWrites) {
    return
  }

  if (!migrationState.snapshot.canUseMigrationTools) {
    throw ExpectedQueryError.precondition(
      "Member profile writes are locked until initial migration is finalized."
    )
  }

  const setupStepKeys = new Set(["finance_start_date", "charge_schedules"])
  const blockingSteps = migrationState.snapshot.missingStepKeys.filter(
    (stepKey) => setupStepKeys.has(stepKey)
  )

  if (blockingSteps.length > 0) {
    const blockingStepKeys: ReadonlySet<string> = new Set(blockingSteps)
    const labels = migrationState.snapshot.steps
      .filter((step) => blockingStepKeys.has(step.key))
      .map((step) => step.label)

    throw ExpectedQueryError.precondition(
      `Member profiles cannot be created until these setup steps are complete: ${labels.join(", ")}.`
    )
  }

  if (
    migrationState.counts.appliedBackfillBatches > 0 ||
    migrationState.counts.appliedBackfillMembers > 0 ||
    migrationState.counts.appliedBackfillMonths > 0
  ) {
    throw ExpectedQueryError.precondition(
      "Member profiles are locked because member ledger backfill has already started. Finish migration or create new members after go-live."
    )
  }
}

async function assertLiveFinancialWritesOpen(
  tenantId: string,
  prisma: PrismaClient | Prisma.TransactionClient
) {
  const migrationState = await getTenantInitialMigrationState(
    tenantId,
    prisma as PrismaClient
  )

  if (!migrationState.snapshot.canUseLiveFinancialWrites) {
    throw ExpectedQueryError.precondition(
      "Live financial record writes are locked until initial migration is finalized."
    )
  }
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
    dueAt.setUTCMonth(dueAt.getUTCMonth() + index)

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

function normalizeCommitmentHistory(input: CreateMemberInput) {
  const byDate = new Map<
    string,
    {
      amount: number
      effectiveFrom: Date
      notes?: string | null
    }
  >()

  if (input.monthlyCommitment && input.monthlyCommitment > 0) {
    byDate.set(input.joinedAt.toISOString().slice(0, 10), {
      amount: input.monthlyCommitment,
      effectiveFrom: input.joinedAt,
      notes: "Initial monthly commitment.",
    })
  }

  for (const entry of input.commitmentHistory ?? []) {
    if (!entry.amount || entry.amount <= 0) continue
    byDate.set(entry.effectiveFrom.toISOString().slice(0, 10), entry)
  }

  return [...byDate.values()].sort(
    (left, right) =>
      left.effectiveFrom.getTime() - right.effectiveFrom.getTime()
  )
}

async function assertCollectionSourceAssignmentAllowed(input: {
  deductionSourceId: string
  prisma: PrismaClient | Prisma.TransactionClient
  tenantId: string
}) {
  const operationProfile = await getTenantOperationProfile(
    input.tenantId,
    input.prisma as PrismaClient
  )

  if (!operationProfile.services.collection_sources.canStaffCreate) {
    throw ExpectedQueryError.precondition(
      "Collection Source assignment is not enabled for this cooperative."
    )
  }

  const deductionSource = await (input.prisma as any).deductionSource.findFirst(
    {
      select: { id: true },
      where: {
        id: input.deductionSourceId,
        isActive: true,
        tenantId: input.tenantId,
      },
    }
  )

  if (!deductionSource) {
    throw ExpectedQueryError.permission(
      "Collection Source does not belong to this cooperative or is inactive."
    )
  }
}

export async function createMemberWithState(
  tx: MemberWriteClient,
  input: CreateMemberInput
) {
  await assertMemberProfileMutationOpen(input.tenantId, tx)
  await assertQaIdentityLane({
    email: input.email,
    prisma: tx,
    tenantId: input.tenantId,
  })
  if (input.deductionSourceId) {
    await assertCollectionSourceAssignmentAllowed({
      deductionSourceId: input.deductionSourceId,
      prisma: tx,
      tenantId: input.tenantId,
    })
  }
  const commitmentHistory = normalizeCommitmentHistory(input)

  const member = await tx.member.create({
    data: {
      tenantId: input.tenantId,
      memberNumber: input.memberNumber,
      fullName: input.fullName,
      memberType: input.memberType,
      joinedAt: input.joinedAt,
      address: input.address,
      email: input.email,
      occupation: input.occupation,
      phoneNumber: input.phoneNumber,
      totalSavingsSnapshot: input.currentSavingsBalance ?? 0,
      userId: input.userId,
      deductionSourceId: input.deductionSourceId,
      status: "active",
    },
  })

  if (commitmentHistory.length > 0) {
    await tx.contributionPlan.createMany({
      data: commitmentHistory.map((entry, index) => ({
        amount: entry.amount,
        endsAt: commitmentHistory[index + 1]?.effectiveFrom ?? null,
        interval: "monthly",
        isActive: index === commitmentHistory.length - 1,
        memberId: member.id,
        name: "Monthly commitment",
        startsAt: entry.effectiveFrom,
        tenantId: input.tenantId,
      })),
    })
  }

  if (commitmentHistory.length > 0) {
    await tx.memberAmountLog.createMany({
      data: commitmentHistory.map((entry) => ({
        amount: entry.amount,
        createdByUserId: input.actorUserId,
        effectiveFrom: entry.effectiveFrom,
        memberId: member.id,
        notes: entry.notes?.trim() || null,
        tenantId: input.tenantId,
      })),
      skipDuplicates: true,
    })
  }

  if (input.servingLoan) {
    const outstandingPrincipal = Number(
      Math.max(
        0,
        input.servingLoan.principalAmount - input.servingLoan.amountServed
      ).toFixed(2)
    )
    const termMonths = Math.max(1, input.servingLoan.paymentMonths)
    const estimatedMonthlyServicing = Number(
      input.servingLoan.monthlyCommitment.toFixed(2)
    )

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
        extraMonthlySavingsAmount: input.servingLoan.extraMonthlySavingsAmount,
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
        extraMonthlySavingsAmount: input.servingLoan.extraMonthlySavingsAmount,
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
          status:
            applied >= item.totalDue
              ? "paid"
              : applied > 0
                ? "partially_paid"
                : item.status,
          tenantId: input.tenantId,
          totalDue: item.totalDue,
        }
      }),
    })
  }

  if (input.legacyLoanHistory?.length) {
    await tx.legacyLoanMigrationDraft.createMany({
      data: input.legacyLoanHistory
        .filter((loan) => loan.principalAmount > 0)
        .map((loan, index) => ({
          closedAt: loan.closedAt ?? null,
          createdByUserId: input.actorUserId,
          guarantorOneMemberId: loan.guarantorOneMemberId?.trim() || null,
          guarantorTwoMemberId: loan.guarantorTwoMemberId?.trim() || null,
          loanLabel:
            loan.loanLabel?.trim() ||
            `Legacy loan ${String(index + 1).padStart(2, "0")}`,
          memberId: member.id,
          notes: loan.notes?.trim() || null,
          openedAt: loan.openedAt,
          outstandingPrincipalBalance:
            loan.outstandingPrincipalBalance ?? loan.principalAmount,
          principalAmount: loan.principalAmount,
          savingsDuringLoan: loan.savingsDuringLoan,
          scheduledMonthlyPrincipalRepayment:
            loan.scheduledMonthlyPrincipalRepayment,
          tenantId: input.tenantId,
        })),
      skipDuplicates: true,
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
        address: member.address,
        email: member.email,
        memberType: member.memberType,
        occupation: member.occupation,
        phoneNumber: member.phoneNumber,
        servingLoan: input.servingLoan
          ? {
              amountServed: input.servingLoan.amountServed,
              extraMonthlySavingsAmount:
                input.servingLoan.extraMonthlySavingsAmount,
              monthlyCommitment: input.servingLoan.monthlyCommitment,
              paymentMonths: input.servingLoan.paymentMonths,
              principalAmount: input.servingLoan.principalAmount,
              startDate: input.servingLoan.startDate.toISOString(),
            }
          : null,
      },
      occurredAt: new Date(),
    },
  })

  await ensureMemberInGeneratedMonthlyRecord(
    {
      joinedAt: input.joinedAt,
      memberId: member.id,
      tenantId: input.tenantId,
    },
    tx as unknown as PrismaClient
  )

  return member
}

export async function createMember(
  input: CreateMemberInput,
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.$transaction(async (tx) => createMemberWithState(tx, input), {
    maxWait: 10_000,
    timeout: 30_000,
  })
}

export type UpdateMemberInput = {
  address?: string | null
  email?: string | null
  fullName?: string
  memberType?: MemberType
  occupation?: string | null
  phoneNumber?: string | null
  deductionSourceId?: string | null
  actorUserId: string
}

export async function updateMember(
  tenantId: string,
  memberId: string,
  input: UpdateMemberInput,
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.$transaction(async (tx) => {
    await assertMemberProfileMutationOpen(tenantId, tx)
    if (input.deductionSourceId) {
      await assertCollectionSourceAssignmentAllowed({
        deductionSourceId: input.deductionSourceId,
        prisma: tx,
        tenantId,
      })
    }

    const member = await tx.member.update({
      where: { id: memberId, tenantId },
      data: {
        ...(input.address !== undefined && { address: input.address }),
        ...(input.email !== undefined && { email: input.email }),
        ...(input.fullName !== undefined && { fullName: input.fullName }),
        ...(input.memberType !== undefined && { memberType: input.memberType }),
        ...(input.occupation !== undefined && {
          occupation: input.occupation,
        }),
        ...(input.phoneNumber !== undefined && {
          phoneNumber: input.phoneNumber,
        }),
        ...(input.deductionSourceId !== undefined && {
          deductionSourceId: input.deductionSourceId,
        }),
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
          address: input.address,
          deductionSourceId: input.deductionSourceId,
          email: input.email,
          fullName: input.fullName,
          memberType: input.memberType,
          occupation: input.occupation,
          phoneNumber: input.phoneNumber,
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
  prismaOrOptions?:
    | PrismaClient
    | { prisma?: PrismaClient; reviewNotes?: string | null },
  maybePrismaOverride?: PrismaClient
) {
  const hasOptions = (
    value: typeof prismaOrOptions
  ): value is { prisma?: PrismaClient; reviewNotes?: string | null } =>
    Boolean(
      value &&
      typeof value === "object" &&
      ("prisma" in value || "reviewNotes" in value)
    )
  const options = hasOptions(prismaOrOptions) ? prismaOrOptions : null
  const prismaOverride: PrismaClient | undefined = options
    ? options.prisma
    : (maybePrismaOverride ?? (prismaOrOptions as PrismaClient | undefined))
  const prisma = prismaOverride ?? createPrismaClient()
  const reviewNotes = options ? options.reviewNotes?.trim() || null : null

  if (!prisma) throw new Error("Database not configured")

  return prisma.$transaction(async (tx) => {
    await assertLiveFinancialWritesOpen(tenantId, tx)

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
        metadata: { newStatus, reviewNotes },
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
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.$transaction(async (tx) => {
    await assertLiveFinancialWritesOpen(input.tenantId, tx)

    const member = await tx.member.update({
      where: { id: input.memberId, tenantId: input.tenantId },
      data: {
        ...(input.governmentIdNumber !== undefined && {
          governmentIdNumber: input.governmentIdNumber ?? null,
        }),
        ...(input.kycDocumentType !== undefined && {
          kycDocumentType: input.kycDocumentType ?? null,
        }),
        ...(input.kycDocumentUrl !== undefined && {
          kycDocumentUploadedAt: input.kycDocumentUrl ? new Date() : null,
          kycDocumentUrl: input.kycDocumentUrl ?? null,
        }),
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
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.$transaction(async (tx) => {
    await assertLiveFinancialWritesOpen(input.tenantId, tx)

    const document = await tx.memberDocument.create({
      data: {
        documentType: input.documentType,
        documentUrl: input.documentUrl,
        memberId: input.memberId,
        reviewNotes: input.reviewNotes ?? null,
        reviewStatus: input.reviewStatus ?? "pending",
        reviewedAt:
          input.reviewStatus && input.reviewStatus !== "pending"
            ? new Date()
            : null,
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
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.$transaction(async (tx) => {
    await assertLiveFinancialWritesOpen(input.tenantId, tx)

    const existingDocument = await tx.memberDocument.findFirst({
      where: {
        id: input.documentId,
        tenantId: input.tenantId,
      },
    })

    if (!existingDocument) {
      throw ExpectedQueryError.notFound("Member document not found")
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
  totalDividendAllocations: number
  dividendAllocationCount: number
  lastDividendAllocatedAt: Date | null
}

export async function listMemberStatementSummaries(
  tenantId: string,
  prismaOverride?: PrismaClient
): Promise<MemberStatementSummary[]> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const [
    members,
    contributionTotals,
    repaymentTotals,
    loanTotals,
    dividendTotals,
  ] = await Promise.all([
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
    prisma.dividendAllocation.groupBy({
      by: ["memberId"],
      where: {
        tenantId,
        dividendPeriod: {
          status: "published",
        },
      },
      _count: { _all: true },
      _sum: {
        allocationAmount: true,
      },
      _max: { createdAt: true },
    }),
  ])

  const contributionMap = new Map(
    contributionTotals.map((item) => [item.memberId, item])
  )
  const repaymentMap = new Map(
    repaymentTotals.map((item) => [item.memberId, item])
  )
  const loanMap = new Map(loanTotals.map((item) => [item.memberId, item]))
  const dividendMap = new Map(
    dividendTotals.map((item) => [item.memberId, item])
  )

  return members.map((member) => {
    const activePlan = member.contributionPlans[0] ?? null
    const contributionTotal = contributionMap.get(member.id)
    const repaymentTotal = repaymentMap.get(member.id)
    const loanTotal = loanMap.get(member.id)
    const dividendTotal = dividendMap.get(member.id)

    return {
      memberId: member.id,
      memberNumber: member.memberNumber,
      fullName: member.fullName,
      memberType: member.memberType,
      status: member.status,
      joinedAt: member.joinedAt,
      exitedAt: member.exitedAt,
      email: member.email ?? member.user?.email ?? null,
      deductionSourceName: member.deductionSource?.name ?? null,
      activeCommitmentAmount: Number(activePlan?.amount ?? 0),
      activeCommitmentStartsAt: activePlan?.startsAt ?? null,
      totalSavingsSnapshot: Number(member.totalSavingsSnapshot),
      totalContributions: Number(contributionTotal?._sum.amount ?? 0),
      totalCommittedContributions: Number(
        contributionTotal?._sum.committedAmount ?? 0
      ),
      totalExtraSavingsContributions: Number(
        contributionTotal?._sum.extraSavingsAmount ?? 0
      ),
      contributionsCount: contributionTotal?._count._all ?? 0,
      lastContributionAt: contributionTotal?._max.postedAt ?? null,
      totalLoanPrincipal: Number(loanTotal?._sum.principalAmount ?? 0),
      totalOutstandingPrincipal: Number(
        loanTotal?._sum.outstandingPrincipal ?? 0
      ),
      activeLoanCount: loanTotal?._count._all ?? 0,
      totalEstimatedMonthlyServicing: Number(
        loanTotal?._sum.estimatedMonthlyServicing ?? 0
      ),
      totalLoanExtraSavingsAmount: Number(
        loanTotal?._sum.extraMonthlySavingsAmount ?? 0
      ),
      totalRepaymentsPosted: Number(repaymentTotal?._sum.amount ?? 0),
      lastRepaymentAt: repaymentTotal?._max.paidAt ?? null,
      totalDividendAllocations: Number(
        dividendTotal?._sum.allocationAmount ?? 0
      ),
      dividendAllocationCount: dividendTotal?._count._all ?? 0,
      lastDividendAllocatedAt: dividendTotal?._max.createdAt ?? null,
    }
  })
}

export async function getMemberStatementDetail(
  tenantId: string,
  memberId: string,
  prismaOverride?: PrismaClient
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

  const [
    contributions,
    loans,
    repayments,
    dividendAllocations,
    chargeApplications,
    ledgerTransactions,
    summary,
  ] = await Promise.all([
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
    prisma.dividendAllocation.findMany({
      where: {
        tenantId,
        memberId,
        dividendPeriod: {
          status: "published",
        },
      },
      include: {
        dividendPeriod: {
          select: {
            deductionAmount: true,
            deductionReason: true,
            distributableAmount: true,
            id: true,
            name: true,
            periodEnd: true,
            periodStart: true,
            publishedAt: true,
            status: true,
            totalProfitAmount: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    typeof (prisma as any).chargeApplication?.findMany === "function"
      ? (prisma as any).chargeApplication.findMany({
          where: { tenantId, memberId },
          include: {
            chargeApplicability: true,
            chargeDefinition: true,
            foodPurchaseApplication: {
              select: { id: true, status: true },
            },
            loanRequest: {
              select: { id: true, status: true },
            },
            procurementRequest: {
              select: { id: true, itemName: true, status: true },
            },
            projectFinancingRequest: {
              select: { businessName: true, id: true, status: true },
            },
          },
          orderBy: { assessedAt: "desc" },
          take: 25,
        })
      : [],
    getMemberTransactions(tenantId, memberId, prisma),
    listMemberStatementSummaries(tenantId, prisma),
  ])

  return {
    member,
    chargeApplications,
    contributions,
    dividendAllocations,
    ledgerTransactions,
    loans,
    repayments,
    summary: summary.find((item) => item.memberId === memberId) ?? null,
  }
}

export async function getMemberKycSummary(
  tenantId: string,
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const [
    notStarted,
    pending,
    verified,
    rejected,
    legacyWithDocuments,
    memberDocuments,
    approvedDocuments,
  ] = await Promise.all([
    prisma.member.count({ where: { tenantId, kycStatus: "not_started" } }),
    prisma.member.count({ where: { tenantId, kycStatus: "pending" } }),
    prisma.member.count({ where: { tenantId, kycStatus: "verified" } }),
    prisma.member.count({ where: { tenantId, kycStatus: "rejected" } }),
    prisma.member.count({ where: { tenantId, kycDocumentUrl: { not: null } } }),
    prisma.memberDocument.count({ where: { tenantId } }),
    prisma.memberDocument.count({
      where: { tenantId, reviewStatus: "verified" },
    }),
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
