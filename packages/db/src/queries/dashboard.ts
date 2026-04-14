import type { PrismaClient } from "@prisma/client"
import { createPrismaClient } from "../prisma"

export type DashboardMetrics = {
  memberCount: number
  activeMemberCount: number
  activeLoanCount: number
  totalContributions: number
  outstandingLoans: number
  availablePool: number
  reserveBuffer: number
  delinquencyRate: number
}

export async function getDashboardMetrics(
  tenantId: string,
  prismaOverride?: PrismaClient,
): Promise<DashboardMetrics> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const [
    memberCount,
    activeMemberCount,
    activeLoanCount,
    contributionSum,
    outstandingLoanSum,
    policy,
  ] = await Promise.all([
    prisma.member.count({ where: { tenantId } }),
    prisma.member.count({ where: { tenantId, status: "active" } }),
    prisma.loan.count({
      where: { tenantId, status: { in: ["disbursed", "active"] } },
    }),
    prisma.contribution.aggregate({
      where: { tenantId, status: "posted" },
      _sum: { amount: true },
    }),
    prisma.loan.aggregate({
      where: { tenantId, status: { in: ["disbursed", "active"] } },
      _sum: { outstandingPrincipal: true },
    }),
    prisma.tenantPolicy.findUnique({ where: { tenantId } }),
  ])

  const totalContributions = Number(contributionSum._sum.amount ?? 0)
  const outstandingLoans = Number(outstandingLoanSum._sum.outstandingPrincipal ?? 0)
  const reserveBuffer = Number(policy?.reserveBufferAmount ?? 0)
  const availablePool = Math.max(0, totalContributions - outstandingLoans - reserveBuffer)

  // Delinquency: loans with overdue schedule items / total active loans
  const overdueScheduleCount = await prisma.repaymentScheduleItem.count({
    where: {
      tenantId,
      status: "overdue",
      loan: { status: { in: ["disbursed", "active"] } },
    },
  })

  const totalScheduleItems = await prisma.repaymentScheduleItem.count({
    where: {
      tenantId,
      loan: { status: { in: ["disbursed", "active"] } },
    },
  })

  const delinquencyRate =
    totalScheduleItems > 0 ? overdueScheduleCount / totalScheduleItems : 0

  return {
    memberCount,
    activeMemberCount,
    activeLoanCount,
    totalContributions,
    outstandingLoans,
    availablePool,
    reserveBuffer,
    delinquencyRate,
  }
}
