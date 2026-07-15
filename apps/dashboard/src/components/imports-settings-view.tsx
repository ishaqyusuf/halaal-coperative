import type { ComponentProps } from "react"
import {
  DashboardActionLink,
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardStatCard,
  DashboardSurfaceCard,
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

  return (
    <ScrollableContent>
      <div className="flex max-w-[980px] flex-col gap-6">
        <SecondaryMenu items={importMenuItems} />

        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase">
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
            <section className="grid gap-4 md:grid-cols-3">
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

            <DashboardSectionCard>
              <DashboardSectionHeader
                description="Follow this sequence before member ledger backfill. Server-side gates enforce the same order when batches are staged or applied."
                eyebrow="Migration import order"
                title="One-time import sequence"
              />
              <div className="mt-5 grid gap-3 lg:grid-cols-4">
                <DashboardSurfaceCard className="bg-background/70">
                  <p className="text-sm font-semibold text-foreground">
                    1. Historical finance setup
                  </p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    Finance start date, dated charge schedules, business profit
                    pools, and share capital plan.
                  </p>
                  <div className="mt-3">
                    <TrendPill
                      tone={historicalSetupReady ? "positive" : "warning"}
                    >
                      {historicalSetupReady ? "Ready" : "Required first"}
                    </TrendPill>
                  </div>
                </DashboardSurfaceCard>
                <DashboardSurfaceCard className="bg-background/70">
                  <p className="text-sm font-semibold text-foreground">
                    2. Members and registries
                  </p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    Member profiles, deduction sources, and loan products used
                    by later records.
                  </p>
                  <div className="mt-3">
                    <TrendPill
                      tone={memberProfilesReady ? "positive" : "neutral"}
                    >
                      {memberProfilesReady ? "Members loaded" : "Load members"}
                    </TrendPill>
                  </div>
                </DashboardSurfaceCard>
                <DashboardSurfaceCard className="bg-background/70">
                  <p className="text-sm font-semibold text-foreground">
                    3. Historical records
                  </p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    Savings, charges, legacy loan positions, and repayment
                    migrations.
                  </p>
                  <div className="mt-3">
                    <TrendPill
                      tone={historicalSetupReady ? "neutral" : "warning"}
                    >
                      {historicalSetupReady
                        ? "Open after setup"
                        : "Blocked by setup"}
                    </TrendPill>
                  </div>
                </DashboardSurfaceCard>
                <DashboardSurfaceCard className="bg-background/70">
                  <p className="text-sm font-semibold text-foreground">
                    4. Loan review then backfill
                  </p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    Confirm legacy loan balances or mark no legacy loans before
                    posting member ledger history.
                  </p>
                  <div className="mt-3">
                    <TrendPill
                      tone={legacyLoanReviewReady ? "positive" : "warning"}
                    >
                      {legacyLoanReviewReady ? "Reviewed" : "Review required"}
                    </TrendPill>
                  </div>
                </DashboardSurfaceCard>
              </div>
            </DashboardSectionCard>

            {migrationToolsLockedReason ||
            backfillLockedReason ||
            historicalSetupBlockingLabels.length ||
            memberProfilesBlockingLabels.length ? (
              <DashboardSectionCard>
                <DashboardSectionHeader
                  actions={
                    <DashboardActionLink
                      href="/settings/finance"
                      variant="secondary"
                    >
                      Open finance setup
                    </DashboardActionLink>
                  }
                  description="These are the active blockers that decide which import cards are available."
                  eyebrow="Setup blockers"
                  title="Imports currently need attention"
                />
                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                  {migrationToolsLockedReason ? (
                    <DashboardSurfaceCard className="border-amber-200 bg-amber-50 text-amber-950">
                      <p className="text-sm font-semibold">
                        Migration tools locked
                      </p>
                      <p className="mt-2 text-sm leading-6">
                        {migrationToolsLockedReason}
                      </p>
                    </DashboardSurfaceCard>
                  ) : null}
                  {backfillLockedReason ? (
                    <DashboardSurfaceCard className="border-amber-200 bg-amber-50 text-amber-950">
                      <p className="text-sm font-semibold">
                        Historical imports locked
                      </p>
                      <p className="mt-2 text-sm leading-6">
                        {backfillLockedReason}
                      </p>
                    </DashboardSurfaceCard>
                  ) : null}
                  {historicalSetupBlockingLabels.length ? (
                    <DashboardSurfaceCard className="bg-background/70">
                      <p className="text-sm font-semibold text-foreground">
                        Historical finance setup
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Complete {historicalSetupBlockingLabels.join(", ")}{" "}
                        before member profiles, savings, loan, and repayment
                        history are imported.
                      </p>
                    </DashboardSurfaceCard>
                  ) : null}
                  {memberProfilesBlockingLabels.length ? (
                    <DashboardSurfaceCard className="bg-background/70">
                      <p className="text-sm font-semibold text-foreground">
                        Member profiles
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Import members before savings, loan, and repayment
                        records so every historical row has a canonical member
                        record.
                      </p>
                    </DashboardSurfaceCard>
                  ) : null}
                </div>
              </DashboardSectionCard>
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
