import { AppError } from "@halaalvest/errors"
import { Prisma, type PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError } from "../query-error"
import { getMemberByUserId } from "./members"
import { getTenantOperationProfile } from "./operation-profile"
import {
  addMemberSupportCaseMessage,
  createMemberSupportCase,
  getMemberSupportCaseSummary,
  listMemberSupportCasesPage,
  type SupportCaseCategory,
  type SupportCaseLinkedRecordType,
  type SupportCaseRow,
  type SupportCaseMessageAuthorType,
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

type CaseFields = Pick<
  SupportCaseRow,
  | "category"
  | "createdAt"
  | "description"
  | "financialAdjustmentApprovalNotes"
  | "financialAdjustmentApprovalStatus"
  | "id"
  | "linkedRecordId"
  | "linkedRecordType"
  | "moneyImpactRequested"
  | "priority"
  | "requiresFinancialAdjustment"
  | "resolutionSummary"
  | "status"
  | "subject"
  | "updatedAt"
>

type MessageFields = {
  attachmentUrl: string | null
  authorName: string | null
  authorType: SupportCaseMessageAuthorType
  createdAt: Date
  id: string
  message: string
}

function toMobileSupportCase(
  row: CaseFields,
  messages: MessageFields[],
  messageCount = messages.length
) {
  return {
    category: row.category,
    createdAt: row.createdAt.toISOString(),
    detail: messages.at(-1)?.message ?? row.description,
    financialAdjustmentApprovalNotes: row.financialAdjustmentApprovalNotes,
    financialAdjustmentApprovalStatus: row.financialAdjustmentApprovalStatus,
    id: row.id,
    lastActivityAt: row.updatedAt.toISOString(),
    linkedRecordId: row.linkedRecordId,
    linkedRecordType: row.linkedRecordType,
    messageCount,
    moneyImpactRequested: row.moneyImpactRequested,
    priority: row.priority,
    recentMessages: messages.map((message) => ({
      attachmentUrl: message.attachmentUrl,
      authorName: message.authorName,
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

// Limit per case in Postgres. Keep the true message count and all five
// previews for existing clients while avoiding materializing whole histories.
async function readMemberCasePreviews(
  tenantId: string,
  caseIds: string[],
  prisma: PrismaClient
) {
  const byCase = new Map<string, { count: number; messages: MessageFields[] }>()
  if (!caseIds.length) return byCase
  const rows = await prisma.$queryRaw<
    Array<MessageFields & { caseId: string; count: bigint }>
  >`
    SELECT ids.id AS "caseId", totals.count,
      message.id, message."attachment_url" AS "attachmentUrl",
      author."full_name" AS "authorName", message."author_type"::text AS "authorType",
      message."created_at" AS "createdAt", message.message
    FROM unnest(${caseIds}::uuid[]) AS ids(id)
    CROSS JOIN LATERAL (
      SELECT count(*) AS count
      FROM "support_case_messages"
      WHERE "tenant_id" = ${tenantId}::uuid AND "support_case_id" = ids.id
    ) totals
    CROSS JOIN LATERAL (
      SELECT *
      FROM "support_case_messages"
      WHERE "tenant_id" = ${tenantId}::uuid AND "support_case_id" = ids.id
      ORDER BY "created_at" DESC, id DESC
      LIMIT 5
    ) message
    LEFT JOIN "users" author ON author.id = message."author_user_id"
    ORDER BY message."created_at", message.id
  `
  for (const row of rows) {
    const current = byCase.get(row.caseId) ?? {
      count: Number(row.count),
      messages: [],
    }
    current.messages.push(row)
    byCase.set(row.caseId, current)
  }
  return byCase
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
  input: {
    cursor?: string | null
    includeOverview?: boolean
    tenantId: string
    userId: string
  },
  prismaOverride?: PrismaClient
): Promise<MobileMemberSupportSnapshot> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) return emptySnapshot("database_unavailable")
  const member = await resolveMember(input, prisma)
  if (!member) return emptySnapshot("member_profile_missing")
  const scope = { memberId: member.id, tenantId: input.tenantId }
  const includeOverview = !input.cursor || input.includeOverview !== false
  const [summary, page, profile] = await Promise.all([
    includeOverview ? getMemberSupportCaseSummary(scope, prisma) : null,
    listMemberSupportCasesPage({ ...scope, cursor: input.cursor }, prisma).then(
      async (page) => ({
        ...page,
        previews: await readMemberCasePreviews(
          input.tenantId,
          page.data.map((row) => row.id),
          prisma
        ),
      })
    ),
    includeOverview ? getTenantOperationProfile(input.tenantId, prisma) : null,
  ])
  return {
    canCreateCase: profile?.services.support_cases.canMemberCreate ?? false,
    cases: page.data.map((row) => {
      const preview = page.previews.get(row.id)
      return toMobileSupportCase(
        row,
        preview?.messages ?? [],
        preview?.count ?? 0
      )
    }),
    generatedAt: new Date().toISOString(),
    member: {
      id: member.id,
      memberNumber: member.memberNumber,
      name: member.fullName,
    },
    nextCursor: page.nextCursor,
    state: "available",
    summary: {
      highPriorityOpenCases: summary?.highPriorityOpenCases ?? 0,
      openCases: summary?.openCases ?? 0,
      totalCases: summary?.totalCases ?? 0,
    },
  }
}

async function readMemberCase(
  input: { memberId: string; supportCaseId: string; tenantId: string },
  prisma: PrismaClient
) {
  const row = await prisma.supportCase.findFirst({
    where: {
      id: input.supportCaseId,
      memberId: input.memberId,
      tenantId: input.tenantId,
    },
  })
  if (!row) {
    throw new AppError({
      code: "NOT_FOUND",
      publicMessage: "Support case was not found.",
    })
  }
  const messages = await prisma.$queryRaw<MessageFields[]>(Prisma.sql`
    SELECT message.id, message."attachment_url" AS "attachmentUrl",
      author."full_name" AS "authorName", message."author_type"::text AS "authorType",
      message."created_at" AS "createdAt", message.message
    FROM "support_case_messages" message
    LEFT JOIN "users" author ON author.id = message."author_user_id"
    WHERE message."tenant_id" = ${input.tenantId}::uuid
      AND message."support_case_id" = ${row.id}::uuid
    ORDER BY message."created_at", message.id
  `)
  return toMobileSupportCase(row, messages)
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
  return readMemberCase({ ...input, memberId: member.id }, prisma)
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
  const row = await createMemberSupportCase(
    {
      ...input,
      memberId: member.id,
      openedByUserId: input.userId,
    },
    prisma
  )
  return toMobileSupportCase(
    row,
    row.messages.map((message) => ({
      ...message,
      authorName: message.authorUser?.fullName ?? member.fullName,
    }))
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
  return readMemberCase({ ...input, memberId: member.id }, prisma)
}
