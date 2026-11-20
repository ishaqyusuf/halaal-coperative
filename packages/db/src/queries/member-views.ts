import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { getMemberStatementSummary } from "./members"
import { getMemberProfitPayouts } from "./profit-payouts"

/**
 * Lean reads for the staff member detail page and the printable member
 * statement. They select only the fields those pages render, unlike
 * `getMemberStatementDetail`, which includes additional member and posting
 * history.
 */

const memberProfileSelect = {
  address: true,
  deductionSource: { select: { name: true } },
  deductionSourceId: true,
  email: true,
  fullName: true,
  governmentIdNumber: true,
  id: true,
  joinedAt: true,
  kycDocumentType: true,
  kycDocumentUploadedAt: true,
  kycDocumentUrl: true,
  kycReviewNotes: true,
  kycStatus: true,
  memberNumber: true,
  memberType: true,
  occupation: true,
  phoneNumber: true,
  status: true,
  user: { select: { email: true } },
} as const

const openScheduleStatuses = [
  "pending",
  "due",
  "partially_paid",
  "overdue",
] as const

export async function getMemberDetailOverview(
  tenantId: string,
  memberId: string,
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const member = await prisma.member.findFirst({
    where: { id: memberId, tenantId },
    select: {
      ...memberProfileSelect,
      contributionPlans: {
        orderBy: { startsAt: "desc" },
        select: {
          amount: true,
          endsAt: true,
          id: true,
          isActive: true,
          startsAt: true,
          startsAtGoLive: true,
        },
        take: 12,
      },
      documents: {
        orderBy: { uploadedAt: "desc" },
        select: {
          documentType: true,
          documentUrl: true,
          id: true,
          reviewNotes: true,
          reviewStatus: true,
          reviewedAt: true,
          uploadedAt: true,
        },
        take: 20,
      },
    },
  })

  if (!member) {
    return null
  }

  const [contributions, repayments, loans, summary] = await Promise.all([
    prisma.contribution.findMany({
      where: { tenantId, memberId },
      orderBy: { postedAt: "desc" },
      select: {
        amount: true,
        extraSavingsAmount: true,
        id: true,
        periodLabel: true,
        postedAt: true,
      },
      take: 6,
    }),
    prisma.repayment.findMany({
      where: { tenantId, memberId },
      orderBy: { paidAt: "desc" },
      select: {
        amount: true,
        id: true,
        loan: { select: { loanProduct: { select: { name: true } } } },
        paidAt: true,
      },
      take: 6,
    }),
    prisma.loan.findMany({
      where: { tenantId, memberId },
      orderBy: { createdAt: "desc" },
      select: {
        estimatedMonthlyServicing: true,
        id: true,
        loanProduct: { select: { name: true } },
        outstandingPrincipal: true,
        principalAmount: true,
        repaymentScheduleItems: {
          orderBy: { installmentNumber: "asc" },
          select: { amountPaid: true, dueAt: true, totalDue: true },
          take: 1,
          where: { status: { in: [...openScheduleStatuses] } },
        },
        status: true,
      },
      take: 5,
    }),
    getMemberStatementSummary(tenantId, memberId, prisma),
  ])

  return { contributions, loans, member, repayments, summary }
}

/** Postings per statement page, newest first. */
export const MEMBER_STATEMENT_PAGE_SIZE = 100

export type MemberStatementPostingsOptions =
  /** Every posting: the text downloads. */
  | { allPostings: true }
  /** One page of postings (1-based), `MEMBER_STATEMENT_PAGE_SIZE` each. */
  | { page?: number }

/**
 * A member's printable statement. The page reads one page of postings
 * (`MEMBER_STATEMENT_PAGE_SIZE`, newest first, one extra row to know whether
 * older postings exist); the downloads ask for every posting.
 */
export async function getMemberStatementView(
  tenantId: string,
  memberId: string,
  prismaOverride?: PrismaClient,
  options: MemberStatementPostingsOptions = {}
) {
  return readMemberStatementView(
    { tenantId, id: memberId },
    options,
    prismaOverride
  )
}

/** A complete posting history for the authenticated member in this tenant. */
export async function getOwnMemberStatementView(
  { tenantId, userId }: { tenantId: string; userId: string },
  prismaOverride?: PrismaClient
) {
  return readMemberStatementView(
    { tenantId, userId },
    { allPostings: true },
    prismaOverride
  )
}

async function readMemberStatementView(
  scope: { tenantId: string } & ({ id: string } | { userId: string }),
  options: MemberStatementPostingsOptions,
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const allPostings = "allPostings" in options && options.allPostings
  const page =
    !allPostings && "page" in options && Number.isInteger(options.page)
      ? Math.max(1, options.page ?? 1)
      : 1

  const member = await prisma.member.findFirst({
    where: scope,
    select: {
      deductionSource: { select: { name: true } },
      fullName: true,
      id: true,
      joinedAt: true,
      memberNumber: true,
      status: true,
    },
  })

  if (!member) {
    return null
  }

  const { tenantId } = scope
  const memberId = member.id
  const [ledgerTransactions, dividendAllocations, pendingCharges, summary] =
    await Promise.all([
      prisma.ledgerTransaction.findMany({
        where: { tenantId, memberId },
        orderBy: [{ postedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
        ...(allPostings
          ? {}
          : {
              skip: (page - 1) * MEMBER_STATEMENT_PAGE_SIZE,
              take: MEMBER_STATEMENT_PAGE_SIZE + 1,
            }),
        select: {
          entries: {
            select: {
              amount: true,
              direction: true,
              ledgerAccount: { select: { code: true } },
            },
          },
          id: true,
          narration: true,
          postedAt: true,
          transactionType: true,
        },
      }),
      prisma.dividendAllocation.findMany({
        where: {
          tenantId,
          memberId,
          dividendPeriod: { status: "published" },
        },
        orderBy: { createdAt: "desc" },
        select: {
          allocationAmount: true,
          dividendPeriod: {
            select: { id: true, name: true, publishedAt: true },
          },
          id: true,
        },
        take: 25,
      }),
      prisma.chargeApplication.findMany({
        where: { tenantId, memberId, status: "pending" },
        orderBy: { assessedAt: "desc" },
        select: {
          amount: true,
          assessedAt: true,
          chargeDefinition: { select: { name: true } },
          id: true,
        },
        take: 25,
      }),
      getMemberStatementSummary(tenantId, memberId, prisma),
    ])

  const hasOlderPostings =
    !allPostings && ledgerTransactions.length > MEMBER_STATEMENT_PAGE_SIZE
  // Paid or not, per shared season (profit payout, 1.1).
  const payouts = await getMemberProfitPayouts(
    {
      memberId,
      seasonIds: dividendAllocations.map(
        (allocation) => allocation.dividendPeriod.id
      ),
      tenantId,
    },
    prisma
  )

  return {
    dividendAllocations: dividendAllocations.map((allocation) => ({
      ...allocation,
      payout: payouts.get(allocation.dividendPeriod.id) ?? null,
    })),
    ledgerTransactions: hasOlderPostings
      ? ledgerTransactions.slice(0, MEMBER_STATEMENT_PAGE_SIZE)
      : ledgerTransactions,
    member,
    pendingCharges,
    postings: {
      hasOlder: hasOlderPostings,
      page: allPostings ? null : page,
      pageSize: allPostings ? null : MEMBER_STATEMENT_PAGE_SIZE,
    },
    summary,
  }
}
