import { BlobNotFoundError, del, list } from "@vercel/blob"
import { createPrismaClient } from "@halaalvest/db"
import type { PrismaClient } from "../../db/generated/prisma/client"

const MINIMUM_QA_BLOB_COOLDOWN_MS = 30 * 60 * 1000

type CleanupDependencies = {
  db: PrismaClient
  listBlobs: typeof list
  deleteBlob: typeof del
}

export async function deleteQaPrivateUploads(
  tenantId: string,
  now = new Date(),
  dependencies?: CleanupDependencies
) {
  const db = dependencies?.db ?? createPrismaClient()
  if (!db) throw new Error("QA private upload cleanup requires a database.")
  const records = await db.dashboardEvidenceUpload.findMany({
    where: { tenantId },
    select: { id: true, createdAt: true },
  })
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (records.length === 0 && !token) return { files: 0, fileBytes: 0 }
  const tenant = await db.tenant.findFirst({
    where: { id: tenantId, dataClassification: "qa", qaPurgeStartedAt: { not: null } },
    select: { qaPurgeStartedAt: true },
  })
  if (!tenant?.qaPurgeStartedAt) throw new Error("QA private upload cleanup requires a marked QA tenant.")
  const cutoff = now.getTime() - MINIMUM_QA_BLOB_COOLDOWN_MS
  if (tenant.qaPurgeStartedAt.getTime() > cutoff || records.some((row) => row.createdAt.getTime() > cutoff)) {
    throw new Error("QA private upload tokens may still be active; retry after the cooldown.")
  }
  if (!token) throw new Error("QA private Blob token is not configured on the purge worker.")

  let files = 0
  let fileBytes = 0
  const prefix = `dashboard-evidence/${tenantId}/`
  const seen = new Set<string>()
  // Always restart from the first page because each successful batch is deleted.
  for (;;) {
    const page = await (dependencies?.listBlobs ?? list)({ prefix, limit: 100, token })
    if (page.blobs.length === 0) break
    for (const blob of page.blobs) {
      if (!blob.pathname.startsWith(prefix)) throw new Error("Private Blob list escaped the QA tenant prefix.")
      if (seen.has(blob.pathname)) throw new Error("Private Blob list did not advance after deletion.")
      seen.add(blob.pathname)
      try {
        await (dependencies?.deleteBlob ?? del)(blob.pathname, { token, ifMatch: blob.etag })
      } catch (error) {
        if (!(error instanceof BlobNotFoundError)) throw error
      }
      files++
      fileBytes += blob.size
    }
  }
  // The provider has confirmed removal. Keep the tenant until this write succeeds;
  // the Restrict foreign key prevents tenant deletion if any metadata remains.
  await db.dashboardEvidenceUpload.deleteMany({ where: { tenantId } })
  return { files, fileBytes }
}
