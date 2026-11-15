import {
  beginQaPurgeRun,
  blockQaPurgeRun,
  confirmQaTenantForPurge,
  deleteQaTenant,
  finishQaPurgeRun,
  getQaPurgeRun,
  type QaMaintenanceCounts,
} from "@halaalvest/db"
import { deleteQaUploads } from "../qa-upload-storage"
import { deleteQaPrivateUploads } from "../qa-private-blob-storage"
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

export type QaPurgeDependencies = {
  beginRun: typeof beginQaPurgeRun
  blockRun: typeof blockQaPurgeRun
  confirmTenant: typeof confirmQaTenantForPurge
  credentialBlocker: typeof getQaHostingCredentialBlocker
  deleteDomains: typeof deleteQaHostingDomains
  deletePrivateUploads: typeof deleteQaPrivateUploads
  deleteTenant: typeof deleteQaTenant
  deleteUploads: typeof deleteQaUploads
  finishRun: typeof finishQaPurgeRun
  getRun: typeof getQaPurgeRun
}

const defaultDependencies: QaPurgeDependencies = {
  beginRun: beginQaPurgeRun,
  blockRun: blockQaPurgeRun,
  confirmTenant: confirmQaTenantForPurge,
  credentialBlocker: getQaHostingCredentialBlocker,
  deleteDomains: deleteQaHostingDomains,
  deletePrivateUploads: deleteQaPrivateUploads,
  deleteTenant: deleteQaTenant,
  deleteUploads: deleteQaUploads,
  finishRun: finishQaPurgeRun,
  getRun: getQaPurgeRun,
}

export async function qaPurgeHandler(
  { runId }: QaPurgePayload,
  deps: QaPurgeDependencies = defaultDependencies
) {
  const existingRun = await deps.getRun(runId)
  if (!existingRun || existingRun.status !== "queued") {
    return { deletedCounts: emptyCounts(), errors: [] }
  }

  const credentialBlocker = deps.credentialBlocker()
  if (credentialBlocker) {
    await deps.blockRun(runId, credentialBlocker)
    return { deletedCounts: emptyCounts(), errors: [credentialBlocker] }
  }

  const snapshot = await deps.beginRun(runId)
  const deletedCounts = emptyCounts()
  const errors: string[] = []

  for (const tenant of snapshot.tenants) {
    try {
      // Re-check right before deleting anything outside the database: the
      // tenant must still be QA and still marked by this run. Files and
      // domains are deleted for the hostnames it has now, not the preview's.
      const confirmed = await deps.confirmTenant({
        startedAt: snapshot.startedAt,
        tenantId: tenant.id,
      })
      if (!confirmed) {
        errors.push("tenant_not_qa")
        continue
      }
      const uploads = await deps.deleteUploads(tenant.id)
      const privateUploads = await deps.deletePrivateUploads(tenant.id)
      await deps.deleteDomains(confirmed.hostnames)
      await deps.deleteTenant(tenant.id, undefined, snapshot.startedAt)
      deletedCounts.workspaces += 1
      deletedCounts.files += uploads.files + privateUploads.files
      deletedCounts.fileBytes += uploads.fileBytes + privateUploads.fileBytes
    } catch (error) {
      errors.push(error instanceof Error ? error.name : "unknown_error")
    }
  }

  if (deletedCounts.workspaces === snapshot.tenants.length) {
    await deps.finishRun({
      counts: {
        ...snapshot.counts,
        fileBytes: deletedCounts.fileBytes,
        files: deletedCounts.files,
      },
      id: runId,
      status: "completed",
    })
  } else {
    await deps.finishRun({
      counts: deletedCounts,
      errorCategory: errors[0] ?? "tenant_delete_failed",
      id: runId,
      status: deletedCounts.workspaces > 0 ? "partially_completed" : "failed",
    })
  }

  return { deletedCounts, errors }
}
