import type {
  KycStatus,
  MemberStatus,
  MemberType,
  Prisma,
  PrismaClient,
  RepaymentScheduleStatus,
} from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { composeCooperativeAccessCode } from "@halaalvest/utils"
import { ExpectedQueryError, isUniqueConstraintError } from "../query-error"
import { getMemberTransactions } from "./ledger"
import {
  getMembersOperationalReadiness,
  listMigrationFinalizedMemberIds,
} from "./member-readiness"
import {
  getTenantInitialMigrationState,
  getTenantMigrationWriteAccess,
} from "./migration"
import { ensureMemberInGeneratedMonthlyRecord } from "./monthly-records"
import { getTenantOperationProfile } from "./operation-profile"
import { assertQaIdentityLane } from "./qa-maintenance"
import { claimDashboardEvidenceUploadLink } from "./dashboard-evidence-uploads"

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

const memberStatusTransitions = {
  active: ["inactive", "suspended", "exited"],
  exited: [],
  inactive: ["active", "suspended", "exited"],
  pending: ["active", "inactive"],
  suspended: ["active", "inactive", "exited"],
} as const satisfies Record<MemberStatus, readonly MemberStatus[]>

const memberKycTransitions = {
  not_started: ["pending"],
  pending: ["verified", "rejected"],
  rejected: ["pending"],
  verified: ["pending"],
} as const satisfies Record<KycStatus, readonly KycStatus[]>

export function getAllowedMemberStatusTransitions(status: MemberStatus) {
  return memberStatusTransitions[status]
}

export function getAllowedMemberKycTransitions(status: KycStatus) {
  return memberKycTransitions[status]
}

export function assertMemberStatusTransition(
  currentStatus: MemberStatus,
  nextStatus: MemberStatus
) {
  if (currentStatus === nextStatus) return
  if (
    !(
      memberStatusTransitions[currentStatus] as readonly MemberStatus[]
    ).includes(nextStatus)
  ) {
    throw ExpectedQueryError.conflict(
      `Member status cannot change from ${currentStatus.replace(/_/g, " ")} to ${nextStatus.replace(/_/g, " ")}.`
    )
  }
}

export function assertMemberKycTransition(
  currentStatus: KycStatus,
  nextStatus: KycStatus
) {
  if (currentStatus === nextStatus) return
  if (
    !(memberKycTransitions[currentStatus] as readonly KycStatus[]).includes(
      nextStatus
    )
  ) {
    throw ExpectedQueryError.conflict(
      `Member KYC cannot change from ${currentStatus.replace(/_/g, " ")} to ${nextStatus.replace(/_/g, " ")}.`
    )
  }
}

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
  contributionPlans: {
    orderBy: { startsAt: "desc" as const },
    select: { amount: true },
    take: 1,
    where: { isActive: true },
  },
  deductionSource: {
    select: { externalReference: true, id: true, name: true, type: true },
  },
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

function toMemberMigrationWhere(
  migrationStatus: MemberMigrationFilterStatus,
  finalizedIds: string[]
): Prisma.MemberWhereInput {
  return {
    id:
      migrationStatus === "finalized"
        ? { in: finalizedIds }
        : { notIn: finalizedIds },
  }
}

const memberOptionSearchLimit = 20

/**
 * Member picker options: id, name and member number only, searched in SQL.
 * `ids` resolves the labels of already-selected members. A query matches
 * name or member number (case-insensitive) and returns at most 20 rows, so
 * pickers no longer ship the tenant's member list with the page.
 */
export async function searchMemberOptions(
  tenantId: string,
  input: { ids?: string[]; query?: string | null } = {},
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const ids = [...new Set((input.ids ?? []).filter(Boolean))]
  const query = input.query?.trim() ?? ""

  return prisma.member.findMany({
    orderBy: [{ fullName: "asc" }, { memberNumber: "asc" }],
    select: { fullName: true, id: true, memberNumber: true },
    take: ids.length > 0 ? ids.length : memberOptionSearchLimit,
    where: {
      tenantId,
      ...(ids.length > 0
        ? { id: { in: ids } }
        : query
          ? {
              OR: [
                { fullName: { contains: query, mode: "insensitive" } },
                { memberNumber: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
    },
  })
}

/**
 * The newest members as picker options (id, name, member number), in the
 * same order and cap as `listMembers` page 1, without its plan, deduction
 * source and user includes or the total count. For setup screens whose
 * pickers still take a preloaded list.
 */
export async function listRecentMemberOptions(
  tenantId: string,
  input: { limit?: number } = {},
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.member.findMany({
    orderBy: { createdAt: "desc" },
    select: { fullName: true, id: true, memberNumber: true },
    take: input.limit ?? 200,
    where: { tenantId },
  })
}

/**
 * Members whose payment order is not the default (`manual_split`), for the
 * Contributions Commitments tab. Everyone else uses the default, so the tab
 * lists only these and finds anyone else by search. Bounded, with the total
 * so the page can say when the list is cut short.
 */
export async function listMembersWithPaymentOrder(
  tenantId: string,
  input: { limit?: number } = {},
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const where = {
    paymentAllocationPreference: { not: "manual_split" as const },
    tenantId,
  }
  const [items, total] = await Promise.all([
    prisma.member.findMany({
      orderBy: [{ fullName: "asc" }, { memberNumber: "asc" }],
      select: {
        fullName: true,
        id: true,
        memberNumber: true,
        paymentAllocationPreference: true,
      },
      take: input.limit ?? 200,
      where,
    }),
    prisma.member.count({ where }),
  ])

  return { items, total }
}

/** Whether the tenant has any member, for "create" buttons on picker pages. */
export async function tenantHasMembers(
  tenantId: string,
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const member = await prisma.member.findFirst({
    select: { id: true },
    where: { tenantId },
  })

  return Boolean(member)
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

  const migrationStatus = filters?.migrationStatus
  const baseWhere = buildMemberWhere(tenantId, filters)
  const finalizedIds = await listMigrationFinalizedMemberIds(tenantId, prisma)
  const where: Prisma.MemberWhereInput = migrationStatus
    ? {
        AND: [baseWhere, toMemberMigrationWhere(migrationStatus, finalizedIds)],
      }
    : baseWhere
  // Status/KYC buckets plus non-null userId counts give every tile in one
  // grouped query; only the unfiltered view needs a separate finalized count.
  const [groups, migrationFinalizedCount] = await Promise.all([
    prisma.member.groupBy({
      _count: { _all: true, userId: true },
      by: ["status", "kycStatus"],
      where,
    }),
    migrationStatus
      ? null
      : prisma.member.count({
          where: {
            AND: [baseWhere, toMemberMigrationWhere("finalized", finalizedIds)],
          },
        }),
  ])
  const sum = (
    rows: typeof groups,
    count = (row: (typeof groups)[number]) => row._count._all
  ) => rows.reduce((total, row) => total + count(row), 0)
  const totalCount = sum(groups)

  return {
    activeCount: sum(groups.filter((group) => group.status === "active")),
    kycPendingCount: sum(
      groups.filter((group) => group.kycStatus !== "verified")
    ),
    linkedUsersCount: sum(groups, (group) => group._count.userId),
    migrationFinalizedCount:
      migrationFinalizedCount ??
      (migrationStatus === "finalized" ? totalCount : 0),
    totalCount,
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
            cooperativeAccessCode: true,
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
          cooperativeAccessCode: true,
          email: true,
          fullName: true,
          id: true,
          isPlatformOwner: true,
          passwordHash: true,
          phoneNumber: true,
          tenantId: true,
        },
      }))

    if (!user.cooperativeAccessCode) {
      const tenant = await tx.tenant.findUnique({
        where: { id: input.tenantId },
        select: { cooperativeCodePrefix: true },
      })
      if (tenant?.cooperativeCodePrefix) {
        await tx.user.update({
          where: { id: user.id },
          data: {
            cooperativeAccessCode: composeCooperativeAccessCode(
              tenant.cooperativeCodePrefix,
              member.memberNumber
            ),
          },
        })
      }
    }

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
  const baseWhere = buildMemberWhere(tenantId, {
    ...filters,
    search: filters?.q ?? undefined,
  })
  const where: Prisma.MemberWhereInput = filters?.migrationStatus
    ? {
        AND: [
          baseWhere,
          toMemberMigrationWhere(
            filters.migrationStatus,
            await listMigrationFinalizedMemberIds(tenantId, prisma)
          ),
        ],
      }
    : baseWhere

  const rows = await prisma.member.findMany({
    where,
    orderBy: getMembersTableOrderBy(filters?.sort),
    skip: safeOffset,
    take: pageSize + 1,
    include: memberListInclude,
  })
  const hasNextPage = rows.length > pageSize
  const data = rows.slice(0, pageSize)
  const readinessByMemberId = await getMembersOperationalReadiness(
    {
      memberIds: data.map((member) => member.id),
      tenantId,
    },
    prisma
  )
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
  const writeAccess = await getTenantMigrationWriteAccess(
    tenantId,
    prisma as PrismaClient
  )

  if (writeAccess.canUseLiveFinancialWrites) {
    return
  }

  if (!writeAccess.canUseMigrationTools) {
    throw ExpectedQueryError.precondition(
      "Member profile writes are locked until initial migration is finalized."
    )
  }

  const migrationState = await getTenantInitialMigrationState(
    tenantId,
    prisma as PrismaClient
  )
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
  const writeAccess = await getTenantMigrationWriteAccess(
    tenantId,
    prisma as PrismaClient
  )

  if (!writeAccess.canUseLiveFinancialWrites) {
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

  try {
    return await prisma.$transaction(
      async (tx) => createMemberWithState(tx, input),
      {
        isolationLevel: "Serializable",
        maxWait: 10_000,
        timeout: 30_000,
      }
    )
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw ExpectedQueryError.conflict(
        "A member with this member number or linked login already exists in this cooperative."
      )
    }
    throw error
  }
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

    const currentMember = await tx.member.findUnique({
      select: { status: true },
      where: { id: memberId, tenantId },
    })
    if (!currentMember) {
      throw ExpectedQueryError.notFound("Member not found.")
    }
    assertMemberStatusTransition(currentMember.status, newStatus)

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
    // KYC is identity data, not a live financial write, so it can be
    // recorded during One Path: the owner verifies their own record before
    // going live (ADR-20261113-go-live-financing-readiness-and-owner-kyc).
    const currentMember = await tx.member.findUnique({
      select: { kycStatus: true },
      where: { id: input.memberId, tenantId: input.tenantId },
    })
    if (!currentMember) {
      throw ExpectedQueryError.notFound("Member not found.")
    }
    assertMemberKycTransition(currentMember.kycStatus, input.kycStatus)

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

    await claimDashboardEvidenceUploadLink(
      {
        tenantId: input.tenantId,
        url: input.documentUrl,
        purpose: "member_document",
        entityId: document.id,
        claimantUserId: input.actorUserId,
      },
      tx
    )

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
  /** Principal of loans already paid out (disbursed, active or defaulted). */
  totalLoanPrincipal: number
  /**
   * Still owed on loans already paid out. Approved loans that are not yet
   * paid out are left out: see `approvedNotPaidOutAmount` (triage 1.5).
   */
  totalOutstandingPrincipal: number
  /** Paid-out loans still running (disbursed, active or defaulted). */
  activeLoanCount: number
  totalEstimatedMonthlyServicing: number
  totalLoanExtraSavingsAmount: number
  /**
   * Approved loans the cooperative has not paid out yet. Shown on their own
   * line ("Approved, not yet paid out"), never inside what the member owes.
   * Deployable funds still hold this money back (approved holds).
   */
  approvedNotPaidOutAmount: number
  approvedNotPaidOutCount: number
  totalRepaymentsPosted: number
  lastRepaymentAt: Date | null
  totalDividendAllocations: number
  dividendAllocationCount: number
  lastDividendAllocatedAt: Date | null
  /** Applied brought-forward special savings (opening position). */
  openingSpecialSavingsBalance: number
  /** Special savings refunds paid out to the member. */
  specialSavingsWithdrawals: number
  /**
   * Special savings the member holds now: applied opening special savings,
   * plus posted extra savings, minus refunds. Same formula the special
   * savings refund guard uses.
   */
  specialSavingsBalance: number
  /** Member share ledger balance as of today, opening share capital included. */
  shareCapitalBalance: number
  /** Unpaid procurement instalments on purchased or active requests. */
  procurementOutstanding: number
  activeProcurementCount: number
  /** Unpaid approved Foodstuff Purchase amounts. */
  foodPurchaseOutstanding: number
  activeFoodPurchaseCount: number
  /** Financing principal + procurement + food purchase still owed. */
  totalObligationsOutstanding: number
}

const statementPayableScheduleStatuses = [
  "due",
  "overdue",
  "partially_paid",
  "pending",
] as const
const statementActiveProcurementStatuses = ["active", "purchased"] as const
/** Loan statuses a statement reads: paid out, plus approved-not-paid-out. */
const statementLoanStatuses = [
  "approved",
  "disbursed",
  "active",
  "defaulted",
] as const

type StatementLoanGroup = {
  memberId: string
  status?: string
  _count?: { _all: number }
  _sum: Record<string, unknown>
}

type StatementLoanTotals = Pick<
  StatementMemberTotals,
  | "approvedNotPaidOutAmount"
  | "approvedNotPaidOutCount"
  | "loanCount"
  | "loanEstimatedMonthlyServicing"
  | "loanExtraMonthlySavingsAmount"
  | "loanOutstandingPrincipal"
  | "loanPrincipalAmount"
>

/**
 * Folds per-member, per-status loan groups into paid-out totals and a
 * separate approved-not-paid-out line (triage 1.5).
 */
export function foldStatementLoanGroups(
  groups: StatementLoanGroup[]
): Map<string, StatementLoanTotals> {
  const totals = new Map<string, StatementLoanTotals>()
  const add = (left: unknown, right: unknown) =>
    Number(left ?? 0) + Number(right ?? 0)

  for (const group of groups) {
    const current = totals.get(group.memberId) ?? {
      approvedNotPaidOutAmount: 0,
      approvedNotPaidOutCount: 0,
      loanCount: 0,
      loanEstimatedMonthlyServicing: 0,
      loanExtraMonthlySavingsAmount: 0,
      loanOutstandingPrincipal: 0,
      loanPrincipalAmount: 0,
    }
    const count = group._count?._all ?? 0

    if (group.status === "approved") {
      current.approvedNotPaidOutAmount = add(
        current.approvedNotPaidOutAmount,
        group._sum.principalAmount
      )
      current.approvedNotPaidOutCount += count
    } else {
      current.loanCount += count
      current.loanPrincipalAmount = add(
        current.loanPrincipalAmount,
        group._sum.principalAmount
      )
      current.loanOutstandingPrincipal = add(
        current.loanOutstandingPrincipal,
        group._sum.outstandingPrincipal
      )
      current.loanEstimatedMonthlyServicing = add(
        current.loanEstimatedMonthlyServicing,
        group._sum.estimatedMonthlyServicing
      )
      current.loanExtraMonthlySavingsAmount = add(
        current.loanExtraMonthlySavingsAmount,
        group._sum.extraMonthlySavingsAmount
      )
    }

    totals.set(group.memberId, current)
  }

  return totals
}

function roundStatementMoney(value: number) {
  return Math.round(value * 100) / 100
}

/**
 * Runs an optional per-member groupBy. Narrow test doubles and older clients
 * that lack a delegate yield no rows instead of failing the whole statement.
 */
async function optionalMemberGroupBy<T>(
  delegate: { groupBy?: (args: any) => Promise<T[]> } | undefined,
  args: Record<string, unknown>
): Promise<T[]> {
  return typeof delegate?.groupBy === "function"
    ? delegate.groupBy({ by: ["memberId"], ...args })
    : []
}

type MemberAmountGroup = {
  memberId: string
  _count?: { _all: number }
  _sum: Record<string, unknown>
}

export async function listMemberStatementSummaries(
  tenantId: string,
  prismaOverride?: PrismaClient,
  memberId?: string
): Promise<MemberStatementSummary[]> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const memberScope = { tenantId, ...(memberId ? { memberId } : {}) }
  const optionalDelegates = prisma as unknown as Record<
    string,
    { groupBy?: (args: any) => Promise<MemberAmountGroup[]> } | undefined
  >

  const [
    members,
    contributionTotals,
    repaymentTotals,
    loanTotals,
    dividendTotals,
    openingSpecialTotals,
    specialWithdrawalTotals,
    shareLedgerTotals,
    procurementScheduleTotals,
    activeProcurementTotals,
    foodPurchaseTotals,
  ] = await Promise.all([
    prisma.member.findMany({
      where: { tenantId, ...(memberId ? { id: memberId } : {}) },
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
        ...(memberId ? { memberId } : {}),
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
        ...(memberId ? { memberId } : {}),
        tenantId,
        status: "posted",
      },
      _sum: { amount: true },
      _max: { paidAt: true },
    }),
    prisma.loan.groupBy({
      by: ["memberId", "status"],
      where: {
        ...(memberId ? { memberId } : {}),
        tenantId,
        status: {
          in: [...statementLoanStatuses],
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
        ...(memberId ? { memberId } : {}),
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
    optionalMemberGroupBy(optionalDelegates.memberOpeningBalance, {
      where: { ...memberScope, status: "applied" },
      _sum: { specialSavingsBalance: true },
    }),
    optionalMemberGroupBy(optionalDelegates.memberSpecialSavingsWithdrawal, {
      where: memberScope,
      _sum: { amount: true },
    }),
    optionalMemberGroupBy(optionalDelegates.memberShareLedgerEntry, {
      where: { ...memberScope, effectiveDate: { lte: new Date() } },
      _sum: { amount: true },
    }),
    optionalMemberGroupBy(optionalDelegates.procurementRepaymentScheduleItem, {
      where: {
        ...memberScope,
        status: { in: [...statementPayableScheduleStatuses] },
        procurementRequest: {
          status: { in: [...statementActiveProcurementStatuses] },
        },
      },
      _sum: { amount: true, paidAmount: true },
    }),
    optionalMemberGroupBy(optionalDelegates.procurementRequest, {
      where: {
        ...memberScope,
        status: { in: [...statementActiveProcurementStatuses] },
      },
      _count: { _all: true },
    }),
    optionalMemberGroupBy(optionalDelegates.foodPurchaseApplication, {
      where: {
        ...memberScope,
        approvedAmount: { not: null },
        status: "approved",
      },
      _count: { _all: true },
      _sum: { approvedAmount: true, paidAmount: true },
    }),
  ])

  const indexByMember = (groups: MemberAmountGroup[]) =>
    new Map(groups.map((group) => [group.memberId, group]))
  const openingSpecialMap = indexByMember(openingSpecialTotals)
  const specialWithdrawalMap = indexByMember(specialWithdrawalTotals)
  const shareLedgerMap = indexByMember(shareLedgerTotals)
  const procurementScheduleMap = indexByMember(procurementScheduleTotals)
  const activeProcurementMap = indexByMember(activeProcurementTotals)
  const foodPurchaseMap = indexByMember(foodPurchaseTotals)
  const sumOf = (
    groups: Map<string, MemberAmountGroup>,
    member: string,
    field: string
  ): number => Number(groups.get(member)?._sum[field] ?? 0)
  const countOf = (
    groups: Map<string, MemberAmountGroup>,
    member: string
  ): number => groups.get(member)?._count?._all ?? 0

  const contributionMap = new Map(
    contributionTotals.map((item) => [item.memberId, item])
  )
  const repaymentMap = new Map(
    repaymentTotals.map((item) => [item.memberId, item])
  )
  const loanMap = foldStatementLoanGroups(
    loanTotals as unknown as StatementLoanGroup[]
  )
  const dividendMap = new Map(
    dividendTotals.map((item) => [item.memberId, item])
  )

  return members.map((member) => {
    const activePlan = member.contributionPlans[0] ?? null
    const contributionTotal = contributionMap.get(member.id)
    const repaymentTotal = repaymentMap.get(member.id)
    const loanTotal = loanMap.get(member.id)
    const dividendTotal = dividendMap.get(member.id)

    return buildMemberStatementSummary(
      {
        deductionSourceName: member.deductionSource?.name ?? null,
        email: member.email,
        exitedAt: member.exitedAt,
        fullName: member.fullName,
        id: member.id,
        joinedAt: member.joinedAt,
        memberNumber: member.memberNumber,
        memberType: member.memberType,
        planAmount: activePlan?.amount ?? null,
        planStartsAt: activePlan?.startsAt ?? null,
        status: member.status,
        totalSavingsSnapshot: member.totalSavingsSnapshot,
        userEmail: member.user?.email ?? null,
      },
      {
        activeProcurementCount: countOf(activeProcurementMap, member.id),
        contributionAmount: contributionTotal?._sum.amount,
        contributionCommittedAmount: contributionTotal?._sum.committedAmount,
        contributionCount: contributionTotal?._count._all ?? 0,
        contributionExtraSavingsAmount:
          contributionTotal?._sum.extraSavingsAmount,
        dividendAmount: dividendTotal?._sum.allocationAmount,
        dividendCount: dividendTotal?._count._all ?? 0,
        foodPurchaseApprovedAmount: sumOf(
          foodPurchaseMap,
          member.id,
          "approvedAmount"
        ),
        foodPurchaseCount: countOf(foodPurchaseMap, member.id),
        foodPurchasePaidAmount: sumOf(foodPurchaseMap, member.id, "paidAmount"),
        lastContributionAt: contributionTotal?._max.postedAt ?? null,
        lastDividendAllocatedAt: dividendTotal?._max.createdAt ?? null,
        lastRepaymentAt: repaymentTotal?._max.paidAt ?? null,
        approvedNotPaidOutAmount: loanTotal?.approvedNotPaidOutAmount ?? 0,
        approvedNotPaidOutCount: loanTotal?.approvedNotPaidOutCount ?? 0,
        loanCount: loanTotal?.loanCount ?? 0,
        loanEstimatedMonthlyServicing:
          loanTotal?.loanEstimatedMonthlyServicing ?? 0,
        loanExtraMonthlySavingsAmount:
          loanTotal?.loanExtraMonthlySavingsAmount ?? 0,
        loanOutstandingPrincipal: loanTotal?.loanOutstandingPrincipal ?? 0,
        loanPrincipalAmount: loanTotal?.loanPrincipalAmount ?? 0,
        openingSpecialSavingsBalance: sumOf(
          openingSpecialMap,
          member.id,
          "specialSavingsBalance"
        ),
        procurementScheduledAmount: sumOf(
          procurementScheduleMap,
          member.id,
          "amount"
        ),
        procurementScheduledPaidAmount: sumOf(
          procurementScheduleMap,
          member.id,
          "paidAmount"
        ),
        repaymentAmount: repaymentTotal?._sum.amount,
        shareLedgerAmount: sumOf(shareLedgerMap, member.id, "amount"),
        specialSavingsWithdrawalAmount: sumOf(
          specialWithdrawalMap,
          member.id,
          "amount"
        ),
      }
    )
  })
}

/** The member fields a statement summary shows. */
type StatementMemberRow = {
  deductionSourceName: string | null
  email: string | null
  exitedAt: Date | null
  fullName: string
  id: string
  joinedAt: Date
  memberNumber: string
  memberType: MemberType
  planAmount: unknown
  planStartsAt: Date | null
  status: MemberStatus
  totalSavingsSnapshot: unknown
  userEmail: string | null
}

/** One member's raw totals; missing sums count as zero. */
type StatementMemberTotals = {
  activeProcurementCount: number
  /** Principal of approved loans not yet paid out. */
  approvedNotPaidOutAmount: unknown
  approvedNotPaidOutCount: number
  contributionAmount: unknown
  contributionCommittedAmount: unknown
  contributionCount: number
  contributionExtraSavingsAmount: unknown
  dividendAmount: unknown
  dividendCount: number
  foodPurchaseApprovedAmount: unknown
  foodPurchaseCount: number
  foodPurchasePaidAmount: unknown
  lastContributionAt: Date | null
  lastDividendAllocatedAt: Date | null
  lastRepaymentAt: Date | null
  /** Loan totals below cover paid-out loans only. */
  loanCount: number
  loanEstimatedMonthlyServicing: unknown
  loanExtraMonthlySavingsAmount: unknown
  loanOutstandingPrincipal: unknown
  loanPrincipalAmount: unknown
  openingSpecialSavingsBalance: unknown
  procurementScheduledAmount: unknown
  procurementScheduledPaidAmount: unknown
  repaymentAmount: unknown
  shareLedgerAmount: unknown
  specialSavingsWithdrawalAmount: unknown
}

/**
 * The statement summary formulas, shared by the grouped list read and the
 * one-statement single-member read so both return identical figures.
 */
function buildMemberStatementSummary(
  member: StatementMemberRow,
  totals: StatementMemberTotals
): MemberStatementSummary {
  const amount = (value: unknown) => Number(value ?? 0)
  const totalOutstandingPrincipal = amount(totals.loanOutstandingPrincipal)
  const openingSpecialSavingsBalance = amount(
    totals.openingSpecialSavingsBalance
  )
  const specialSavingsWithdrawals = amount(
    totals.specialSavingsWithdrawalAmount
  )
  const specialSavingsBalance = roundStatementMoney(
    openingSpecialSavingsBalance +
      amount(totals.contributionExtraSavingsAmount) -
      specialSavingsWithdrawals
  )
  const procurementOutstanding = Math.max(
    0,
    roundStatementMoney(
      amount(totals.procurementScheduledAmount) -
        amount(totals.procurementScheduledPaidAmount)
    )
  )
  const foodPurchaseOutstanding = Math.max(
    0,
    roundStatementMoney(
      amount(totals.foodPurchaseApprovedAmount) -
        amount(totals.foodPurchasePaidAmount)
    )
  )

  return {
    memberId: member.id,
    memberNumber: member.memberNumber,
    fullName: member.fullName,
    memberType: member.memberType,
    status: member.status,
    joinedAt: member.joinedAt,
    exitedAt: member.exitedAt,
    email: member.email ?? member.userEmail ?? null,
    deductionSourceName: member.deductionSourceName,
    activeCommitmentAmount: amount(member.planAmount),
    activeCommitmentStartsAt: member.planStartsAt,
    totalSavingsSnapshot: Number(member.totalSavingsSnapshot),
    totalContributions: amount(totals.contributionAmount),
    totalCommittedContributions: amount(totals.contributionCommittedAmount),
    totalExtraSavingsContributions: amount(
      totals.contributionExtraSavingsAmount
    ),
    contributionsCount: totals.contributionCount,
    lastContributionAt: totals.lastContributionAt,
    totalLoanPrincipal: amount(totals.loanPrincipalAmount),
    totalOutstandingPrincipal,
    activeLoanCount: totals.loanCount,
    totalEstimatedMonthlyServicing: amount(
      totals.loanEstimatedMonthlyServicing
    ),
    totalLoanExtraSavingsAmount: amount(totals.loanExtraMonthlySavingsAmount),
    approvedNotPaidOutAmount: roundStatementMoney(
      amount(totals.approvedNotPaidOutAmount)
    ),
    approvedNotPaidOutCount: totals.approvedNotPaidOutCount ?? 0,
    totalRepaymentsPosted: amount(totals.repaymentAmount),
    lastRepaymentAt: totals.lastRepaymentAt,
    totalDividendAllocations: amount(totals.dividendAmount),
    dividendAllocationCount: totals.dividendCount,
    lastDividendAllocatedAt: totals.lastDividendAllocatedAt,
    openingSpecialSavingsBalance,
    specialSavingsWithdrawals,
    specialSavingsBalance,
    shareCapitalBalance: roundStatementMoney(amount(totals.shareLedgerAmount)),
    procurementOutstanding,
    activeProcurementCount: totals.activeProcurementCount,
    foodPurchaseOutstanding,
    activeFoodPurchaseCount: totals.foodPurchaseCount,
    totalObligationsOutstanding: roundStatementMoney(
      totalOutstandingPrincipal +
        procurementOutstanding +
        foodPurchaseOutstanding
    ),
  }
}

type StatementSummarySqlRow = StatementMemberRow & StatementMemberTotals

/**
 * One member's statement summary in a single SQL statement (the grouped list
 * read takes 14). Same filters as `listMemberStatementSummaries`.
 */
async function readMemberStatementSummaryRow(
  prisma: PrismaClient,
  tenantId: string,
  memberId: string
): Promise<StatementSummarySqlRow | null> {
  const payableStatuses = [...statementPayableScheduleStatuses]
  const activeProcurementStatuses = [...statementActiveProcurementStatuses]
  const paidOutLoanStatuses = statementLoanStatuses.filter(
    (status) => status !== "approved"
  )
  const asOf = new Date()
  const rows = (await prisma.$queryRaw`
    SELECT
      m.id::text AS "id",
      m.member_number AS "memberNumber",
      m.full_name AS "fullName",
      m.member_type::text AS "memberType",
      m.status::text AS "status",
      m.joined_at AS "joinedAt",
      m.exited_at AS "exitedAt",
      m.email AS "email",
      m.total_savings_snapshot AS "totalSavingsSnapshot",
      ds.name AS "deductionSourceName",
      u.email AS "userEmail",
      plan.amount AS "planAmount",
      plan.starts_at AS "planStartsAt",
      c.count AS "contributionCount",
      c.amount AS "contributionAmount",
      c.committed AS "contributionCommittedAmount",
      c.extra AS "contributionExtraSavingsAmount",
      c.last_at AS "lastContributionAt",
      r.amount AS "repaymentAmount",
      r.last_at AS "lastRepaymentAt",
      l.count AS "loanCount",
      l.principal AS "loanPrincipalAmount",
      l.outstanding AS "loanOutstandingPrincipal",
      l.servicing AS "loanEstimatedMonthlyServicing",
      l.extra AS "loanExtraMonthlySavingsAmount",
      l.approved_count AS "approvedNotPaidOutCount",
      l.approved_principal AS "approvedNotPaidOutAmount",
      d.count AS "dividendCount",
      d.amount AS "dividendAmount",
      d.last_at AS "lastDividendAllocatedAt",
      (SELECT SUM(special_savings_balance) FROM member_opening_balances
        WHERE tenant_id = m.tenant_id AND member_id = m.id
          AND status = 'applied') AS "openingSpecialSavingsBalance",
      (SELECT SUM(amount) FROM member_special_savings_withdrawals
        WHERE tenant_id = m.tenant_id AND member_id = m.id
      ) AS "specialSavingsWithdrawalAmount",
      (SELECT SUM(amount) FROM member_share_ledger_entries
        WHERE tenant_id = m.tenant_id AND member_id = m.id
          AND effective_date <= ${asOf}) AS "shareLedgerAmount",
      ps.amount AS "procurementScheduledAmount",
      ps.paid AS "procurementScheduledPaidAmount",
      (SELECT count(*)::int FROM procurement_requests
        WHERE tenant_id = m.tenant_id AND member_id = m.id
          AND status::text = ANY(${activeProcurementStatuses}::text[])
      ) AS "activeProcurementCount",
      fp.count AS "foodPurchaseCount",
      fp.approved AS "foodPurchaseApprovedAmount",
      fp.paid AS "foodPurchasePaidAmount"
    FROM members m
    LEFT JOIN deduction_sources ds ON ds.id = m.deduction_source_id
    LEFT JOIN users u ON u.id = m.user_id
    LEFT JOIN LATERAL (
      SELECT amount, starts_at FROM contribution_plans
      WHERE member_id = m.id AND is_active
      ORDER BY starts_at DESC
      LIMIT 1
    ) plan ON TRUE
    CROSS JOIN LATERAL (
      SELECT count(*)::int AS count, SUM(amount) AS amount,
        SUM(committed_amount) AS committed,
        SUM(extra_savings_amount) AS extra, MAX(posted_at) AS last_at
      FROM contributions
      WHERE tenant_id = m.tenant_id AND member_id = m.id AND status = 'posted'
    ) c
    CROSS JOIN LATERAL (
      SELECT SUM(amount) AS amount, MAX(paid_at) AS last_at
      FROM repayments
      WHERE tenant_id = m.tenant_id AND member_id = m.id AND status = 'posted'
    ) r
    CROSS JOIN LATERAL (
      SELECT
        (count(*) FILTER (WHERE status::text = ANY(${paidOutLoanStatuses}::text[])))::int AS count,
        SUM(principal_amount) FILTER (WHERE status::text = ANY(${paidOutLoanStatuses}::text[])) AS principal,
        SUM(outstanding_principal) FILTER (WHERE status::text = ANY(${paidOutLoanStatuses}::text[])) AS outstanding,
        SUM(estimated_monthly_servicing) FILTER (WHERE status::text = ANY(${paidOutLoanStatuses}::text[])) AS servicing,
        SUM(extra_monthly_savings_amount) FILTER (WHERE status::text = ANY(${paidOutLoanStatuses}::text[])) AS extra,
        (count(*) FILTER (WHERE status::text = 'approved'))::int AS approved_count,
        SUM(principal_amount) FILTER (WHERE status::text = 'approved') AS approved_principal
      FROM loans
      WHERE tenant_id = m.tenant_id AND member_id = m.id
        AND status::text = ANY(${[...statementLoanStatuses]}::text[])
    ) l
    CROSS JOIN LATERAL (
      SELECT count(*)::int AS count, SUM(a.allocation_amount) AS amount,
        MAX(a.created_at) AS last_at
      FROM dividend_allocations a
      JOIN dividend_periods p ON p.id = a.dividend_period_id
      WHERE a.tenant_id = m.tenant_id AND a.member_id = m.id
        AND p.status = 'published'
    ) d
    CROSS JOIN LATERAL (
      SELECT SUM(i.amount) AS amount, SUM(i.paid_amount) AS paid
      FROM procurement_repayment_schedule_items i
      JOIN procurement_requests q ON q.id = i.procurement_request_id
      WHERE i.tenant_id = m.tenant_id AND i.member_id = m.id
        AND i.status::text = ANY(${payableStatuses}::text[])
        AND q.status::text = ANY(${activeProcurementStatuses}::text[])
    ) ps
    CROSS JOIN LATERAL (
      SELECT count(*)::int AS count, SUM(approved_amount) AS approved,
        SUM(paid_amount) AS paid
      FROM food_purchase_applications
      WHERE tenant_id = m.tenant_id AND member_id = m.id
        AND approved_amount IS NOT NULL AND status = 'approved'
    ) fp
    WHERE m.tenant_id = ${tenantId}::uuid AND m.id = ${memberId}::uuid
  `) as StatementSummarySqlRow[]

  return rows[0] ?? null
}

/**
 * One member's statement summary: the shared balance source for the member
 * page, member home, mobile and the assistant. One SQL statement; clients
 * without `$queryRaw` (narrow test doubles) use the grouped list read.
 */
export async function getMemberStatementSummary(
  tenantId: string,
  memberId: string,
  prismaOverride?: PrismaClient
): Promise<MemberStatementSummary | null> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  if (
    typeof (prisma as unknown as { $queryRaw?: unknown }).$queryRaw !==
    "function"
  ) {
    const summaries = await listMemberStatementSummaries(
      tenantId,
      prisma,
      memberId
    )

    return summaries[0] ?? null
  }

  const row = await readMemberStatementSummaryRow(prisma, tenantId, memberId)

  return row ? buildMemberStatementSummary(row, row) : null
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
    getMemberStatementSummary(tenantId, memberId, prisma),
  ])

  return {
    member,
    chargeApplications,
    contributions,
    dividendAllocations,
    ledgerTransactions,
    loans,
    repayments,
    summary,
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
