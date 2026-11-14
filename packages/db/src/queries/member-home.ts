import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { getMemberStatementSummary } from "./members"

export type MemberHomeInProgress = {
  foodPurchaseRequests: number
  guarantorRequests: number
  helpRepliesNeeded: number
  loanRequests: number
  openHelpRequests: number
  procurementRequests: number
  projectFinancingRequests: number
  receiptsBeingChecked: number
  receiptsToFix: number
  shareRequests: number
}

export type MemberHomeActivity = {
  amount: number
  id: string
  kind: "contribution" | "repayment"
  occurredAt: Date
}

const emptyInProgress: MemberHomeInProgress = {
  foodPurchaseRequests: 0,
  guarantorRequests: 0,
  helpRepliesNeeded: 0,
  loanRequests: 0,
  openHelpRequests: 0,
  procurementRequests: 0,
  projectFinancingRequests: 0,
  receiptsBeingChecked: 0,
  receiptsToFix: 0,
  shareRequests: 0,
}

/**
 * What one member sees on their home screen: who they are, their balances
 * (the same summary as their statement), what is waiting and their latest
 * payments. Counts and activity are one statement each.
 */
export async function getMemberHomeSnapshot(
  input: { memberId: string; tenantId: string },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const { memberId, tenantId } = input
  const [member, summary, inProgressRows, activityRows] = await Promise.all([
    prisma.member.findFirst({
      select: {
        deductionSource: { select: { name: true } },
        email: true,
        fullName: true,
        id: true,
        joinedAt: true,
        kycStatus: true,
        memberNumber: true,
        phoneNumber: true,
        status: true,
        user: { select: { email: true } },
      },
      where: { id: memberId, tenantId },
    }),
    getMemberStatementSummary(tenantId, memberId, prisma),
    prisma.$queryRaw<Array<Record<keyof MemberHomeInProgress, bigint>>>`
      SELECT
        (SELECT count(*) FROM member_payment_receipts
          WHERE tenant_id = ${tenantId}::uuid AND member_id = ${memberId}::uuid
            AND status::text IN ('submitted', 'under_review')) AS "receiptsBeingChecked",
        (SELECT count(*) FROM member_payment_receipts
          WHERE tenant_id = ${tenantId}::uuid AND member_id = ${memberId}::uuid
            AND status::text = 'correction_requested') AS "receiptsToFix",
        (SELECT count(*) FROM support_cases
          WHERE tenant_id = ${tenantId}::uuid AND member_id = ${memberId}::uuid
            AND status::text IN ('open', 'in_progress')) AS "openHelpRequests",
        (SELECT count(*) FROM support_cases
          WHERE tenant_id = ${tenantId}::uuid AND member_id = ${memberId}::uuid
            AND status::text = 'waiting_on_member') AS "helpRepliesNeeded",
        (SELECT count(*) FROM member_share_applications
          WHERE tenant_id = ${tenantId}::uuid AND member_id = ${memberId}::uuid
            AND status::text = 'pending') AS "shareRequests",
        (SELECT count(*) FROM loan_requests
          WHERE tenant_id = ${tenantId}::uuid AND member_id = ${memberId}::uuid
            AND status::text IN ('submitted', 'under_review')) AS "loanRequests",
        (SELECT count(*) FROM procurement_requests
          WHERE tenant_id = ${tenantId}::uuid AND member_id = ${memberId}::uuid
            AND status::text IN ('submitted', 'under_review')) AS "procurementRequests",
        (SELECT count(*) FROM project_financing_requests
          WHERE tenant_id = ${tenantId}::uuid AND member_id = ${memberId}::uuid
            AND status::text IN ('submitted', 'under_review')) AS "projectFinancingRequests",
        (SELECT count(*) FROM food_purchase_applications
          WHERE tenant_id = ${tenantId}::uuid AND member_id = ${memberId}::uuid
            AND status::text IN ('submitted', 'under_review')) AS "foodPurchaseRequests",
        (SELECT count(*) FROM loan_guarantor_approvals
          WHERE tenant_id = ${tenantId}::uuid AND guarantor_member_id = ${memberId}::uuid
            AND status::text = 'pending') AS "guarantorRequests"
    `,
    prisma.$queryRaw<
      Array<{
        amount: string
        id: string
        kind: MemberHomeActivity["kind"]
        occurred_at: Date
      }>
    >`
      (SELECT id::text, 'contribution' AS kind, amount::text, posted_at AS occurred_at
        FROM contributions
        WHERE tenant_id = ${tenantId}::uuid AND member_id = ${memberId}::uuid
          AND status::text = 'posted'
        ORDER BY posted_at DESC LIMIT 5)
      UNION ALL
      (SELECT id::text, 'repayment' AS kind, amount::text, paid_at AS occurred_at
        FROM repayments
        WHERE tenant_id = ${tenantId}::uuid AND member_id = ${memberId}::uuid
          AND status::text = 'posted'
        ORDER BY paid_at DESC LIMIT 5)
      ORDER BY occurred_at DESC
      LIMIT 5
    `,
  ])

  if (!member) {
    return null
  }

  const counts = inProgressRows[0]
  const inProgress = counts
    ? (Object.fromEntries(
        Object.keys(emptyInProgress).map((key) => [
          key,
          Number(counts[key as keyof MemberHomeInProgress] ?? 0),
        ])
      ) as MemberHomeInProgress)
    : emptyInProgress

  return {
    activity: activityRows.map(
      (row): MemberHomeActivity => ({
        amount: Number(row.amount),
        id: `${row.kind}-${row.id}`,
        kind: row.kind,
        occurredAt: row.occurred_at,
      })
    ),
    inProgress,
    member: {
      email: member.email ?? member.user?.email ?? null,
      fullName: member.fullName,
      id: member.id,
      joinedAt: member.joinedAt,
      kycStatus: member.kycStatus,
      memberNumber: member.memberNumber,
      phoneNumber: member.phoneNumber,
      status: member.status,
      workplaceName: member.deductionSource?.name ?? null,
    },
    summary,
  }
}

export type MemberHomeSnapshot = NonNullable<
  Awaited<ReturnType<typeof getMemberHomeSnapshot>>
>
