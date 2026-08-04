import type { ComponentProps } from "react"
import {
  DashboardActionLink,
  DashboardStatCard,
  ScrollableContent,
  TrendPill,
  WorkspaceEmptyState,
} from "@/components/dashboard"
import type { ImportAvailability } from "@/components/forms/import-forms"
import { ImportHeader } from "@/components/import-header"
import { SecondaryMenu } from "@/components/secondary-menu"
import { DataTable as ImportDataTable } from "@/components/tables/imports/data-table"
import type { ImportBatchRow } from "@/components/tables/imports/data-table"
import type { DashboardImportKind } from "@/lib/import-csv"

export type ImportSettingsSection =
  | "overview"
  | DashboardImportKind
  | "batches"

type ImportDataTableProps = ComponentProps<typeof ImportDataTable>

export const importMenuItems = [
  { path: "/settings/imports", label: "Overview" },
  { path: "/settings/imports/members", label: "Members" },
  { path: "/settings/imports/deduction-sources", label: "Deduction sources" },
  { path: "/settings/imports/loan-products", label: "Loan products" },
  { path: "/settings/imports/contributions", label: "Contributions" },
  { path: "/settings/imports/charges", label: "Charges" },
  { path: "/settings/imports/loan-migrations", label: "Loan migrations" },
  {
    path: "/settings/imports/repayment-migrations",
    label: "Repayments",
  },
  { path: "/settings/imports/batches", label: "Batches" },
]

const importPageCopy: Record<
  DashboardImportKind,
  { description: string; title: string }
> = {
  charges: {
    description:
      "Stage and review historical charge activity after member profiles and charge schedules are ready.",
    title: "Charges",
  },
  contributions: {
    description:
      "Stage and review historical savings records after the base member registry is ready.",
    title: "Contributions",
  },
  deduction_sources: {
    description:
      "Stage and review payroll, employer, or other deduction source registries.",
    title: "Deduction sources",
  },
  loan_migrations: {
    description:
      "Stage and review legacy loan positions before member ledger backfill.",
    title: "Loan migrations",
  },
  loan_products: {
    description:
      "Stage and review loan product definitions used by legacy loan records.",
    title: "Loan products",
  },
  members: {
    description:
      "Stage and review member profiles before importing historical savings, charges, and loans.",
    title: "Members",
  },
  repayment_migrations: {
    description:
      "Stage and review repayment history for migrated legacy loans.",
    title: "Repayments",
  },
}

function getImportKind(section: ImportSettingsSection) {
  return section !== "overview" && section !== "batches" ? section : undefined
}

function ImportReadinessRow({
  detail,
  status,
  title,
  tone,
}: {
  detail: string
  status: string
  title: string
  tone: "neutral" | "positive" | "warning"
}) {
  return (
    <div className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6">
      <div className="min-w-0">
        <h3 className="font-medium text-foreground">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {detail}
        </p>
      </div>
      <div className="sm:justify-self-end">
        <TrendPill tone={tone}>{status}</TrendPill>
      </div>
    </div>
  )
}

export function ImportsRuntimeUnavailable() {
  return (
    <ScrollableContent>
      <div className="flex max-w-[980px] flex-col gap-6">
        <SecondaryMenu items={importMenuItems} />
        <WorkspaceEmptyState
          body="Once the database-backed environment is active, this route will let staff preview CSV content and import members, historical records, and migration batches."
          title="Imports need the database runtime."
        />
      </div>
    </ScrollableContent>
  )
}

export function ImportsSettingsView({
  backfillLockedReason,
  batches,
  canManageImports,
  historicalSetupBlockingLabels,
  historicalSetupReady,
  importAvailability,
  initialSettings,
  legacyLoanReviewReady,
  memberProfilesBlockingLabels,
  memberProfilesReady,
  migrationToolsLockedReason,
  quickFillEnabled,
  referenceData,
  section,
}: {
  backfillLockedReason?: string | null
  batches: ImportBatchRow[]
  canManageImports: boolean
  historicalSetupBlockingLabels: string[]
  historicalSetupReady: boolean
  importAvailability: ImportAvailability
  initialSettings: ImportDataTableProps["initialSettings"]
  legacyLoanReviewReady: boolean
  memberProfilesBlockingLabels: string[]
  memberProfilesReady: boolean
  migrationToolsLockedReason?: string | null
  quickFillEnabled: boolean
  referenceData: ImportDataTableProps["referenceData"]
  section: ImportSettingsSection
}) {
  const isOverview = section === "overview"
  const isBatches = section === "batches"
  const importKind = getImportKind(section)
  const sectionCopy = importKind ? importPageCopy[importKind] : null
  const hasActiveBlockers = Boolean(
    migrationToolsLockedReason ||
      backfillLockedReason ||
      historicalSetupBlockingLabels.length ||
      memberProfilesBlockingLabels.length
  )

  return (
    <ScrollableContent>
      <div className="flex max-w-[980px] flex-col gap-6">
        <SecondaryMenu items={importMenuItems} />

        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Import settings
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">
            {isOverview
              ? "Imports and migrations"
              : isBatches
                ? "Batches"
                : (sectionCopy?.title ?? "Imports")}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {isOverview
              ? "Use one structured import surface for member setup, historical records, and legacy migration batches."
              : isBatches
                ? "Review staged and applied import batches across every import type."
                : (sectionCopy?.description ??
                  "Stage and review import batches for this workspace.")}
          </p>
        </div>

        {isOverview ? (
          <>
            <section className="hidden gap-4 md:grid md:grid-cols-3">
              <DashboardStatCard
                detail="Import batches currently staged for review or apply."
                label="Staged batches"
                value={batches.length.toString()}
              />
              <DashboardStatCard
                detail="Batches already applied into cooperative data."
                label="Applied batches"
                tone="positive"
                value={batches
                  .filter((batch) => batch.status === "applied")
                  .length.toString()}
              />
              <DashboardStatCard
                detail="Batches still waiting for operator action."
                label="Pending review"
                tone={
                  batches.some((batch) => batch.status !== "applied")
                    ? "warning"
                    : "default"
                }
                value={batches
                  .filter((batch) => batch.status !== "applied")
                  .length.toString()}
              />
            </section>

            <section aria-labelledby="import-sequence-title">
              <div className="pb-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Migration import order
                </p>
                <h2
                  className="mt-1 text-base font-semibold text-foreground"
                  id="import-sequence-title"
                >
                  One-time import sequence
                </h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                  Follow this sequence before member ledger backfill. Server-side
                  gates enforce the same order when batches are staged or
                  applied.
                </p>
              </div>
              <div className="divide-y divide-border/70 border-y border-border/70">
                <ImportReadinessRow
                  detail="Finance start date, dated charge schedules, business profit pools, and share capital plan."
                  status={historicalSetupReady ? "Ready" : "Required first"}
                  title="1. Historical finance setup"
                  tone={historicalSetupReady ? "positive" : "warning"}
                />
                <ImportReadinessRow
                  detail="Member profiles, deduction sources, and loan products used by later records."
                  status={memberProfilesReady ? "Members loaded" : "Load members"}
                  title="2. Members and registries"
                  tone={memberProfilesReady ? "positive" : "neutral"}
                />
                <ImportReadinessRow
                  detail="Savings, charges, legacy loan positions, and repayment migrations."
                  status={
                    historicalSetupReady
                      ? "Open after setup"
                      : "Blocked by setup"
                  }
                  title="3. Historical records"
                  tone={historicalSetupReady ? "neutral" : "warning"}
                />
                <ImportReadinessRow
                  detail="Confirm legacy loan balances or mark no legacy loans before posting member ledger history."
                  status={
                    legacyLoanReviewReady ? "Reviewed" : "Review required"
                  }
                  title="4. Loan review then backfill"
                  tone={legacyLoanReviewReady ? "positive" : "warning"}
                />
              </div>
            </section>

            {hasActiveBlockers ? (
              <section aria-labelledby="import-blockers-title">
                <div className="flex flex-col gap-4 pb-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Setup blockers
                    </p>
                    <h2
                      className="mt-1 text-base font-semibold text-foreground"
                      id="import-blockers-title"
                    >
                      Imports currently need attention
                    </h2>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                      These active blockers decide which import workflows are
                      available.
                    </p>
                  </div>
                  <DashboardActionLink
                    className="h-11 w-full md:h-9 md:w-auto"
                    href="/settings/finance"
                    variant="secondary"
                  >
                    Open finance setup
                  </DashboardActionLink>
                </div>
                <div className="divide-y divide-border/70 border-y border-border/70">
                  {migrationToolsLockedReason ? (
                    <ImportReadinessRow
                      detail={migrationToolsLockedReason}
                      status="Blocked"
                      title="Migration tools locked"
                      tone="warning"
                    />
                  ) : null}
                  {backfillLockedReason ? (
                    <ImportReadinessRow
                      detail={backfillLockedReason}
                      status="Blocked"
                      title="Historical imports locked"
                      tone="warning"
                    />
                  ) : null}
                  {historicalSetupBlockingLabels.length ? (
                    <ImportReadinessRow
                      detail={`Complete ${historicalSetupBlockingLabels.join(", ")} before member profiles, savings, loan, and repayment history are imported.`}
                      status="Required first"
                      title="Historical finance setup"
                      tone="warning"
                    />
                  ) : null}
                  {memberProfilesBlockingLabels.length ? (
                    <ImportReadinessRow
                      detail="Import members before savings, loan, and repayment records so every historical row has a canonical member record."
                      status="Required first"
                      title="Member profiles"
                      tone="warning"
                    />
                  ) : null}
                </div>
              </section>
            ) : null}
          </>
        ) : canManageImports ? (
          <>
            <ImportHeader
              canManageImports={canManageImports}
              importKind={importKind}
              isLocked={
                importKind ? !importAvailability[importKind].isAvailable : false
              }
            />
            <ImportDataTable
              devMode={quickFillEnabled}
              hasSourceRows={
                importKind
                  ? batches.some((batch) => batch.importType === importKind)
                  : batches.length > 0
              }
              importAvailability={importAvailability}
              importKind={importKind}
              initialSettings={initialSettings}
              referenceData={referenceData}
              sheetBatches={batches}
            />
          </>
        ) : (
          <WorkspaceEmptyState
            body="Cooperative admins, finance officers, and operations officers can run imports and migration batches from this route."
            title="Import access is limited to staff roles."
          />
        )}
      </div>
    </ScrollableContent>
  )
}
