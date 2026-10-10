import { BlobNotFoundError, del } from "@vercel/blob"
import {
  claimStaleDashboardEvidenceIntent,
  finishDashboardEvidenceBlobDelete,
  listStaleDashboardEvidenceIntents,
} from "@halaalvest/db"
import { privateUploadPath } from "./private-blob-storage"
import { isPrivateDashboardUploadEnabled } from "./upload-policy"

const MINIMUM_ORPHAN_AGE_MS = 2 * 60 * 60 * 1000
const MAX_SWEEP_ITEMS = 10

type StaleIntent = { id: string; tenantId: string; status: string }
type SweepDependencies = {
  list: (before: Date, limit: number) => Promise<StaleIntent[]>
  claim: (id: string, tenantId: string, before: Date) => Promise<boolean>
  removeBlob: (tenantId: string, id: string) => Promise<void>
  finish: (id: string, tenantId: string) => Promise<boolean>
}

const providerDependencies: SweepDependencies = {
  list: (before, limit) => listStaleDashboardEvidenceIntents({ before, limit }),
  claim: (id, tenantId, before) => claimStaleDashboardEvidenceIntent({ id, tenantId, before }),
  removeBlob: async (tenantId, id) => {
    try {
      await del(privateUploadPath(tenantId, id), { token: process.env.BLOB_READ_WRITE_TOKEN })
    } catch (error) {
      if (!(error instanceof BlobNotFoundError)) throw error
    }
  },
  finish: (id, tenantId) => finishDashboardEvidenceBlobDelete({ id, tenantId }),
}

export async function sweepPrivateDashboardUploadOrphans(
  input: { now?: Date; limit?: number } = {},
  dependencies: SweepDependencies = providerDependencies
) {
  if (!isPrivateDashboardUploadEnabled() || process.env.DASHBOARD_UPLOAD_ORPHAN_CLEANUP_ENABLED !== "1") {
    throw new Error("Private upload orphan cleanup is disabled.")
  }
  const before = new Date((input.now ?? new Date()).getTime() - MINIMUM_ORPHAN_AGE_MS)
  const limit = Math.max(1, Math.min(input.limit ?? 5, MAX_SWEEP_ITEMS))
  const rows = await dependencies.list(before, limit)
  let deleted = 0
  let failed = 0
  let skipped = 0
  for (const row of rows) {
    if (row.status === "pending" && !(await dependencies.claim(row.id, row.tenantId, before))) {
      skipped++
      continue
    }
    if (row.status !== "pending" && row.status !== "deleted") {
      skipped++
      continue
    }
    try {
      await dependencies.removeBlob(row.tenantId, row.id)
      if (await dependencies.finish(row.id, row.tenantId)) deleted++
      else failed++
    } catch {
      // The claimed row remains retryable (`status=deleted`, `deletedAt=NULL`).
      failed++
    }
  }
  return { scanned: rows.length, deleted, failed, skipped }
}
