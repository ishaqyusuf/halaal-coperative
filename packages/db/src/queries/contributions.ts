import type {
  ContributionChannel,
  ContributionStatus,
  PaymentAllocationPreference,
  PrismaClient,
} from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { getLedgerAccountByCode, postLedgerTransaction } from "./ledger"
import { stopRemainingScheduleForClearedLoan } from "./loans"
import { getTenantInitialMigrationState } from "./migration"

async function assertLiveFinancialWritesOpen(
  tenantId: string,
  prisma: PrismaClient,
) {
  const migrationState = await getTenantInitialMigrationState(tenantId, prisma)

  if (!migrationState.snapshot.canUseLiveFinancialWrites) {
    throw new Error(
      "Live financial record writes are locked until initial migration is finalized.",
    )
  }
}

async function assertCommitmentReductionAllowed(input: {
  currentAmount: number
  memberId: string
  nextAmount: number
  tenantId: string
  tx: PrismaClient
}) {
  if (input.nextAmount >= input.currentAmount) {
    return
  }

  const policy = await input.tx.tenantPolicy.findUnique({
    select: {
      strictCommitmentDuringFinancing: true,
    },
    where: { tenantId: input.tenantId },
  })

  if (policy?.strictCommitmentDuringFinancing !== false) {
    const activeFinancingCount = await input.tx.loan.count({
      where: {
        memberId: input.memberId,
        status: { in: ["approved", "disbursed", "active"] },
        tenantId: input.tenantId,
      },
    })

    if (activeFinancingCount > 0) {
      throw new Error(
        "Strict commitment policy is enabled, so this member's commitment cannot be reduced while serving financing."
      )
    }
  }

  const activeProcurementCount =
    typeof (input.tx as any).procurementRequest?.count === "function"
      ? await (input.tx as any).procurementRequest.count({
          where: {
            allowsCommitmentReductionDuringPayback: false,
            memberId: input.memberId,
            status: { in: ["approved", "purchased", "active"] },
            tenantId: input.tenantId,
          },
        })
      : 0

  if (activeProcurementCount > 0) {
    throw new Error(
      "Procurement commitment policy is fixed, so this member's commitment cannot be reduced while serving procurement."
    )
  }

  const activeFoodPurchaseCount =
    typeof (input.tx as any).foodPurchaseApplication?.count === "function"
      ? await (input.tx as any).foodPurchaseApplication.count({
          where: {
            allowsCommitmentReductionDuringPayback: false,
            memberId: input.memberId,
            paidAt: null,
            status: "approved",
            tenantId: input.tenantId,
          },
        })
      : 0

  if (activeFoodPurchaseCount > 0) {
    throw new Error(
      "Foodstuff Purchase commitment policy is fixed, so this member's commitment cannot be reduced while serving Foodstuff Purchase."
    )
  }
}

export type ListContributionsFilters = {
  channel?: ContributionChannel
  contributionPlanId?: string
  search?: string
  memberId?: string
  specialSavingsOnly?: boolean
  status?: ContributionStatus
  fromDate?: Date
  toDate?: Date
  page?: number
  pageSize?: number
}

export async function listContributions(
  tenantId: string,
  filters?: ListContributionsFilters,
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const page = filters?.page ?? 1
  const pageSize = filters?.pageSize ?? 25

  const where = {
    tenantId,
    ...(filters?.channel && { channel: filters.channel }),
    ...(filters?.contributionPlanId && { contributionPlanId: filters.contributionPlanId }),
    ...(filters?.memberId && { memberId: filters.memberId }),
    ...(filters?.specialSavingsOnly && { extraSavingsAmount: { gt: 0 } }),
    ...(filters?.status && { status: filters.status }),
    ...(filters?.search && {
      member: {
        OR: [
          { fullName: { contains: filters.search, mode: "insensitive" as const } },
          { memberNumber: { contains: filters.search, mode: "insensitive" as const } },
        ],
      },
    }),
    ...((filters?.fromDate || filters?.toDate) && {
      postedAt: {
        ...(filters?.fromDate && { gte: filters.fromDate }),
        ...(filters?.toDate && { lte: filters.toDate }),
      },
    }),
  }

  const [items, total] = await Promise.all([
    prisma.contribution.findMany({
      where,
      orderBy: { postedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        member: { select: { id: true, fullName: true, memberNumber: true } },
        contributionPlan: true,
      },
    }),
    prisma.contribution.count({ where }),
  ])

  return { items, total, page, pageSize }
}

export async function listContributionPlans(tenantId: string, prismaOverride?: PrismaClient) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.contributionPlan.findMany({
    where: { tenantId },
    include: {
      member: {
        select: {
          id: true,
          fullName: true,
          memberNumber: true,
        },
      },
    },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  })
}

export async function listMemberContributionPlans(
  input: {
    memberId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.contributionPlan.findMany({
    include: {
      member: {
        select: {
          fullName: true,
          id: true,
          memberNumber: true,
        },
      },
    },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    where: {
      memberId: input.memberId,
      tenantId: input.tenantId,
    },
  })
}

export async function setMemberContributionPlan(
  input: {
    actorUserId: string
    amount: number
    memberId: string
    name?: string
    startsAt: Date
    tenantId: string
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  await assertLiveFinancialWritesOpen(input.tenantId, prisma)

  return prisma.$transaction(async (tx) => {
    const member = await tx.member.findFirst({
      where: {
        id: input.memberId,
        tenantId: input.tenantId,
      },
      select: {
        joinedAt: true,
        _count: {
          select: {
            contributionPlans: true,
          },
        },
      },
    })

    if (!member) {
      throw new Error("Member not found.")
    }

    if (member._count.contributionPlans === 0 && input.startsAt > member.joinedAt) {
      throw new Error("The first commitment history date cannot be later than the member start date.")
    }

    const activePlan = await tx.contributionPlan.findFirst({
      select: { amount: true },
      where: {
        isActive: true,
        memberId: input.memberId,
        tenantId: input.tenantId,
      },
    })

    if (activePlan) {
      await assertCommitmentReductionAllowed({
        currentAmount: Number(activePlan.amount),
        memberId: input.memberId,
        nextAmount: input.amount,
        tenantId: input.tenantId,
        tx: tx as unknown as PrismaClient,
      })
    }

    await tx.contributionPlan.updateMany({
      where: {
        tenantId: input.tenantId,
        memberId: input.memberId,
        isActive: true,
      },
      data: {
        isActive: false,
        endsAt: input.startsAt,
      },
    })

    const plan = await tx.contributionPlan.create({
      data: {
        tenantId: input.tenantId,
        memberId: input.memberId,
        amount: input.amount,
        interval: "monthly",
        isActive: true,
        name: input.name?.trim() || "Monthly commitment",
        startsAt: input.startsAt,
      },
    })

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        actorType: "user",
        action: "contribution_plan.set",
        entityType: "ContributionPlan",
        entityId: plan.id,
        metadata: {
          amount: input.amount,
          memberId: input.memberId,
          startsAt: input.startsAt.toISOString(),
        },
        occurredAt: new Date(),
      },
    })

    return plan
  })
}

export async function updateContributionPlan(
  input: {
    actorUserId: string
    amount: number
    name?: string
    planId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  await assertLiveFinancialWritesOpen(input.tenantId, prisma)

  return prisma.$transaction(async (tx) => {
    const existingPlan = await tx.contributionPlan.findFirst({
      select: {
        amount: true,
        isActive: true,
        memberId: true,
      },
      where: {
        id: input.planId,
        tenantId: input.tenantId,
      },
    })

    if (!existingPlan) {
      throw new Error("Contribution plan not found.")
    }

    if (existingPlan.isActive) {
      await assertCommitmentReductionAllowed({
        currentAmount: Number(existingPlan.amount),
        memberId: existingPlan.memberId,
        nextAmount: input.amount,
        tenantId: input.tenantId,
        tx: tx as unknown as PrismaClient,
      })
    }

    const plan = await tx.contributionPlan.update({
      where: {
        id: input.planId,
        tenantId: input.tenantId,
      },
      data: {
        amount: input.amount,
        ...(input.name !== undefined ? { name: input.name.trim() || "Monthly commitment" } : {}),
      },
    })

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        actorType: "user",
        action: "contribution_plan.updated",
        entityType: "ContributionPlan",
        entityId: plan.id,
        metadata: {
          amount: input.amount,
          name: input.name ?? null,
        },
        occurredAt: new Date(),
      },
    })

    return plan
  })
}

export async function closeContributionPlan(
  input: {
    actorUserId: string
    endsAt: Date
    planId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  await assertLiveFinancialWritesOpen(input.tenantId, prisma)

  return prisma.$transaction(async (tx) => {
    const plan = await tx.contributionPlan.update({
      where: {
        id: input.planId,
        tenantId: input.tenantId,
      },
      data: {
        endsAt: input.endsAt,
        isActive: false,
      },
    })

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        actorType: "user",
        action: "contribution_plan.closed",
        entityType: "ContributionPlan",
        entityId: plan.id,
        metadata: {
          endsAt: input.endsAt.toISOString(),
        },
        occurredAt: new Date(),
      },
    })

    return plan
  })
}

export async function updateMemberPaymentAllocationPreference(
  input: {
    actorUserId: string
    memberId: string
    preference: PaymentAllocationPreference
    tenantId: string
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  await assertLiveFinancialWritesOpen(input.tenantId, prisma)

  return prisma.$transaction(async (tx) => {
    const member = await tx.member.update({
      where: {
        id: input.memberId,
        tenantId: input.tenantId,
      },
      data: {
        paymentAllocationPreference: input.preference,
      },
    })

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        actorType: "user",
        action: "member.payment_allocation_preference_updated",
        entityType: "Member",
        entityId: member.id,
        metadata: {
          preference: input.preference,
        },
        occurredAt: new Date(),
      },
    })

    return member
  })
}

type RecordContributionInput = {
  tenantId: string
  memberId: string
  amount: number
  channel: ContributionChannel
  postedAt: Date
  contributionPlanId?: string
  committedAmount?: number
  extraSavingsAmount?: number
  periodLabel?: string
  reference?: string
  notes?: string
  actorUserId: string
  sourceType?: "backfill" | "import"
}

export async function recordContribution(
  input: RecordContributionInput,
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  if (input.sourceType !== "backfill" && input.sourceType !== "import") {
    await assertLiveFinancialWritesOpen(input.tenantId, prisma)
  }

  const cashAccount = await getLedgerAccountByCode(input.tenantId, "2000", prisma)
  const savingsAccount = await getLedgerAccountByCode(input.tenantId, "1000", prisma)

  if (!cashAccount || !savingsAccount) {
    throw new Error("Ledger accounts not initialized for this cooperative")
  }

  return prisma.$transaction(async (tx) => {
    const contribution = await tx.contribution.create({
      data: {
        tenantId: input.tenantId,
        memberId: input.memberId,
        amount: input.amount,
        channel: input.channel,
        postedAt: input.postedAt,
        status: "posted",
        committedAmount: input.committedAmount,
        contributionPlanId: input.contributionPlanId,
        extraSavingsAmount: input.extraSavingsAmount ?? 0,
        periodLabel: input.periodLabel,
        reference: input.reference,
        notes: input.notes,
      },
    })

    await postLedgerTransaction(
      {
        tenantId: input.tenantId,
        transactionType: "contribution",
        postedAt: input.postedAt,
        memberId: input.memberId,
        contributionId: contribution.id,
        narration: `Contribution from member${input.periodLabel ? ` for ${input.periodLabel}` : ""}`,
        sourceType: input.sourceType,
        entries: [
          { ledgerAccountId: cashAccount.id, direction: "debit", amount: input.amount },
          { ledgerAccountId: savingsAccount.id, direction: "credit", amount: input.amount },
        ],
      },
      tx as unknown as PrismaClient,
    )

    await tx.member.update({
      where: { id: input.memberId, tenantId: input.tenantId },
      data: {
        totalSavingsSnapshot: { increment: input.amount },
      },
    })

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        actorType: "user",
        action: "contribution.recorded",
        entityType: "Contribution",
        entityId: contribution.id,
        metadata: {
          amount: input.amount,
          channel: input.channel,
          committedAmount: input.committedAmount ?? null,
          extraSavingsAmount: input.extraSavingsAmount ?? 0,
          memberId: input.memberId,
        },
        occurredAt: new Date(),
      },
    })

    return contribution
  })
}

async function allocateRepaymentAcrossScheduleItems(input: {
  loanId: string
  tenantId: string
  amount: number
  tx: PrismaClient
}) {
  let remaining = input.amount
  const scheduleItems = await input.tx.repaymentScheduleItem.findMany({
    where: {
      tenantId: input.tenantId,
      loanId: input.loanId,
      status: {
        in: ["pending", "due", "overdue", "partially_paid"],
      },
    },
    orderBy: [{ installmentNumber: "asc" }],
  })

  for (const item of scheduleItems) {
    if (remaining <= 0) break

    const outstandingForItem = Number(item.totalDue) - Number(item.amountPaid)
    if (outstandingForItem <= 0) continue

    const allocated = Math.min(outstandingForItem, remaining)
    const nextPaid = Number(item.amountPaid) + allocated

    await input.tx.repaymentScheduleItem.update({
      where: { id: item.id },
      data: {
        amountPaid: nextPaid,
        status: nextPaid >= Number(item.totalDue) ? "paid" : "partially_paid",
      },
    })

    remaining -= allocated
  }
}

export type RecordMemberPaymentInput = {
  actorUserId: string
  channel: ContributionChannel
  committedSavingsAmount: number
  contributionPlanId?: string
  extraLoanPaymentAmount?: number
  extraSavingsAmount?: number
  loanId?: string
  periodLabel?: string
  postedAt: Date
  totalAmount?: number
  reference?: string
  scheduledLoanServicingAmount?: number
  tenantId: string
  memberId: string
}

export type RecordMemberPaymentResult = {
  contributionId: string | null
  repaymentId: string | null
}

export async function recordMemberPaymentMutation(
  input: RecordMemberPaymentInput,
  prisma: PrismaClient,
): Promise<RecordMemberPaymentResult> {
  const member = await prisma.member.findFirst({
    where: {
      id: input.memberId,
      tenantId: input.tenantId,
    },
    select: {
      paymentAllocationPreference: true,
    },
  })

  if (!member) {
    throw new Error("Member not found.")
  }

  const committedSavingsAmount = input.committedSavingsAmount
  let extraSavingsAmount = input.extraSavingsAmount ?? 0
  const scheduledLoanServicingAmount = input.scheduledLoanServicingAmount ?? 0
  let extraLoanPaymentAmount = input.extraLoanPaymentAmount ?? 0
  const explicitTotal =
    committedSavingsAmount + extraSavingsAmount + scheduledLoanServicingAmount + extraLoanPaymentAmount

  if (input.totalAmount !== undefined && input.totalAmount !== null) {
    if (input.totalAmount < explicitTotal) {
      throw new Error("Total payment cannot be less than the explicitly allocated savings and loan amounts.")
    }

    const leftover = input.totalAmount - explicitTotal

    if (leftover > 0) {
      if (member.paymentAllocationPreference === "manual_split") {
        throw new Error("This member uses manual split. Allocate the remaining payment explicitly.")
      }

      if (member.paymentAllocationPreference === "loan_first" && input.loanId) {
        extraLoanPaymentAmount += leftover
      } else {
        extraSavingsAmount += leftover
      }
    }
  }

  const totalSavingsAmount = committedSavingsAmount + extraSavingsAmount
  const totalLoanAmount = scheduledLoanServicingAmount + extraLoanPaymentAmount

  if (totalSavingsAmount <= 0 && totalLoanAmount <= 0) {
    throw new Error("Enter a savings or loan amount to record this payment.")
  }

  const cashAccount = await getLedgerAccountByCode(input.tenantId, "2000", prisma)
  const savingsAccount = await getLedgerAccountByCode(input.tenantId, "1000", prisma)
  const loanReceivableAccount = await getLedgerAccountByCode(input.tenantId, "1100", prisma)

  if (!cashAccount || !savingsAccount || !loanReceivableAccount) {
    throw new Error("Ledger accounts not initialized for this cooperative")
  }

  let contributionId: string | null = null
  let repaymentId: string | null = null

  if (totalSavingsAmount > 0) {
    const contribution = await prisma.contribution.create({
      data: {
        tenantId: input.tenantId,
        memberId: input.memberId,
        amount: totalSavingsAmount,
        channel: input.channel,
        postedAt: input.postedAt,
        status: "posted",
        committedAmount: committedSavingsAmount > 0 ? committedSavingsAmount : null,
        contributionPlanId: input.contributionPlanId,
        extraSavingsAmount,
        periodLabel: input.periodLabel,
        reference: input.reference,
        notes: extraSavingsAmount > 0 ? "Includes voluntary extra savings." : undefined,
      },
    })

    contributionId = contribution.id

    await postLedgerTransaction(
      {
        tenantId: input.tenantId,
        transactionType: "contribution",
        postedAt: input.postedAt,
        memberId: input.memberId,
        contributionId: contribution.id,
        reference: input.reference,
        narration: `Member savings payment${input.periodLabel ? ` for ${input.periodLabel}` : ""}`,
        entries: [
          { ledgerAccountId: cashAccount.id, direction: "debit", amount: totalSavingsAmount },
          { ledgerAccountId: savingsAccount.id, direction: "credit", amount: totalSavingsAmount },
        ],
      },
      prisma,
    )

    await prisma.member.update({
      where: { id: input.memberId, tenantId: input.tenantId },
      data: {
        totalSavingsSnapshot: { increment: totalSavingsAmount },
      },
    })
  }

  if (totalLoanAmount > 0) {
    if (!input.loanId) {
      throw new Error("A loan must be selected when allocating payment to loan servicing.")
    }

    const loan = await prisma.loan.findFirst({
      where: { id: input.loanId, tenantId: input.tenantId, memberId: input.memberId },
    })
    if (!loan) throw new Error("Loan not found for the selected member.")
    const previousOutstandingPrincipal = Number(loan.outstandingPrincipal)
    const nextOutstandingPrincipal = previousOutstandingPrincipal - totalLoanAmount
    const repaymentClearsLoan = nextOutstandingPrincipal <= 0

    if (totalLoanAmount > previousOutstandingPrincipal) {
      throw new Error("Loan servicing amount exceeds the outstanding loan balance.")
    }

    const repayment = await prisma.repayment.create({
      data: {
        tenantId: input.tenantId,
        memberId: input.memberId,
        loanId: loan.id,
        receivedByUserId: input.actorUserId,
        paidAt: input.postedAt,
        amount: totalLoanAmount,
        status: "posted",
        reference: input.reference,
      },
    })

    repaymentId = repayment.id

    await prisma.loan.update({
      where: { id: loan.id },
      data: {
        outstandingPrincipal: {
          decrement: totalLoanAmount,
        },
        status: repaymentClearsLoan ? "completed" : "active",
        ...(repaymentClearsLoan ? { closedAt: input.postedAt } : {}),
      },
    })

    await allocateRepaymentAcrossScheduleItems({
      amount: totalLoanAmount,
      loanId: loan.id,
      tenantId: input.tenantId,
      tx: prisma,
    })

    const settlement = repaymentClearsLoan
      ? await stopRemainingScheduleForClearedLoan({
          loanId: loan.id,
          tenantId: input.tenantId,
          tx: prisma,
        })
      : null

    await postLedgerTransaction(
      {
        tenantId: input.tenantId,
        transactionType: "loan_repayment",
        postedAt: input.postedAt,
        memberId: input.memberId,
        loanId: loan.id,
        repaymentId: repayment.id,
        reference: input.reference,
        narration: "Loan servicing payment received",
        entries: [
          { ledgerAccountId: cashAccount.id, direction: "debit", amount: totalLoanAmount },
          { ledgerAccountId: loanReceivableAccount.id, direction: "credit", amount: totalLoanAmount },
        ],
      },
      prisma,
    )

    if (repaymentClearsLoan) {
      await prisma.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorUserId: input.actorUserId,
          actorType: "user",
          action: "loan.early_settled",
          entityType: "Loan",
          entityId: loan.id,
          metadata: {
            loanId: loan.id,
            repaymentId: repayment.id,
            repaymentAmount: totalLoanAmount,
            previousOutstandingPrincipal,
            closedAt: input.postedAt.toISOString(),
            waivedScheduleItemCount:
              settlement?.waivedScheduleItemCount ?? 0,
            waivedScheduleItemIds: settlement?.waivedScheduleItemIds ?? [],
            waivedScheduleOutstandingAmount:
              settlement?.waivedOutstandingAmount ?? 0,
          },
          occurredAt: input.postedAt,
        },
      })
    }
  }

  await prisma.auditLog.create({
    data: {
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      actorType: "user",
      action: "member_payment.recorded",
      entityType: "MemberPayment",
      metadata: {
        committedSavingsAmount,
        contributionId,
        contributionPlanId: input.contributionPlanId ?? null,
        extraLoanPaymentAmount,
        extraSavingsAmount,
        loanId: input.loanId ?? null,
        memberId: input.memberId,
        paymentAllocationPreference: member.paymentAllocationPreference,
        repaymentId,
        scheduledLoanServicingAmount,
        totalAmount: input.totalAmount ?? explicitTotal,
      },
      occurredAt: new Date(),
    },
  })

  return { contributionId, repaymentId }
}

export async function recordMemberPayment(
  input: RecordMemberPaymentInput,
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  await assertLiveFinancialWritesOpen(input.tenantId, prisma)

  return prisma.$transaction((tx) =>
    recordMemberPaymentMutation(input, tx as unknown as PrismaClient),
  )
}

export async function getContributionHistory(
  tenantId: string,
  memberId: string,
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.contribution.findMany({
    where: { tenantId, memberId },
    orderBy: { postedAt: "desc" },
    take: 50,
  })
}

export async function getMemberSavingsTotal(
  tenantId: string,
  memberId: string,
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const result = await prisma.contribution.aggregate({
    where: { tenantId, memberId, status: "posted" },
    _sum: { amount: true },
  })

  return Number(result._sum.amount ?? 0)
}
