import { createDbRuntime, getImportReferenceData, listImportBatches } from "@halaal-vest/db"
import { DashboardSectionCard, DashboardSectionHeader, DashboardStatCard, TrendPill } from "@/components/dashboard/primitives"
import { DashboardImportForms } from "@/features/forms/import-forms"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/features/workspace/page-shell"
import { applyImportBatchAction } from "@/lib/dashboard-actions"
import { getDashboardServerContext } from "@/lib/server-context"
import { allStaffRoles, hasAnyRole } from "@/lib/workspace-access"

export default async function ImportsPage() {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const canManageImports = hasAnyRole(context.auth.membership?.role, allStaffRoles)

  if (!context.tenant || runtime.status !== "database-configured") {
    return <WorkspacePageShell eyebrow="Settings" title="Imports and migrations" description="Quick paste-and-import workflows for members, records, and legacy finance migrations."><WorkspaceEmptyState title="Imports need the database runtime." body="Once the database-backed environment is active, this route will let staff preview CSV content and import members, historical records, and migration batches." /></WorkspacePageShell>
  }

  const referenceData = await getImportReferenceData(context.tenant.id)
  const batches = await listImportBatches(context.tenant.id)

  return (
    <WorkspacePageShell eyebrow="Settings" title="Imports and migrations" description="Use one structured import surface for member setup, historical records, and legacy migration batches.">
      <section className="grid gap-4 md:grid-cols-3">
        <DashboardStatCard label="Staged batches" value={batches.length.toString()} detail="Import batches currently staged for review or apply." />
        <DashboardStatCard label="Applied batches" value={batches.filter((batch) => batch.status === "applied").length.toString()} detail="Batches already applied into tenant data." tone="positive" />
        <DashboardStatCard label="Pending review" value={batches.filter((batch) => batch.status !== "applied").length.toString()} detail="Batches still waiting for operator action." tone={batches.some((batch) => batch.status !== "applied") ? "warning" : "default"} />
      </section>

      {canManageImports ? (
        <DashboardSectionCard>
          <DashboardSectionHeader eyebrow="Import workspace" title="CSV preview and staged import flow" description="Paste CSV, review live validation, stage the batch, and then apply it when ready." />
          <div className="mt-5">
            <DashboardImportForms batches={batches} devMode={process.env.NODE_ENV !== "production"} referenceData={referenceData} />
          </div>
        </DashboardSectionCard>
      ) : (
        <WorkspaceEmptyState title="Import access is limited to staff roles." body="Tenant admins, finance officers, and operations officers can run imports and migration batches from this route." />
      )}

      <DashboardSectionCard>
        <DashboardSectionHeader eyebrow="Batches" title="Recent staged import batches" actions={<TrendPill>{batches.length} batches</TrendPill>} />
        <div className="mt-5 space-y-3">
          {batches.length ? batches.map((batch) => (
            <div key={batch.id} className="rounded-2xl border border-border/70 bg-muted/25 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">{batch.importType.replace(/_/g, " ")}</p>
                  <p className="text-sm text-muted-foreground">{batch.status} · {batch.validRows}/{batch.totalRows} rows · created by {batch.createdByUser.fullName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{batch.existingMatchCount} existing matches · {batch.duplicateRowCount} duplicate keys</p>
                  {batch.errorMessage ? <p className="mt-1 text-xs text-destructive">{batch.errorMessage}</p> : null}
                </div>
                {batch.status !== "applied" ? (
                  <form action={applyImportBatchAction}>
                    <input type="hidden" name="batchId" value={batch.id} />
                    <button className="inline-flex h-9 items-center justify-center rounded-full border border-border px-4 text-sm font-medium text-foreground transition hover:border-foreground/30" type="submit">Apply batch</button>
                  </form>
                ) : <TrendPill tone="positive">Applied</TrendPill>}
              </div>
              <div className="mt-3 space-y-2">
                {batch.rows.map((row) => (
                  <p key={row.id} className="text-xs text-muted-foreground">
                    Row {row.rowIndex}
                    {row.primaryValue ? ` · ${row.primaryValue}` : ""}
                    {row.existingMatch ? " · existing match" : ""}
                    {row.duplicateInFile ? " · duplicate in file" : ""}
                  </p>
                ))}
              </div>
            </div>
          )) : <p className="text-sm text-muted-foreground">No staged import batches yet.</p>}
        </div>
      </DashboardSectionCard>
    </WorkspacePageShell>
  )
}
