import { ChevronRight } from "lucide-react"
import Link from "next/link"
import { Suspense, type ComponentProps } from "react"
import { buttonVariants } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import { ScrollableContent, WorkspaceEmptyState } from "@/components/dashboard"
import type { ImportAvailability } from "@/components/imports/import-types"
import { OpenImportSheet } from "@/components/open-import-sheet"
import { SecondaryMenu } from "@/components/secondary-menu"
import { DataTable as ImportDataTable } from "@/components/tables/imports/data-table"
import { Loading as ImportTableLoading } from "@/components/tables/imports/skeleton"
import type { DashboardImportKind } from "@/lib/import-csv"
import {
  importCount,
  importKindOrder,
  importKindWords,
} from "@/lib/imports/import-words"
import { formatDayMonthYear } from "@/utils/format"

export type ImportSettingsSection = "overview" | DashboardImportKind | "batches"

type ImportDataTableProps = ComponentProps<typeof ImportDataTable>

export type ImportKindProgress = {
  addedRows: number
  lastAddedAt: Date | null
  waitingBatches: number
}

export const importKindPaths: Record<DashboardImportKind, string> = {
  charges: "/settings/imports/charges",
  contributions: "/settings/imports/contributions",
  deduction_sources: "/settings/imports/deduction-sources",
  loan_migrations: "/settings/imports/loan-migrations",
  loan_products: "/settings/imports/loan-products",
  members: "/settings/imports/members",
  repayment_migrations: "/settings/imports/repayment-migrations",
}

export const importMenuItems = [
  { path: "/settings/imports", label: "Overview" },
  ...importKindOrder.map((kind) => ({
    label: importKindWords[kind].menu,
    path: importKindPaths[kind],
  })),
  { path: "/settings/imports/batches", label: "All imports" },
]

export function ImportsRuntimeUnavailable() {
  return (
    <ScrollableContent>
      <div className="flex max-w-[980px] flex-col gap-6">
        <SecondaryMenu items={importMenuItems} />
        <WorkspaceEmptyState
          body="Imports need the database. Try again in a few minutes."
          title="Imports are not available right now."
        />
      </div>
    </ScrollableContent>
  )
}

function ProgressLine({
  availability,
  kind,
  progress,
}: {
  availability: ImportAvailability[DashboardImportKind]
  kind: DashboardImportKind
  progress?: ImportKindProgress
}) {
  if (progress?.addedRows) {
    return (
      <span className="text-emerald-800">
        {importCount(kind, progress.addedRows)} added
        {progress.lastAddedAt
          ? ` · ${formatDayMonthYear(progress.lastAddedAt)}`
          : ""}
      </span>
    )
  }
  if (progress?.waitingBatches) {
    return (
      <span className="text-amber-900">
        {progress.waitingBatches === 1
          ? "1 file saved, not added yet"
          : `${progress.waitingBatches} files saved, not added yet`}
      </span>
    )
  }
  if (!availability.isAvailable) {
    return <span>{availability.blockedReason}</span>
  }
  return <span>Nothing added yet</span>
}

/** The imports overview: what to bring in, in order, and how far along it is. */
function ImportsOverview({
  importAvailability,
  lockedReason,
  progress,
}: {
  importAvailability: ImportAvailability
  lockedReason?: string | null
  progress: Partial<Record<DashboardImportKind, ImportKindProgress>>
}) {
  const nextKind = lockedReason
    ? undefined
    : importKindOrder.find(
        (kind) =>
          importAvailability[kind].isAvailable && !progress[kind]?.addedRows
      )

  return (
    <>
      <p className="max-w-2xl text-lg text-foreground/80">
        Bring your records in from spreadsheets. Start at the top and work down.
      </p>

      {lockedReason ? (
        <p
          className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-base text-amber-950"
          role="status"
        >
          {lockedReason}
        </p>
      ) : nextKind ? (
        <Link
          className={cn(
            buttonVariants(),
            "h-12 w-full text-base sm:w-auto sm:self-start"
          )}
          href={`${importKindPaths[nextKind]}?importSheetType=create&importType=${nextKind}`}
        >
          Add {importKindWords[nextKind].many}
        </Link>
      ) : null}

      <ol className="divide-y divide-border/70 border-y border-border/70">
        {importKindOrder.map((kind, index) => (
          <li key={kind}>
            <Link
              className="flex min-h-[72px] items-center gap-4 py-3 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              href={importKindPaths[kind]}
            >
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-base font-semibold"
              >
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-medium text-foreground">
                  {importKindWords[kind].title}
                </span>
                <span className="block text-base text-muted-foreground">
                  <ProgressLine
                    availability={importAvailability[kind]}
                    kind={kind}
                    progress={progress[kind]}
                  />
                </span>
              </span>
              <ChevronRight
                aria-hidden
                className="size-5 shrink-0 text-muted-foreground"
              />
            </Link>
          </li>
        ))}
      </ol>

      <Link
        className="inline-flex min-h-11 items-center text-base font-medium text-foreground underline underline-offset-4"
        href="/settings/imports/batches"
      >
        See every file added
      </Link>
    </>
  )
}

export function ImportsSettingsView({
  canManageImports,
  importAvailability,
  initialSettings,
  lockedReason,
  progress,
  quickFillEnabled,
  section,
}: {
  canManageImports: boolean
  importAvailability: ImportAvailability
  initialSettings: ImportDataTableProps["initialSettings"]
  /** Set when every import is closed (live cooperative, backfill started). */
  lockedReason?: string | null
  progress: Partial<Record<DashboardImportKind, ImportKindProgress>>
  quickFillEnabled: boolean
  section: ImportSettingsSection
}) {
  const importKind =
    section !== "overview" && section !== "batches" ? section : undefined
  const availability = importKind ? importAvailability[importKind] : null

  return (
    <ScrollableContent>
      <div className="flex max-w-[980px] flex-col gap-6">
        <SecondaryMenu items={importMenuItems} />

        {!canManageImports ? (
          <WorkspaceEmptyState
            body="Cooperative staff add records from spreadsheets here."
            title="Only staff can use imports."
          />
        ) : section === "overview" ? (
          <ImportsOverview
            importAvailability={importAvailability}
            lockedReason={lockedReason}
            progress={progress}
          />
        ) : (
          <>
            <p className="max-w-2xl text-lg text-foreground/80">
              {importKind
                ? importKindWords[importKind].line
                : "Every file added from a spreadsheet, newest first."}
            </p>

            {importKind && availability ? (
              availability.isAvailable ? (
                <OpenImportSheet importKind={importKind} />
              ) : (
                <p
                  className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-base text-amber-950"
                  role="status"
                >
                  {availability.blockedReason}
                </p>
              )
            ) : null}

            <section
              aria-labelledby="import-history-title"
              className="space-y-3"
            >
              <h2
                className="text-lg font-semibold text-foreground"
                id="import-history-title"
              >
                {importKind ? "Added before" : "All imports"}
              </h2>
              <Suspense fallback={<ImportTableLoading />}>
                <ImportDataTable
                  devMode={quickFillEnabled}
                  importAvailability={importAvailability}
                  importKind={importKind}
                  initialSettings={initialSettings}
                />
              </Suspense>
            </section>
          </>
        )}
      </div>
    </ScrollableContent>
  )
}
