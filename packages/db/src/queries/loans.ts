import type { PrismaClient, RepaymentScheduleStatus } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { applyLoanRequestChargesInTransaction } from "./charges"
import { getDashboardMetrics } from "./dashboard"
import {
  assertLoanRequestIntakeCapacity,
  getDeployableFundsSnapshot,
} from "./financing-cycles"
import { getLedgerAccountByCode, postLedgerTransaction } from "./ledger"
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

export async function listLoanProducts(tenantId: string, prismaOverride?: PrismaClient) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.loanProduct.findMany({
    where: { tenantId, isActive: true },
    orderBy: { termMonths: "asc" },
  })
}

export async function listLoanRequests(tenantId: string, prismaOverride?: PrismaClient) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.loanRequest.findMany({
    where: { tenantId },
    include: {
      loanProduct: true,
      member: { select: { id: true, fullName: true, memberNumber: true } },
      approvals: {
        orderBy: { actedAt: "desc" },
        include: {
          actorUser: { select: { id: true, fullName: true, email: true } },
        },
      },
    },
    orderBy: { requestedAt: "desc" },
  })
}

export async function listLoans(tenantId: string, prismaOverride?: PrismaClient) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.loan.findMany({
    where: { tenantId },
    include: {
      member: { select: { id: true, fullName: true, memberNumber: true } },
      loanProduct: true,
      loanRequest: true,
      repaymentScheduleItems: {
        orderBy: { installmentNumber: "asc" },
        take: 3,
      },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function listRepayments(
  tenantId: string,
  input?: {
    fromDate?: Date
    loanId?: string
    memberId?: string
    status?: RepaymentScheduleStatus | "posted" | "reversed" | "pending"
    toDate?: Date
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.repayment.findMany({
    where: {
      tenantId,
      ...(input?.memberId ? { memberId: input.memberId } : {}),
      ...(input?.loanId ? { loanId: input.loanId } : {}),
      ...(input?.status && ["posted", "reversed", "pending"].includes(input.status)
        ? { status: input.status as "posted" | "reversed" | "pending" }
        : {}),
      ...((input?.fromDate || input?.toDate)
        ? {
            paidAt: {
              ...(input?.fromDate ? { gte: input.fromDate } : {}),
              ...(input?.toDate ? { lte: input.toDate } : {}),
            },
          }
        : {}),
    },
    include: {
      member: { select: { id: true, fullName: true, memberNumber: true } },
      loan: {
        include: {
          loanProduct: true,
        },
      },
      repaymentScheduleItem: true,
    },
    orderBy: { paidAt: "desc" },
  })
}

export async function listRepaymentScheduleItems(
  tenantId: string,
  input?: {
    assignedToUserId?: string
    fromDate?: Date
    memberId?: string
    resolutionStatus?: string
    stage?: string
    status?: RepaymentScheduleStatus
    toDate?: Date
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.repaymentScheduleItem.findMany({
    where: {
      tenantId,
      ...(input?.status ? { status: input.status } : {}),
      ...(input?.assignedToUserId
        ? {
            collectionFollowUps: {
              some: {
                assignedToUserId: input.assignedToUserId,
              },
            },
          }
        : {}),
      ...(input?.resolutionStatus
        ? {
            collectionFollowUps: {
              some: {
                resolutionStatus: input.resolutionStatus,
              },
            },
          }
        : {}),
      ...(input?.stage
        ? {
            collectionFollowUps: {
              some: {
                caseStage: input.stage,
              },
            },
          }
        : {}),
      ...((input?.fromDate || input?.toDate)
        ? {
            dueAt: {
              ...(input?.fromDate ? { gte: input.fromDate } : {}),
              ...(input?.toDate ? { lte: input.toDate } : {}),
            },
          }
        : {}),
      ...(input?.memberId
        ? {
            loan: {
              memberId: input.memberId,
            },
          }
        : {}),
    },
    include: {
      loan: {
        include: {
          member: { select: { id: true, fullName: true, memberNumber: true } },
          loanProduct: true,
        },
      },
      collectionFollowUps: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          actorUser: { select: { id: true, fullName: true, email: true } },
          assignedToUser: { select: { id: true, fullName: true, email: true } },
        },
      },
    },
    orderBy: [{ dueAt: "asc" }, { installmentNumber: "asc" }],
  })
}

export async function listCollectionFollowUps(
  tenantId: string,
  input?: {
    assignedToUserId?: string
    fromDate?: Date
    limit?: number
    memberId?: string
    resolutionStatus?: string
    stage?: string
    status?: string
    toDate?: Date
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.collectionFollowUp.findMany({
    where: {
      tenantId,
      ...(input?.memberId ? { memberId: input.memberId } : {}),
      ...(input?.assignedToUserId ? { assignedToUserId: input.assignedToUserId } : {}),
      ...(input?.resolutionStatus ? { resolutionStatus: input.resolutionStatus } : {}),
      ...(input?.stage ? { caseStage: input.stage } : {}),
      ...(input?.status ? { status: input.status } : {}),
      ...((input?.fromDate || input?.toDate)
        ? {
            createdAt: {
              ...(input?.fromDate ? { gte: input.fromDate } : {}),
              ...(input?.toDate ? { lte: input.toDate } : {}),
            },
          }
        : {}),
    },
    include: {
      actorUser: { select: { id: true, fullName: true, email: true } },
      assignedToUser: { select: { id: true, fullName: true, email: true } },
      loan: {
        include: {
          loanProduct: true,
          member: { select: { id: true, fullName: true, memberNumber: true } },
        },
      },
      member: { select: { id: true, fullName: true, memberNumber: true } },
      repaymentScheduleItem: true,
    },
    orderBy: { createdAt: "desc" },
    take: input?.limit ?? 25,
  })
}

export async function getCollectionFollowUpSummary(
  tenantId: string,
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const [total, reminded, promiseToPay, unreachable, settled, dueNext, activeCases, resolvedCases, highPriority] = await Promise.all([
    prisma.collectionFollowUp.count({ where: { tenantId } }),
    prisma.collectionFollowUp.count({ where: { tenantId, status: "reminded" } }),
    prisma.collectionFollowUp.count({ where: { tenantId, status: "promise_to_pay" } }),
    prisma.collectionFollowUp.count({ where: { tenantId, status: "unreachable" } }),
    prisma.collectionFollowUp.count({ where: { tenantId, status: "settled" } }),
    prisma.collectionFollowUp.count({
      where: {
        tenantId,
        nextActionAt: {
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    prisma.collectionFollowUp.count({ where: { tenantId, resolutionStatus: "open" } }),
    prisma.collectionFollowUp.count({ where: { tenantId, resolutionStatus: "resolved" } }),
    prisma.collectionFollowUp.count({ where: { tenantId, priority: "high" } }),
  ])

  return { activeCases, dueNext, highPriority, promiseToPay, reminded, resolvedCases, settled, total, unreachable }
}

export async function refreshCollectionsStatuses(
  input: {
    actorUserId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  await assertLiveFinancialWritesOpen(input.tenantId, prisma)

  const today = new Date()

  return prisma.$transaction(async (tx) => {
    const result = await tx.repaymentScheduleItem.updateMany({
      where: {
        tenantId: input.tenantId,
        dueAt: { lt: today },
        status: {
          in: ["pending", "due", "partially_paid"],
        },
      },
      data: {
        status: "overdue",
      },
    })

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        actorType: "user",
        action: "collections.statuses_refreshed",
        entityType: "RepaymentScheduleItem",
        metadata: {
          updatedCount: result.count,
        },
        occurredAt: new Date(),
      },
    })

    return result
  })
}

function calculateEstimatedMonthlyServicing(requestedAmount: number, requestedTermMonths: number) {
  if (requestedTermMonths <= 0) {
    throw new Error("Repayment term must be at least one month.")
  }

  return Number((requestedAmount / requestedTermMonths).toFixed(2))
}

export type SubmitLoanRequestInput = {
  actorUserId: string
  extraMonthlySavingsAmount?: number
  loanProductId: string
  memberId: string
  purpose?: string
  requestedAmount: number
  requestedTermMonths: number
  tenantId: string
}

export async function submitLoanRequest(
  input: SubmitLoanRequestInput,
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  await assertLiveFinancialWritesOpen(input.tenantId, prisma)

  const [member, loanProduct, policy, metrics] = await Promise.all([
    prisma.member.findFirst({
      where: { id: input.memberId, tenantId: input.tenantId },
    }),
    prisma.loanProduct.findFirst({
      where: { id: input.loanProductId, tenantId: input.tenantId, isActive: true },
    }),
    prisma.tenantPolicy.findUnique({
      where: { tenantId: input.tenantId },
    }),
    getDashboardMetrics(input.tenantId, prisma),
  ])

  if (!member) throw new Error("Member not found")
  if (!loanProduct) throw new Error("Loan product not found")
  if (input.requestedTermMonths > loanProduct.termMonths) {
    throw new Error(`Requested term exceeds the product limit of ${loanProduct.termMonths} months.`)
  }

  const policyMultiple = Number(policy?.loanEligibilityMultiple ?? 2)
  const productMultiple = Number(loanProduct.maxSavingsMultiple)
  const eligibleAmount = Number(member.totalSavingsSnapshot) * Math.min(policyMultiple, productMultiple)

  if (input.requestedAmount > eligibleAmount) {
    throw new Error("Requested amount exceeds the member eligibility snapshot.")
  }

  const estimatedMonthlyServicing = calculateEstimatedMonthlyServicing(
    input.requestedAmount,
    input.requestedTermMonths,
  )
  const capacityCheck = await assertLoanRequestIntakeCapacity(
    {
      loanProduct: {
        loanType: loanProduct.loanType,
      },
      requestedAmount: input.requestedAmount,
      tenantId: input.tenantId,
    },
    prisma,
  )

  return prisma.$transaction(async (tx) => {
    const request = await tx.loanRequest.create({
      data: {
        tenantId: input.tenantId,
        memberId: input.memberId,
        loanProductId: input.loanProductId,
        createdByUserId: input.actorUserId,
        requestedAmount: input.requestedAmount,
        requestedTermMonths: input.requestedTermMonths,
        estimatedMonthlyServicing,
        extraMonthlySavingsAmount: input.extraMonthlySavingsAmount ?? 0,
        eligibleAmountSnapshot: eligibleAmount,
        availablePoolSnapshot: metrics.availablePool,
        requestedAt: new Date(),
        purpose: input.purpose,
        status: "submitted",
      },
    })

    await tx.loanApproval.create({
      data: {
        tenantId: input.tenantId,
        loanRequestId: request.id,
        actorUserId: input.actorUserId,
        action: "submitted",
        actedAt: new Date(),
        notes: "Loan request submitted from dashboard workflow.",
      },
    })

    await applyLoanRequestChargesInTransaction(
      {
        actorUserId: input.actorUserId,
        assessedAt: request.requestedAt,
        loanRequestId: request.id,
        memberId: request.memberId,
        requestedAmount: Number(request.requestedAmount),
        tenantId: input.tenantId,
      },
      tx as unknown as PrismaClient,
    )

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        actorType: "user",
        action: "loan_request.submitted",
        entityType: "LoanRequest",
        entityId: request.id,
        metadata: {
          availablePool: metrics.availablePool,
          capacity: capacityCheck,
          eligibleAmount,
          estimatedMonthlyServicing,
          extraMonthlySavingsAmount: input.extraMonthlySavingsAmount ?? 0,
          memberId: input.memberId,
          requestedAmount: input.requestedAmount,
          requestedTermMonths: input.requestedTermMonths,
        },
        occurredAt: new Date(),
      },
    })

    return request
  })
}

export async function reviewLoanRequest(
  input: {
    actorUserId: string
    loanRequestId: string
    notes?: string
    status: "approved" | "rejected" | "under_review"
    tenantId: string
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  await assertLiveFinancialWritesOpen(input.tenantId, prisma)

  return prisma.$transaction(async (tx) => {
    const existingRequest = await tx.loanRequest.findFirst({
      where: { id: input.loanRequestId, tenantId: input.tenantId },
    })
    if (!existingRequest) throw new Error("Loan request not found")

    const policy = await tx.tenantPolicy.findUnique({
      where: { tenantId: input.tenantId },
    })

    const requiresDualApproval = Boolean(policy?.requiresDualLoanApproval)
    const existingApprovals = await tx.loanApproval.findMany({
      where: {
        tenantId: input.tenantId,
        loanRequestId: existingRequest.id,
        action: "approved",
      },
      orderBy: { actedAt: "asc" },
    })

    let nextStatus = input.status
    let shouldMaterializeLoan = input.status === "approved"

    if (input.status === "approved" && requiresDualApproval) {
      const approvingActorIds = new Set(existingApprovals.map((approval) => approval.actorUserId))
      approvingActorIds.add(input.actorUserId)

      if (approvingActorIds.size < 2) {
        nextStatus = "under_review"
        shouldMaterializeLoan = false
      }
    }

    const request = await tx.loanRequest.update({
      where: { id: existingRequest.id },
      data: {
        reviewNotes: input.notes,
        status: nextStatus,
      },
      include: {
        loanProduct: true,
      },
    })

    if (input.status === "approved" || input.status === "rejected") {
      await tx.loanApproval.create({
        data: {
          tenantId: input.tenantId,
          loanRequestId: request.id,
          actorUserId: input.actorUserId,
          action: input.status,
          actedAt: new Date(),
          notes: input.notes,
        },
      })
    }

    if (shouldMaterializeLoan) {
      await tx.loan.upsert({
        where: { loanRequestId: request.id },
        update: {
          principalAmount: request.requestedAmount,
          termMonths: request.requestedTermMonths,
          estimatedMonthlyServicing: request.estimatedMonthlyServicing,
          extraMonthlySavingsAmount: request.extraMonthlySavingsAmount,
          outstandingPrincipal: request.requestedAmount,
          status: "approved",
        },
        create: {
          tenantId: input.tenantId,
          memberId: request.memberId,
          loanRequestId: request.id,
          loanProductId: request.loanProductId,
          principalAmount: request.requestedAmount,
          termMonths: request.requestedTermMonths,
          estimatedMonthlyServicing: request.estimatedMonthlyServicing,
          extraMonthlySavingsAmount: request.extraMonthlySavingsAmount,
          outstandingPrincipal: request.requestedAmount,
          status: "approved",
        },
      })
    }

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        actorType: "user",
        action: `loan_request.${nextStatus}`,
        entityType: "LoanRequest",
        entityId: request.id,
        metadata: {
          approvalCountAfterAction:
            input.status === "approved" ? existingApprovals.length + 1 : existingApprovals.length,
          requiresDualApproval,
          notes: input.notes ?? null,
        },
        occurredAt: new Date(),
      },
    })

    return request
  })
}

export async function recordCollectionFollowUp(
  input: {
    assignedToUserId?: string
    actorUserId: string
    caseStage?: string
    note: string
    nextActionAt?: string
    priority?: string
    promiseToPayAt?: string
    repaymentScheduleItemId: string
    resolutionStatus?: string
    status: "promise_to_pay" | "reminded" | "settled" | "unreachable"
    tenantId: string
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  await assertLiveFinancialWritesOpen(input.tenantId, prisma)

  const item = await prisma.repaymentScheduleItem.findFirst({
    where: {
      id: input.repaymentScheduleItemId,
      tenantId: input.tenantId,
    },
    include: {
      loan: {
        include: {
          member: true,
        },
      },
    },
  })

  if (!item) {
    throw new Error("Repayment schedule item not found")
  }

  const followUp = await prisma.collectionFollowUp.create({
    data: {
      assignedToUserId: input.assignedToUserId ?? null,
      actorUserId: input.actorUserId,
      caseStage: input.caseStage ?? "active",
      loanId: item.loanId,
      memberId: item.loan.memberId,
      nextActionAt: input.nextActionAt ? new Date(`${input.nextActionAt}T00:00:00.000Z`) : null,
      note: input.note,
      priority: input.priority ?? "normal",
      promiseToPayAt: input.promiseToPayAt ? new Date(`${input.promiseToPayAt}T00:00:00.000Z`) : null,
      repaymentScheduleItemId: input.repaymentScheduleItemId,
      resolutionStatus: input.resolutionStatus ?? (input.status === "settled" ? "resolved" : "open"),
      status: input.status,
      tenantId: input.tenantId,
    },
  })

  await prisma.auditLog.create({
    data: {
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      actorType: "user",
      action: "collections.follow_up_recorded",
      entityType: "CollectionFollowUp",
      entityId: followUp.id,
      metadata: {
        loanId: item.loanId,
        memberId: item.loan.memberId,
        assignedToUserId: input.assignedToUserId ?? null,
        caseStage: input.caseStage ?? "active",
        nextActionAt: input.nextActionAt ?? null,
        note: input.note,
        priority: input.priority ?? "normal",
        promiseToPayAt: input.promiseToPayAt ?? null,
        repaymentScheduleItemId: input.repaymentScheduleItemId,
        resolutionStatus: input.resolutionStatus ?? (input.status === "settled" ? "resolved" : "open"),
        status: input.status,
      },
      occurredAt: new Date(),
    },
  })

  return followUp
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

export async function disburseLoan(
  input: {
    actorUserId: string
    firstRepaymentDueAt?: string
    loanId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  await assertLiveFinancialWritesOpen(input.tenantId, prisma)

  const existingLoan = await prisma.loan.findFirst({
    where: { id: input.loanId, tenantId: input.tenantId },
  })
  if (!existingLoan) throw new Error("Loan not found")

  const policy = await prisma.tenantPolicy.findUnique({
    where: { tenantId: input.tenantId },
  })
  const requiresDeployableFunds =
    policy?.disbursementRequiresDeployableFunds ?? true
  const deployableFunds = await getDeployableFundsSnapshot(
    {
      excludeLoanId: existingLoan.id,
      tenantId: input.tenantId,
    },
    prisma,
  )

  if (
    requiresDeployableFunds &&
    Number(existingLoan.principalAmount) > deployableFunds.deployableFunds
  ) {
    throw new Error(
      `Deployable funds are insufficient for this disbursement. Available: ${deployableFunds.deployableFunds.toLocaleString("en-NG")}.`,
    )
  }

  const cashAccount = await getLedgerAccountByCode(input.tenantId, "2000", prisma)
  const loanReceivableAccount = await getLedgerAccountByCode(input.tenantId, "1100", prisma)

  if (!cashAccount || !loanReceivableAccount) {
    throw new Error("Ledger accounts not initialized for this cooperative")
  }

  return prisma.$transaction(async (tx) => {
    const loan = await tx.loan.update({
      where: { id: existingLoan.id },
      data: {
        disbursedAt: new Date(),
        firstRepaymentDueAt: input.firstRepaymentDueAt
          ? new Date(`${input.firstRepaymentDueAt}T00:00:00.000Z`)
          : undefined,
        status: "disbursed",
      },
      include: {
        loanProduct: true,
        loanRequest: true,
      },
    })

    await tx.loanApproval.create({
      data: {
        tenantId: input.tenantId,
        loanRequestId: loan.loanRequestId,
        actorUserId: input.actorUserId,
        action: "disbursed",
        actedAt: new Date(),
        notes: "Loan disbursed from dashboard workflow.",
      },
    })

    const repaymentStartDate = loan.firstRepaymentDueAt ?? new Date()
    if (!loan.firstRepaymentDueAt) {
      repaymentStartDate.setUTCMonth(repaymentStartDate.getUTCMonth() + 1)
    }

    const scheduleItems = buildRepaymentSchedule({
      principalAmount: Number(loan.principalAmount),
      startDate: repaymentStartDate,
      termMonths: loan.termMonths,
    })

    await tx.repaymentScheduleItem.createMany({
      data: scheduleItems.map((item) => ({
        tenantId: input.tenantId,
        loanId: loan.id,
        installmentNumber: item.installmentNumber,
        dueAt: item.dueAt,
        principalDue: item.principalDue,
        chargeDue: item.chargeDue,
        totalDue: item.totalDue,
        amountPaid: item.amountPaid,
        status: item.status,
      })),
    })

    await postLedgerTransaction(
      {
        tenantId: input.tenantId,
        transactionType: "loan_disbursement",
        postedAt: loan.disbursedAt ?? new Date(),
        memberId: loan.memberId,
        loanId: loan.id,
        narration: `Loan disbursement for ${loan.loanProduct.name}`,
        entries: [
          { ledgerAccountId: loanReceivableAccount.id, direction: "debit", amount: Number(loan.principalAmount) },
          { ledgerAccountId: cashAccount.id, direction: "credit", amount: Number(loan.principalAmount) },
        ],
      },
      tx as unknown as PrismaClient,
    )

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        actorType: "user",
        action: "loan.disbursed",
        entityType: "Loan",
        entityId: loan.id,
        metadata: {
          deployableFunds,
          loanRequestId: loan.loanRequestId,
          principalAmount: Number(loan.principalAmount),
          scheduledMonthlyServicing: Number(loan.estimatedMonthlyServicing),
          extraMonthlySavingsAmount: Number(loan.extraMonthlySavingsAmount),
        },
        occurredAt: new Date(),
      },
    })

    return loan
  })
}

export async function postRepayment(
  input: {
    actorUserId: string
    amount: number
    loanId: string
    reference?: string
    repaymentScheduleItemId?: string
    sourceType?: "import"
    tenantId: string
  },
  prismaOverride?: PrismaClient,
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  if (input.sourceType !== "import") {
    await assertLiveFinancialWritesOpen(input.tenantId, prisma)
  }

  const cashAccount = await getLedgerAccountByCode(input.tenantId, "2000", prisma)
  const loanReceivableAccount = await getLedgerAccountByCode(input.tenantId, "1100", prisma)

  if (!cashAccount || !loanReceivableAccount) {
    throw new Error("Ledger accounts not initialized for this cooperative")
  }

  return prisma.$transaction(async (tx) => {
    const loan = await tx.loan.findFirst({
      where: { id: input.loanId, tenantId: input.tenantId },
    })
    if (!loan) throw new Error("Loan not found")
    if (input.amount > Number(loan.outstandingPrincipal)) {
      throw new Error("Repayment amount exceeds the outstanding loan balance.")
    }

    const repayment = await tx.repayment.create({
      data: {
        tenantId: input.tenantId,
        memberId: loan.memberId,
        loanId: loan.id,
        repaymentScheduleItemId: input.repaymentScheduleItemId,
        receivedByUserId: input.actorUserId,
        paidAt: new Date(),
        amount: input.amount,
        status: "posted",
        reference: input.reference,
      },
    })

    await tx.loan.update({
      where: { id: loan.id },
      data: {
        outstandingPrincipal: {
          decrement: input.amount,
        },
        status: Number(loan.outstandingPrincipal) - input.amount <= 0 ? "completed" : "active",
        ...(Number(loan.outstandingPrincipal) - input.amount <= 0 ? { closedAt: new Date() } : {}),
      },
    })

    await allocateRepaymentAcrossScheduleItems({
      amount: input.amount,
      loanId: loan.id,
      tenantId: input.tenantId,
      tx: tx as unknown as PrismaClient,
    })

    await postLedgerTransaction(
      {
        tenantId: input.tenantId,
        transactionType: "loan_repayment",
        postedAt: repayment.paidAt,
        memberId: loan.memberId,
        loanId: loan.id,
        repaymentId: repayment.id,
        reference: input.reference,
        narration: "Loan repayment received",
        sourceType: input.sourceType,
        entries: [
          { ledgerAccountId: cashAccount.id, direction: "debit", amount: input.amount },
          { ledgerAccountId: loanReceivableAccount.id, direction: "credit", amount: input.amount },
        ],
      },
      tx as unknown as PrismaClient,
    )

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        actorType: "user",
        action: "repayment.posted",
        entityType: "Repayment",
        entityId: repayment.id,
        metadata: {
          amount: input.amount,
          loanId: loan.id,
          repaymentScheduleItemId: input.repaymentScheduleItemId ?? null,
        },
        occurredAt: new Date(),
      },
    })

    return repayment
  })
}
