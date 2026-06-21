import { Button } from "@halaalvest/ui/components/button"
import { createDbRuntime, getImportReferenceData, getTenantInitialMigrationState, listImportBatches } from "@halaalvest/db"
import { DashboardActionLink, DashboardSectionCard, DashboardSectionHeader, DashboardStatCard, DashboardSurfaceCard, TrendPill, WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import { DashboardImportForms } from "@/components/forms/import-forms"
import type { DashboardImportKind } from "@/lib/import-csv"
import { applyImportBatchAction } from "@/lib/dashboard-actions"
import { getDashboardServerContext } from "@/lib/server-context"
import { allStaffRoles, hasAnyRole } from "@/lib/workspace-access"

type ImportAvailability = Record<
  DashboardImportKind,
  {
    blockedReason?: string
    isAvailable: boolean
  }
>

export default async function ImportsPage() {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const canManageImports = hasAnyRole(context.auth.membership?.role, allStaffRoles)

  if (!context.tenant || runtime.status !== "database-configured") {
    return <WorkspacePageShell eyebrow="Settings" title="Imports and migrations" description="Quick paste-and-import workflows for members, records, and legacy finance migrations."><WorkspaceEmptyState title="Imports need the database runtime." body="Once the database-backed environment is active, this route will let staff preview CSV content and import members, historical records, and migration batches." /></WorkspacePageShell>
  }

  const referenceData = await getImportReferenceData(context.tenant.id)
  const batches = await listImportBatches(context.tenant.id)
  const migrationState = await getTenantInitialMigrationState(context.tenant.id)
  const historicalSetupStepKeys = [
    "finance_start_date",
    "charge_schedules",
    "business_profit_pools",
    "share_capital_plan",
  ]
  const stepLabels = new Map(
    migrationState.snapshot.steps.map((step) => [step.key, step.label])
  )
  const getMissingLabels = (stepKeys: string[]) =>
    migrationState.snapshot.missingStepKeys
      .filter((stepKey) => stepKeys.includes(stepKey))
      .map((stepKey) => stepLabels.get(stepKey) ?? stepKey.replaceAll("_", " "))
  const historicalSetupBlockingLabels = getMissingLabels(historicalSetupStepKeys)
  const memberProfilesBlockingLabels = getMissingLabels(["member_profiles"])
  const historicalSetupReady = historicalSetupBlockingLabels.length === 0
  const legacyLoanReviewReady = !migrationState.snapshot.missingStepKeys.includes("legacy_loans")
  const memberProfilesReady = !migrationState.snapshot.missingStepKeys.includes("member_profiles")
  const hasAppliedMemberBackfill =
    migrationState.counts.appliedBackfillBatches > 0 ||
    migrationState.counts.appliedBackfillMembers > 0 ||
    migrationState.counts.appliedBackfillMonths > 0
  const migrationToolsLockedReason = migrationState.snapshot.canUseMigrationTools
    ? null
    : "Initial migration tools are locked for this tenant. Use normal live workflows instead."
  const backfillLockedReason = hasAppliedMemberBackfill
    ? "Member ledger backfill has started, so historical imports are locked."
    : null
  const historicalSetupBlockedReason = historicalSetupBlockingLabels.length
    ? `Complete historical finance setup first: ${historicalSetupBlockingLabels.join(", ")}.`
    : null
  const memberProfilesBlockedReason = memberProfilesBlockingLabels.length
    ? `Import member profiles first: ${memberProfilesBlockingLabels.join(", ")}.`
    : null
  const available = (blockedReason?: string | null) =>
    blockedReason
      ? {
          blockedReason,
          isAvailable: false,
        }
      : {
          isAvailable: true,
        }
  const importAvailability: ImportAvailability = {
    charges: available(
      migrationToolsLockedReason ??
        backfillLockedReason ??
        historicalSetupBlockedReason ??
        memberProfilesBlockedReason
    ),
    contributions: available(
      migrationToolsLockedReason ??
        backfillLockedReason ??
        historicalSetupBlockedReason ??
        memberProfilesBlockedReason
    ),
    deduction_sources: available(
      migrationToolsLockedReason ?? backfillLockedReason
    ),
    loan_migrations: available(
      migrationToolsLockedReason ??
        backfillLockedReason ??
        historicalSetupBlockedReason ??
        memberProfilesBlockedReason
    ),
    loan_products: available(
      migrationToolsLockedReason ?? backfillLockedReason
    ),
    members: available(
      migrationToolsLockedReason ??
        backfillLockedReason ??
        historicalSetupBlockedReason
    ),
    repayment_migrations: available(
      migrationToolsLockedReason ??
        backfillLockedReason ??
        historicalSetupBlockedReason ??
        memberProfilesBlockedReason
    ),
  }

  return (
    <WorkspacePageShell eyebrow="Settings" title="Imports and migrations" description="Use one structured import surface for member setup, historical records, and legacy migration batches.">
      <section className="grid gap-4 md:grid-cols-3">
        <DashboardStatCard label="Staged batches" value={batches.length.toString()} detail="Import batches currently staged for review or apply." />
        <DashboardStatCard label="Applied batches" value={batches.filter((batch) => batch.status === "applied").length.toString()} detail="Batches already applied into tenant data." tone="positive" />
        <DashboardStatCard label="Pending review" value={batches.filter((batch) => batch.status !== "applied").length.toString()} detail="Batches still waiting for operator action." tone={batches.some((batch) => batch.status !== "applied") ? "warning" : "default"} />
      </section>

      <DashboardSectionCard>
        <DashboardSectionHeader eyebrow="Migration import order" title="One-time import sequence" description="Follow this sequence before member ledger backfill. Server-side gates enforce the same order when batches are staged or applied." />
        <div className="mt-5 grid gap-3 lg:grid-cols-4">
          <DashboardSurfaceCard className="bg-background/70">
            <p className="text-sm font-semibold text-foreground">1. Historical finance setup</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">Finance start date, dated charge schedules, business profit pools, and share capital plan.</p>
            <div className="mt-3">
              <TrendPill tone={historicalSetupReady ? "positive" : "warning"}>
                {historicalSetupReady ? "Ready" : "Required first"}
              </TrendPill>
            </div>
          </DashboardSurfaceCard>
          <DashboardSurfaceCard className="bg-background/70">
            <p className="text-sm font-semibold text-foreground">2. Members and registries</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">Member profiles, deduction sources, and loan products used by later records.</p>
            <div className="mt-3">
              <TrendPill tone={memberProfilesReady ? "positive" : "neutral"}>
                {memberProfilesReady ? "Members loaded" : "Load members"}
              </TrendPill>
            </div>
          </DashboardSurfaceCard>
          <DashboardSurfaceCard className="bg-background/70">
            <p className="text-sm font-semibold text-foreground">3. Historical records</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">Savings, charges, legacy loan positions, and repayment migrations.</p>
            <div className="mt-3">
              <TrendPill tone={historicalSetupReady ? "neutral" : "warning"}>
                {historicalSetupReady ? "Open after setup" : "Blocked by setup"}
              </TrendPill>
            </div>
          </DashboardSurfaceCard>
          <DashboardSurfaceCard className="bg-background/70">
            <p className="text-sm font-semibold text-foreground">4. Loan review then backfill</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">Confirm legacy loan balances or mark no legacy loans before posting member ledger history.</p>
            <div className="mt-3">
              <TrendPill tone={legacyLoanReviewReady ? "positive" : "warning"}>
                {legacyLoanReviewReady ? "Reviewed" : "Review required"}
              </TrendPill>
            </div>
          </DashboardSurfaceCard>
        </div>
      </DashboardSectionCard>

      {migrationToolsLockedReason || backfillLockedReason || historicalSetupBlockingLabels.length || memberProfilesBlockingLabels.length ? (
        <DashboardSectionCard>
          <DashboardSectionHeader
            eyebrow="Setup blockers"
            title="Imports currently need attention"
            description="These are the active blockers that decide which import cards are available."
            actions={
              <DashboardActionLink href="/settings/finance" variant="secondary">
                Open finance setup
              </DashboardActionLink>
            }
          />
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {migrationToolsLockedReason ? (
              <DashboardSurfaceCard className="border-amber-200 bg-amber-50 text-amber-950">
                <p className="text-sm font-semibold">Migration tools locked</p>
                <p className="mt-2 text-sm leading-6">{migrationToolsLockedReason}</p>
              </DashboardSurfaceCard>
            ) : null}
            {backfillLockedReason ? (
              <DashboardSurfaceCard className="border-amber-200 bg-amber-50 text-amber-950">
                <p className="text-sm font-semibold">Historical imports locked</p>
                <p className="mt-2 text-sm leading-6">{backfillLockedReason}</p>
              </DashboardSurfaceCard>
            ) : null}
            {historicalSetupBlockingLabels.length ? (
              <DashboardSurfaceCard className="bg-background/70">
                <p className="text-sm font-semibold text-foreground">Historical finance setup</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Complete {historicalSetupBlockingLabels.join(", ")} before member profiles, savings, loan, and repayment history are imported.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <DashboardActionLink href="/settings/finance#start-date" variant="outline">
                    Start date
                  </DashboardActionLink>
                  <DashboardActionLink href="/settings/finance#charges" variant="outline">
                    Charges
                  </DashboardActionLink>
                  <DashboardActionLink href="/settings/finance#shares" variant="outline">
                    Shares
                  </DashboardActionLink>
                  <DashboardActionLink href="/settings/finance#share-business" variant="outline">
                    Share business
                  </DashboardActionLink>
                </div>
              </DashboardSurfaceCard>
            ) : null}
            {memberProfilesBlockingLabels.length ? (
              <DashboardSurfaceCard className="bg-background/70">
                <p className="text-sm font-semibold text-foreground">Member profiles</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Import members before savings, loan, and repayment records so every historical row has a canonical member record.
                </p>
              </DashboardSurfaceCard>
            ) : null}
          </div>
        </DashboardSectionCard>
      ) : null}

      {canManageImports ? (
        <DashboardSectionCard>
          <DashboardSectionHeader eyebrow="Import workspace" title="CSV preview and staged import flow" description="Paste CSV, review live validation, stage the batch, and then apply it when ready." />
          <div className="mt-5">
            <DashboardImportForms batches={batches} devMode={process.env.NODE_ENV !== "production"} importAvailability={importAvailability} referenceData={referenceData} />
          </div>
        </DashboardSectionCard>
      ) : (
        <WorkspaceEmptyState title="Import access is limited to staff roles." body="Tenant admins, finance officers, and operations officers can run imports and migration batches from this route." />
      )}

      <DashboardSectionCard>
        <DashboardSectionHeader eyebrow="Batches" title="Recent staged import batches" actions={<TrendPill>{batches.length} batches</TrendPill>} />
        <div className="mt-5 space-y-3">
          {batches.length ? batches.map((batch) => {
            const batchAvailability =
              importAvailability[batch.importType as DashboardImportKind]
            const isBatchLocked =
              batch.status !== "applied" && !batchAvailability?.isAvailable

            return (
              <DashboardSurfaceCard key={batch.id}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-foreground">{batch.importType.replace(/_/g, " ")}</p>
                    <p className="text-sm text-muted-foreground">{batch.status} · {batch.validRows}/{batch.totalRows} rows · created by {batch.createdByUser.fullName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{batch.existingMatchCount} existing matches · {batch.duplicateRowCount} duplicate keys</p>
                    {batch.errorMessage ? <p className="mt-1 text-xs text-destructive">{batch.errorMessage}</p> : null}
                    {isBatchLocked ? (
                      <p className="mt-2 text-xs leading-5 text-amber-800">
                        {batchAvailability?.blockedReason ?? "This staged batch is locked."}
                      </p>
                    ) : null}
                  </div>
                  {batch.status === "applied" ? (
                    <TrendPill tone="positive">Applied</TrendPill>
                  ) : isBatchLocked ? (
                    <TrendPill tone="warning">Apply locked</TrendPill>
                  ) : (
                    <form action={applyImportBatchAction} className="flex flex-col gap-2 sm:min-w-[220px]">
                      <input type="hidden" name="batchId" value={batch.id} />
                      <input
                        className="h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground"
                        name="confirmation"
                        placeholder="APPLY IMPORT"
                        required
                        type="text"
                      />
                      <Button className="rounded-full" type="submit" variant="outline">Apply batch</Button>
                    </form>
                  )}
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
              </DashboardSurfaceCard>
            )
          }) : <p className="text-sm text-muted-foreground">No staged import batches yet.</p>}
        </div>
      </DashboardSectionCard>
    </WorkspacePageShell>
  )
}
