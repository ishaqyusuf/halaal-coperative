import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError } from "../query-error"
import {
  listMemberLoanGuarantorApprovals,
  respondMemberLoanGuarantorApproval,
} from "./loans"
import { getMemberByUserId } from "./members"

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
  responseNotes: string | null
  status: string
}

export type MobileMemberGuarantorSnapshot = {
  approvals: MobileMemberGuarantorRequest[]
  generatedAt: string
  member: { id: string; memberNumber: string; name: string } | null
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

export function toMobileMemberGuarantorRequest(
  row: GuarantorApprovalRow
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
  input: { tenantId: string; userId: string },
  prismaOverride?: PrismaClient
): Promise<MobileMemberGuarantorSnapshot> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) return emptySnapshot("database_unavailable")

  const member = await getMemberByUserId(input, prisma)
  if (!member) return emptySnapshot("member_profile_missing")

  const approvals = (
    await listMemberLoanGuarantorApprovals(
      { guarantorMemberId: member.id, tenantId: input.tenantId },
      prisma
    )
  ).map(toMobileMemberGuarantorRequest)

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

  const member = await getMemberByUserId(input, prisma)
  if (!member) {
    throw ExpectedQueryError.precondition(
      "Member profile needs linking before answering guarantor requests."
    )
  }

  await respondMemberLoanGuarantorApproval(
    {
      actorUserId: input.userId,
      guarantorApprovalId: input.guarantorApprovalId,
      guarantorMemberId: member.id,
      notes: input.notes?.trim() || undefined,
      status: input.status,
      tenantId: input.tenantId,
    },
    prisma
  )

  const approval = (
    await listMemberLoanGuarantorApprovals(
      { guarantorMemberId: member.id, tenantId: input.tenantId },
      prisma
    )
  ).find((item) => item.id === input.guarantorApprovalId)
  if (!approval) {
    throw ExpectedQueryError.notFound("Loan guarantor approval not found.")
  }

  return toMobileMemberGuarantorRequest(approval)
}
