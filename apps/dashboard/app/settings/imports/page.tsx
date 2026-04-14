import { createDbRuntime, getImportReferenceData, listImportBatches } from "@halaal-vest/db"
import { DashboardImportForms } from "@/features/forms/import-forms"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/features/workspace/page-shell"
import { applyImportBatchAction } from "@/lib/dashboard-actions"
import { getDashboardServerContext } from "@/lib/server-context"
import { hasAnyRole, allStaffRoles } from "@/lib/workspace-access"

export default async function ImportsPage() {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const canManageImports = hasAnyRole(context.auth.membership?.role, allStaffRoles)

  if (!context.tenant || runtime.status !== "database-configured") {
    return (
      <WorkspacePageShell
        eyebrow="Settings"
        title="Imports and migrations"
        description="Quick paste-and-import workflows for members, records, and legacy finance migrations."
      >
        <WorkspaceEmptyState
          title="Imports need the database runtime."
          body="Once the database-backed environment is active, this route will let staff preview CSV content and import members, historical records, and migration batches."
        />
      </WorkspacePageShell>
    )
  }

  const referenceData = await getImportReferenceData(context.tenant.id)
  const batches = await listImportBatches(context.tenant.id)

  return (
    <WorkspacePageShell
      eyebrow="Settings"
      title="Imports and migrations"
      description="Use one structured import surface for member setup, historical records, and legacy migration batches. Paste CSV, review the live validation preview, then apply the import."
    >
      {canManageImports ? (
        <DashboardImportForms
          batches={batches}
          devMode={process.env.NODE_ENV !== "production"}
          referenceData={referenceData}
        />
      ) : (
        <WorkspaceEmptyState
          title="Import access is limited to staff roles."
          body="Tenant admins, finance officers, and operations officers can run imports and migration batches from this route."
        />
      )}

      <div className="rounded-[1.75rem] border border-border/70 bg-background/92 shadow-sm">
        <div className="border-b border-border/60 px-4 py-3">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Recent staged import batches</h3>
        </div>
        <div className="divide-y divide-border/60">
          {batches.length ? (
            batches.map((batch) => (
              <article key={batch.id} className="space-y-3 px-4 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-foreground">{batch.importType.replace(/_/g, " ")}</p>
                    <p className="text-sm text-muted-foreground">
                      {batch.status} · {batch.validRows}/{batch.totalRows} rows · created by {batch.createdByUser.fullName}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {batch.existingMatchCount} existing matches · {batch.duplicateRowCount} duplicate keys
                    </p>
                    {batch.errorMessage ? (
                      <p className="mt-1 text-xs text-destructive">{batch.errorMessage}</p>
                    ) : null}
                  </div>
                  {batch.status !== "applied" ? (
                    <form action={applyImportBatchAction}>
                      <input type="hidden" name="batchId" value={batch.id} />
                      <button
                        className="inline-flex h-9 items-center justify-center rounded-full border border-border px-4 text-sm font-medium text-foreground transition hover:border-foreground/30"
                        type="submit"
                      >
                        Apply batch
                      </button>
                    </form>
                  ) : null}
                </div>
                <div className="space-y-2">
                  {batch.rows.map((row) => (
                    <p key={row.id} className="text-xs text-muted-foreground">
                      Row {row.rowIndex}
                      {row.primaryValue ? ` · ${row.primaryValue}` : ""}
                      {row.existingMatch ? " · existing match" : ""}
                      {row.duplicateInFile ? " · duplicate in file" : ""}
                    </p>
                  ))}
                </div>
              </article>
            ))
          ) : (
            <article className="px-4 py-4 text-sm text-muted-foreground">
              No staged import batches yet.
            </article>
          )}
        </div>
      </div>
    </WorkspacePageShell>
  )
}
