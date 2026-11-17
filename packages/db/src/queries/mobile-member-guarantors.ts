import { Prisma, type PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError } from "../query-error"
import { listMemberLoanGuarantorApprovals } from "./loans"
import { getMemberByUserId } from "./members"
import { respondMemberLoanGuarantorApproval } from "./loans"

type GuarantorApprovalRow = Awaited<
  ReturnType<typeof listMemberLoanGuarantorApprovals>
>[number]

export type MobileMemberGuarantorDecision = "approved" | "rejected"

export type MobileMemberGuarantorRequest = {
  id: string
  loanRequest: {
    borrowerMemberNumber: string
    borrowerName: string
    estimatedMonthlyServicing: number
    id: string
    loanProductName: string
    purpose: string | null
    requestedAmount: number
    requestedAt: string
    requestedTermMonths: number
    status: string
  }
  requestedAt: string
  requestedByName: string | null
  respondedAt: string | null
  respondedByName: string | null
  answeredByMember?: boolean
  responseNotes: string | null
  status: string
}

export type MobileMemberGuarantorSnapshot = {
  approvals: MobileMemberGuarantorRequest[]
  generatedAt: string
  member: { id: string; memberNumber: string; name: string } | null
  nextCursor?: MobileGuarantorCursor | null
  state: "available" | "database_unavailable" | "member_profile_missing"
  summary: {
    approvedApprovals: number
    pendingApprovals: number
    rejectedApprovals: number
    totalApprovals: number
  }
}

function emptySnapshot(
  state: MobileMemberGuarantorSnapshot["state"]
): MobileMemberGuarantorSnapshot {
  return {
    approvals: [],
    generatedAt: new Date().toISOString(),
    member: null,
    state,
    summary: {
      approvedApprovals: 0,
      pendingApprovals: 0,
      rejectedApprovals: 0,
      totalApprovals: 0,
    },
  }
}

function toMobileMemberGuarantorRequest(
  row: Omit<GuarantorApprovalRow, "loanRequest" | "requestedByUser"> & {
    loanRequest: Omit<GuarantorApprovalRow["loanRequest"], "loanProduct"> & {
      loanProduct: { name: string }
    }
    requestedByUser: { fullName: string } | null
  },
  userId: string
): MobileMemberGuarantorRequest {
  return {
    id: row.id,
    loanRequest: {
      borrowerMemberNumber: row.loanRequest.member.memberNumber,
      borrowerName: row.loanRequest.member.fullName,
      estimatedMonthlyServicing: Number(
        row.loanRequest.estimatedMonthlyServicing ?? 0
      ),
      id: row.loanRequest.id,
      loanProductName: row.loanRequest.loanProduct.name,
      purpose: row.loanRequest.purpose,
      requestedAmount: Number(row.loanRequest.requestedAmount ?? 0),
      requestedAt: row.loanRequest.requestedAt.toISOString(),
      requestedTermMonths: row.loanRequest.requestedTermMonths,
      status: row.loanRequest.status,
    },
    requestedAt: row.requestedAt.toISOString(),
    requestedByName: row.requestedByUser?.fullName ?? null,
    respondedAt: row.respondedAt ? row.respondedAt.toISOString() : null,
    respondedByName: row.respondedByUser?.fullName ?? null,
    answeredByMember: row.respondedByUserId === userId,
    responseNotes: row.responseNotes,
    status: row.status,
  }
}

function summarize(approvals: MobileMemberGuarantorRequest[]) {
  return {
    approvedApprovals: approvals.filter((item) => item.status === "approved")
      .length,
    pendingApprovals: approvals.filter((item) => item.status === "pending")
      .length,
    rejectedApprovals: approvals.filter((item) => item.status === "rejected")
      .length,
    totalApprovals: approvals.length,
  }
}

export async function getMobileMemberGuarantorSnapshot(
  input: { tenantId: string; userId: string; page?: MobileGuarantorPage },
  prismaOverride?: PrismaClient
): Promise<MobileMemberGuarantorSnapshot> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) return emptySnapshot("database_unavailable")

  const member = await getMemberByUserId(input, prisma)
  if (!member) return emptySnapshot("member_profile_missing")

  if (input.page) return getGuarantorPage(prisma, input, member, input.page)

  const approvals = (
    await listMemberLoanGuarantorApprovals(
      { guarantorMemberId: member.id, tenantId: input.tenantId },
      prisma
    )
  ).map((row) => toMobileMemberGuarantorRequest(row, input.userId))

  return {
    approvals,
    generatedAt: new Date().toISOString(),
    member: {
      id: member.id,
      memberNumber: member.memberNumber,
      name: member.fullName,
    },
    state: "available",
    summary: summarize(approvals),
  }
}

export type MobileGuarantorCursor = {
  id: string
  pending: boolean
  requestedAt: string
}

type MobileGuarantorPage = {
  cursor?: MobileGuarantorCursor | null
  pageSize?: number
  search?: string
}

type GuarantorJoinedRow = Omit<
  MobileMemberGuarantorRequest,
  "loanRequest" | "requestedAt" | "respondedAt"
> & {
  borrowerMemberNumber: string
  borrowerName: string
  estimatedMonthlyServicing: Prisma.Decimal
  loanRequestId: string
  loanProductName: string
  loanStatus: string
  loanRequestedAt: Date
  purpose: string | null
  requestedAmount: Prisma.Decimal
  requestedTermMonths: number
  requestedAt: Date
  requestedAtCursor: string
  respondedAt: Date | null
}

function getGuarantorRows(
  prisma: PrismaClient,
  input: { tenantId: string; userId: string; memberId: string },
  filter: Prisma.Sql,
  limit: number
) {
  return prisma.$queryRaw<GuarantorJoinedRow[]>(Prisma.sql`
    SELECT a.id, a.status::text, a.requested_at AS "requestedAt",
           to_char(a.requested_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "requestedAtCursor",
           a.responded_at AS "respondedAt", a.response_notes AS "responseNotes",
           COALESCE(a.responded_by_user_id = ${input.userId}::uuid, false) AS "answeredByMember",
           requester.full_name AS "requestedByName", responder.full_name AS "respondedByName",
           l.id AS "loanRequestId", l.status::text AS "loanStatus", l.purpose,
           l.requested_at AS "loanRequestedAt", l.requested_amount AS "requestedAmount",
           l.requested_term_months AS "requestedTermMonths",
           l.estimated_monthly_servicing AS "estimatedMonthlyServicing",
           m.member_number AS "borrowerMemberNumber", m.full_name AS "borrowerName", p.name AS "loanProductName"
    FROM loan_guarantor_approvals a
    JOIN loan_requests l ON l.id = a.loan_request_id AND l.tenant_id = a.tenant_id
    JOIN members m ON m.id = l.member_id AND m.tenant_id = a.tenant_id
    JOIN loan_products p ON p.id = l.loan_product_id AND p.tenant_id = a.tenant_id
    LEFT JOIN users requester ON requester.id = a.requested_by_user_id
    LEFT JOIN users responder ON responder.id = a.responded_by_user_id
    WHERE a.tenant_id = ${input.tenantId}::uuid AND a.guarantor_member_id = ${input.memberId}::uuid
      ${filter}
    ORDER BY (a.status = 'pending') DESC, a.requested_at DESC, a.id DESC
    LIMIT ${limit}
  `)
}

function toGuarantorPageItem(
  row: GuarantorJoinedRow
): MobileMemberGuarantorRequest {
  return {
    id: row.id,
    status: row.status,
    loanRequest: {
      id: row.loanRequestId,
      status: row.loanStatus,
      borrowerMemberNumber: row.borrowerMemberNumber,
      borrowerName: row.borrowerName,
      loanProductName: row.loanProductName,
      requestedAmount: Number(row.requestedAmount),
      requestedTermMonths: row.requestedTermMonths,
      estimatedMonthlyServicing: Number(row.estimatedMonthlyServicing),
      requestedAt: row.loanRequestedAt.toISOString(),
      purpose: row.purpose,
    },
    requestedAt: row.requestedAt.toISOString(),
    requestedByName: row.requestedByName,
    respondedAt: row.respondedAt?.toISOString() ?? null,
    respondedByName: row.respondedByName,
    answeredByMember: row.answeredByMember,
    responseNotes: row.responseNotes,
  }
}

async function getGuarantorPage(
  prisma: PrismaClient,
  input: { tenantId: string; userId: string },
  member: { id: string; memberNumber: string; fullName: string },
  { cursor, pageSize = 20, search }: MobileGuarantorPage
): Promise<MobileMemberGuarantorSnapshot> {
  const limit = Math.max(1, Math.min(pageSize, 50))
  const cursorFilter = cursor
    ? Prisma.sql`AND ((a.status = 'pending'), a.requested_at, a.id) <
      (${cursor.pending}, ${cursor.requestedAt}::timestamptz, ${cursor.id}::uuid)`
    : Prisma.empty
  const searchFilter = search
    ? Prisma.sql`AND strpos(lower(concat_ws(' ', m.full_name, m.member_number, p.name)), lower(${search})) > 0`
    : Prisma.empty

  const [rows, counts] = await Promise.all([
    getGuarantorRows(
      prisma,
      { ...input, memberId: member.id },
      Prisma.sql`${cursorFilter} ${searchFilter}`,
      limit + 1
    ),
    prisma.loanGuarantorApproval.groupBy({
      by: ["status"],
      where: { tenantId: input.tenantId, guarantorMemberId: member.id },
      _count: { _all: true },
    }),
  ])
  const items = rows.slice(0, limit)
  const last = items.at(-1)
  const count = (status: string) =>
    counts.find((group) => group.status === status)?._count._all ?? 0

  return {
    approvals: items.map(toGuarantorPageItem),
    generatedAt: new Date().toISOString(),
    member: {
      id: member.id,
      memberNumber: member.memberNumber,
      name: member.fullName,
    },
    nextCursor:
      rows.length > limit && last
        ? {
            id: last.id,
            pending: last.status === "pending",
            requestedAt: last.requestedAtCursor,
          }
        : null,
    state: "available",
    summary: {
      approvedApprovals: count("approved"),
      pendingApprovals: count("pending"),
      rejectedApprovals: count("rejected"),
      totalApprovals: counts.reduce(
        (total, group) => total + group._count._all,
        0
      ),
    },
  }
}

export async function getMobileMemberGuarantorRequest(
  input: { tenantId: string; userId: string; guarantorApprovalId: string },
  prismaOverride?: PrismaClient
): Promise<MobileMemberGuarantorRequest | null> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) return null

  const member = await getMemberByUserId(input, prisma)
  if (!member) return null

  const [row] = await getGuarantorRows(
    prisma,
    { ...input, memberId: member.id },
    Prisma.sql`AND a.id = ${input.guarantorApprovalId}::uuid`,
    1
  )
  return row ? toGuarantorPageItem(row) : null
}

export async function respondMobileMemberGuarantorRequestForSession(
  input: {
    decisionConfirmed: boolean
    guarantorApprovalId: string
    notes?: string | null
    status: MobileMemberGuarantorDecision
    tenantId: string
    userId: string
  },
  prismaOverride?: PrismaClient
): Promise<MobileMemberGuarantorRequest> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) {
    throw new Error(
      "Guarantor approvals are unavailable without database configuration."
    )
  }
  if (!input.decisionConfirmed) {
    throw ExpectedQueryError.precondition(
      "Confirm the guarantor decision before submitting it."
    )
  }
  if (input.status === "rejected" && !input.notes?.trim()) {
    throw ExpectedQueryError.validation(
      "A rejection reason is required for guarantor evidence."
    )
  }

  const approval = await respondMemberLoanGuarantorApproval(
    {
      actorUserId: input.userId,
      guarantorApprovalId: input.guarantorApprovalId,
      notes: input.notes?.trim() || undefined,
      status: input.status,
      tenantId: input.tenantId,
    },
    prisma
  )

  return toMobileMemberGuarantorRequest(approval, input.userId)
}
