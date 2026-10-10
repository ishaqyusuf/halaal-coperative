import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError } from "../query-error"
import { getMemberByUserId } from "./members"
import { getTenantOperationProfile } from "./operation-profile"
import {
  addMemberSupportCaseMessage,
  createMemberSupportCase,
  getMemberSupportCaseSummary,
  getSupportCase,
  listSupportCasePage,
  type SupportCaseCategory,
  type SupportCaseLinkedRecordType,
  type SupportCaseRow,
} from "./support"

export type MobileMemberSupportCase = ReturnType<typeof toMobileSupportCase>

export type MobileMemberSupportSnapshot = {
  canCreateCase: boolean
  cases: MobileMemberSupportCase[]
  generatedAt: string
  member: { id: string; memberNumber: string; name: string } | null
  nextCursor: string | null
  state: "available" | "database_unavailable" | "member_profile_missing"
  summary: {
    highPriorityOpenCases: number
    openCases: number
    totalCases: number
  }
}

function toMobileSupportCase(row: SupportCaseRow, fullHistory = false) {
  const messages = fullHistory ? row.messages : row.messages.slice(-5)
  return {
    category: row.category,
    detail: row.messages.at(-1)?.message ?? row.description,
    financialAdjustmentApprovalNotes: row.financialAdjustmentApprovalNotes,
    financialAdjustmentApprovalStatus: row.financialAdjustmentApprovalStatus,
    id: row.id,
    lastActivityAt: row.updatedAt.toISOString(),
    linkedRecordId: row.linkedRecordId,
    linkedRecordType: row.linkedRecordType,
    messageCount: row.messages.length,
    moneyImpactRequested: row.moneyImpactRequested,
    priority: row.priority,
    recentMessages: messages.map((message) => ({
      attachmentUrl: message.attachmentUrl,
      authorName: message.authorUser?.fullName ?? null,
      authorType: message.authorType,
      createdAt: message.createdAt.toISOString(),
      id: message.id,
      message: message.message,
    })),
    requiresFinancialAdjustment: row.requiresFinancialAdjustment,
    resolutionSummary: row.resolutionSummary,
    status: row.status,
    subject: row.subject,
  }
}

function emptySnapshot(
  state: MobileMemberSupportSnapshot["state"]
): MobileMemberSupportSnapshot {
  return {
    canCreateCase: false,
    cases: [],
    generatedAt: new Date().toISOString(),
    member: null,
    nextCursor: null,
    state,
    summary: {
      highPriorityOpenCases: 0,
      openCases: 0,
      totalCases: 0,
    },
  }
}

async function resolveMember(
  input: { tenantId: string; userId: string },
  prisma: PrismaClient
) {
  return getMemberByUserId(input, prisma)
}

export async function getMobileMemberSupportSnapshot(
  input: { cursor?: string | null; tenantId: string; userId: string },
  prismaOverride?: PrismaClient
): Promise<MobileMemberSupportSnapshot> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) return emptySnapshot("database_unavailable")
  const member = await resolveMember(input, prisma)
  if (!member) return emptySnapshot("member_profile_missing")
  const [summary, page, profile] = await Promise.all([
    getMemberSupportCaseSummary(
      { memberId: member.id, tenantId: input.tenantId },
      prisma
    ),
    listSupportCasePage(
      {
        cursor: input.cursor,
        memberId: member.id,
        pageSize: 20,
        sort: ["updatedAt", "desc"],
        tenantId: input.tenantId,
      },
      prisma
    ),
    getTenantOperationProfile(input.tenantId, prisma),
  ])
  return {
    canCreateCase: profile.services.support_cases.canMemberCreate,
    cases: page.data.map((row: SupportCaseRow) => toMobileSupportCase(row)),
    generatedAt: new Date().toISOString(),
    member: {
      id: member.id,
      memberNumber: member.memberNumber,
      name: member.fullName,
    },
    nextCursor: page.meta.cursor ?? null,
    state: "available",
    summary: {
      highPriorityOpenCases: summary.highPriorityOpenCases,
      openCases: summary.openCases,
      totalCases: summary.totalCases,
    },
  }
}

export async function getMobileMemberSupportDetail(
  input: { supportCaseId: string; tenantId: string; userId: string },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma)
    throw new Error("Support is unavailable without database configuration.")
  const member = await resolveMember(input, prisma)
  if (!member)
    throw ExpectedQueryError.precondition(
      "Member profile needs linking before viewing support."
    )
  return toMobileSupportCase(
    await getSupportCase(
      {
        memberId: member.id,
        supportCaseId: input.supportCaseId,
        tenantId: input.tenantId,
      },
      prisma
    ),
    true
  )
}

export async function createMobileMemberSupportCaseForSession(
  input: {
    category: SupportCaseCategory
    description: string
    linkedRecordId?: string | null
    linkedRecordType?: SupportCaseLinkedRecordType | null
    moneyImpactRequested?: boolean
    subject: string
    tenantId: string
    userId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma)
    throw new Error("Support is unavailable without database configuration.")
  const member = await resolveMember(input, prisma)
  if (!member)
    throw ExpectedQueryError.precondition(
      "Member profile needs linking before creating support cases."
    )
  const profile = await getTenantOperationProfile(input.tenantId, prisma)
  if (!profile.services.support_cases.canMemberCreate) {
    throw ExpectedQueryError.precondition(
      "Support self-service is not enabled for this cooperative."
    )
  }
  return toMobileSupportCase(
    await createMemberSupportCase(
      {
        ...input,
        memberId: member.id,
        openedByUserId: input.userId,
      },
      prisma
    ),
    true
  )
}

export async function replyMobileMemberSupportCaseForSession(
  input: {
    attachmentUrl?: string | null
    message: string
    supportCaseId: string
    tenantId: string
    userId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma)
    throw new Error("Support is unavailable without database configuration.")
  const member = await resolveMember(input, prisma)
  if (!member)
    throw ExpectedQueryError.precondition(
      "Member profile needs linking before replying to support."
    )
  await addMemberSupportCaseMessage(
    {
      attachmentUrl: input.attachmentUrl,
      authorUserId: input.userId,
      memberId: member.id,
      message: input.message,
      supportCaseId: input.supportCaseId,
      tenantId: input.tenantId,
    },
    prisma
  )
  return getMobileMemberSupportDetail(input, prisma)
}
