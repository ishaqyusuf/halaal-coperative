import {
  beginQaPurgeRun,
  blockQaPurgeRun,
  deleteQaTenant,
  finishQaPurgeRun,
  getQaPurgeRun,
  type QaMaintenanceCounts,
} from "@halaalvest/db"
import { deleteQaUploads } from "../qa-upload-storage"
import {
  deleteQaHostingDomains,
  getQaHostingCredentialBlocker,
} from "../qa-hosting"

export type QaPurgePayload = {
  runId: string
}

const emptyCounts = (): QaMaintenanceCounts => ({
  auditLogs: 0,
  fileBytes: 0,
  files: 0,
  ledgerTransactions: 0,
  members: 0,
  users: 0,
  workspaces: 0,
})

export async function qaPurgeHandler({ runId }: QaPurgePayload) {
  const existingRun = await getQaPurgeRun(runId)
  if (!existingRun || existingRun.status !== "queued") {
    return { deletedCounts: emptyCounts(), errors: [] }
  }

  const credentialBlocker = getQaHostingCredentialBlocker()
  if (credentialBlocker) {
    await blockQaPurgeRun(runId, credentialBlocker)
    return { deletedCounts: emptyCounts(), errors: [credentialBlocker] }
  }

  const snapshot = await beginQaPurgeRun(runId)
  const deletedCounts = emptyCounts()
  const errors: string[] = []

  for (const tenant of snapshot.tenants) {
    try {
      const uploads = await deleteQaUploads(tenant.id)
      await deleteQaHostingDomains(tenant.hostnames)
      await deleteQaTenant(tenant.id)
      deletedCounts.workspaces += 1
      deletedCounts.files += uploads.files
      deletedCounts.fileBytes += uploads.fileBytes
    } catch (error) {
      errors.push(error instanceof Error ? error.name : "unknown_error")
    }
  }

  if (deletedCounts.workspaces === snapshot.tenants.length) {
    await finishQaPurgeRun({
      counts: {
        ...snapshot.counts,
        fileBytes: deletedCounts.fileBytes,
        files: deletedCounts.files,
      },
      id: runId,
      status: "completed",
    })
  } else {
    await finishQaPurgeRun({
      counts: deletedCounts,
      errorCategory: errors[0] ?? "tenant_delete_failed",
      id: runId,
      status:
        deletedCounts.workspaces > 0 ? "partially_completed" : "failed",
    })
  }

  return { deletedCounts, errors }
}
