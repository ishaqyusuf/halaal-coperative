import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"

/**
 * Dashboard reads for the loan pages: only the fields each screen shows.
 * The full shapes in `loans.ts` stay for mobile and exports.
 */

/**
 * Loan requests where this member was asked to be a guarantor, with only what
 * the guarantor needs to decide. No staff names or emails.
 */
export async function listGuarantorRequestsForMember(
  input: { guarantorMemberId: string; tenantId: string },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const rows = await prisma.loanGuarantorApproval.findMany({
    orderBy: [{ status: "asc" }, { requestedAt: "desc" }],
    select: {
      id: true,
      loanRequest: {
        select: {
          estimatedMonthlyServicing: true,
          id: true,
          loanProduct: { select: { name: true } },
          member: { select: { fullName: true } },
          purpose: true,
          requestedAmount: true,
          requestedTermMonths: true,
          status: true,
        },
      },
      requestedAt: true,
      respondedAt: true,
      responseNotes: true,
      status: true,
    },
    where: {
      guarantorMemberId: input.guarantorMemberId,
      tenantId: input.tenantId,
    },
  })

  return rows.map((row) => ({
    ...row,
    loanRequest: {
      ...row.loanRequest,
      estimatedMonthlyServicing: Number(
        row.loanRequest.estimatedMonthlyServicing
      ),
      requestedAmount: Number(row.loanRequest.requestedAmount),
    },
  }))
}

export type GuarantorRequestForMember = Awaited<
  ReturnType<typeof listGuarantorRequestsForMember>
>[number]

/** How many guarantor requests are waiting for this member's answer. */
export async function countPendingGuarantorRequests(
  input: { guarantorMemberId: string; tenantId: string },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.loanGuarantorApproval.count({
    where: {
      guarantorMemberId: input.guarantorMemberId,
      status: "pending",
      tenantId: input.tenantId,
    },
  })
}

/** Members who have at least one loan: labels for the repayments member filter. */
export async function listLoanBorrowerOptions(
  tenantId: string,
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.member.findMany({
    orderBy: [{ fullName: "asc" }, { id: "asc" }],
    select: { fullName: true, id: true, memberNumber: true },
    where: { loans: { some: {} }, tenantId },
  })
}
