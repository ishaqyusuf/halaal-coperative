import { ExpectedQueryError, QueryInfrastructureError } from "../query-error"
import type { Prisma, PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"

export type DashboardEvidencePurpose =
  | "member_document"
  | "opening_balance_source"
  | "payment_receipt_proof"
  | "support_attachment"

const entityTypeByPurpose: Record<DashboardEvidencePurpose, string> = {
  member_document: "MemberDocument",
  opening_balance_source: "MemberOpeningBalance",
  payment_receipt_proof: "MemberPaymentReceipt",
  support_attachment: "SupportCaseMessage",
}

export async function claimDashboardEvidenceUploadLink(
  input: {
    tenantId: string
    url: string | null | undefined
    purpose: DashboardEvidencePurpose
    entityId: string
    claimantUserId: string | null | undefined
  },
  tx: Prisma.TransactionClient | PrismaClient
) {
  const match = /^\/api\/uploads\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(input.url?.trim() ?? "")
  if (!match) return
  const record = await tx.dashboardEvidenceUpload.findUnique({ where: { id: match[1] } })
  if (!record) {
    // The development-only filesystem adapter uses the same URL shape.
    if (process.env.DASHBOARD_PRIVATE_BLOB_ENABLED === "1" &&
        (process.env.NODE_ENV === "production" || process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV))) {
      throw ExpectedQueryError.notFound("Private evidence upload was not found.")
    }
    return
  }
  if (!input.claimantUserId || record.uploaderUserId !== input.claimantUserId ||
      record.tenantId !== input.tenantId || record.purpose !== input.purpose ||
      record.status !== "uploaded" || record.deletedAt) {
    throw ExpectedQueryError.permission("Private evidence upload cannot be linked to this record.")
  }
  const linkedEntityType = entityTypeByPurpose[input.purpose]
  if (record.linkedEntityType === linkedEntityType && record.linkedEntityId === input.entityId) return
  if (record.linkedEntityType || record.linkedEntityId) throw ExpectedQueryError.conflict("Private evidence upload is already linked.")
  const claimed = await tx.dashboardEvidenceUpload.updateMany({
    where: {
      id: record.id, tenantId: input.tenantId, purpose: input.purpose,
      status: "uploaded", deletedAt: null, linkedEntityType: null, linkedEntityId: null,
    },
    data: { linkedEntityType, linkedEntityId: input.entityId, linkedAt: new Date() },
  })
  if (claimed.count !== 1) throw ExpectedQueryError.conflict("Private evidence upload was linked concurrently.")
}

function database(override?: PrismaClient) {
  const db = override ?? createPrismaClient()
  if (!db) throw new QueryInfrastructureError("Evidence storage database is unavailable.")
  return db
}

export async function createDashboardEvidenceUpload(input: {
  id: string
  tenantId: string
  uploaderUserId: string
  purpose: string
  originalName: string
  contentType: string
  declaredSize: number
}, override?: PrismaClient) {
  return database(override).$transaction(async (tx) => {
    const tenant = await tx.tenant.findFirst({
      where: { id: input.tenantId, qaPurgeStartedAt: null },
      select: { id: true },
    })
    if (!tenant) throw ExpectedQueryError.precondition("Tenant is unavailable for uploads.")
    return tx.dashboardEvidenceUpload.create({ data: input })
  }, { isolationLevel: "Serializable" })
}

export function getPendingDashboardEvidenceUpload(input: {
  id: string
  tenantId: string
  uploaderUserId: string
  purpose: string
}, override?: PrismaClient) {
  return database(override).dashboardEvidenceUpload.findFirst({
    where: { ...input, status: "pending", deletedAt: null, tenant: { qaPurgeStartedAt: null } },
  })
}

export async function finalizeDashboardEvidenceUpload(input: {
  id: string
  tenantId: string
  uploaderUserId: string
  purpose: string
  contentType: string
  storedSize: number
}, override?: PrismaClient) {
  const db = database(override)
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(async (tx: Prisma.TransactionClient) => {
        const existing = await tx.dashboardEvidenceUpload.findFirst({
          where: {
            id: input.id, tenantId: input.tenantId,
            uploaderUserId: input.uploaderUserId, purpose: input.purpose,
            contentType: input.contentType, declaredSize: input.storedSize,
            deletedAt: null,
          },
        })
        if (!existing) return null
        if (existing.status === "uploaded") return { record: existing, newlyUploaded: false }
        if (existing.status !== "pending") return null
        const now = new Date()
        const claimed = await tx.dashboardEvidenceUpload.updateMany({
          where: { id: existing.id, status: "pending", deletedAt: null },
          data: { status: "uploaded", storedSize: input.storedSize, uploadedAt: now },
        })
        if (claimed.count !== 1) return null
        await tx.auditLog.create({
          data: {
            tenantId: input.tenantId,
            actorType: "user", actorUserId: input.uploaderUserId,
            action: "file.uploaded", entityType: "DashboardUpload", entityId: input.id,
            metadata: {
              contentType: input.contentType, fileName: existing.originalName,
              purpose: input.purpose, size: input.storedSize, url: `/api/uploads/${input.id}`,
            },
            occurredAt: now,
          },
        })
        const record = await tx.dashboardEvidenceUpload.findUnique({ where: { id: existing.id } })
        return record ? { record, newlyUploaded: true } : null
      }, { isolationLevel: "Serializable" })
    } catch (error) {
      if (attempt < 2 && error && typeof error === "object" && "code" in error && String(error.code) === "P2034") continue
      throw error
    }
  }
}

export function getUploadedDashboardEvidenceUpload(input: {
  id: string
  tenantId: string
}, override?: PrismaClient) {
  return database(override).dashboardEvidenceUpload.findFirst({
    where: { ...input, status: "uploaded", deletedAt: null },
  })
}

// The status transition claims a stale intent before the provider delete.
// `deletedAt: null` makes a failed provider delete retryable.
export function listStaleDashboardEvidenceIntents(input: {
  before: Date
  limit: number
}, override?: PrismaClient) {
  return database(override).dashboardEvidenceUpload.findMany({
    where: {
      deletedAt: null,
      OR: [
        { status: "pending", createdAt: { lte: input.before } },
        { status: "deleted" },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: Math.max(1, Math.min(input.limit, 50)),
  })
}

export async function claimStaleDashboardEvidenceIntent(input: {
  id: string
  tenantId: string
  before: Date
}, override?: PrismaClient) {
  const result = await database(override).dashboardEvidenceUpload.updateMany({
    where: {
      id: input.id, tenantId: input.tenantId, status: "pending",
      createdAt: { lte: input.before }, deletedAt: null,
    },
    data: { status: "deleted" },
  })
  return result.count === 1
}

export async function finishDashboardEvidenceBlobDelete(input: {
  id: string
  tenantId: string
}, override?: PrismaClient) {
  const result = await database(override).dashboardEvidenceUpload.updateMany({
    where: { id: input.id, tenantId: input.tenantId, status: "deleted", deletedAt: null },
    data: { deletedAt: new Date() },
  })
  return result.count === 1
}
