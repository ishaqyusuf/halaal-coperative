"use client"

import { Add01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@halaalvest/ui/components/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"
import {
  dashboardImportConfigs,
  type DashboardImportKind,
  type DashboardImportReferenceData,
} from "@/lib/import-csv"
import { applyImportBatchAction } from "@/lib/dashboard-actions"
import { useImportParams } from "@/hooks/use-import-params"
import {
  DashboardImportForm,
  type ImportAvailability,
  type ImportBatchSummary,
} from "@/components/forms/import-forms"

type ImportBatchRow = ImportBatchSummary & {
  errorMessage?: string | null
  rows?: Array<{
    duplicateInFile: boolean
    existingMatch: boolean
    id: string
    primaryValue: string | null
    rowIndex: number
  }>
  totalRows?: number
}

function isDashboardImportKind(
  value: string | null
): value is DashboardImportKind {
  return Boolean(value && value in dashboardImportConfigs)
}

function formatImportKind(kind: string) {
  return kind.replace(/_/g, " ")
}

export function OpenImportSheet({
  disabled,
  importKind,
}: {
  disabled: boolean
  importKind: DashboardImportKind
}) {
  const { setParams } = useImportParams()

  return (
    <Button
      aria-label={`Import ${dashboardImportConfigs[importKind].title}`}
      disabled={disabled}
      onClick={() =>
        setParams({
          importBatchId: null,
          importSheetType: "create",
          importType: importKind,
        })
      }
      size="icon"
      type="button"
      variant="outline"
    >
      <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
    </Button>
  )
}

export function ImportSheet({
  batches,
  devMode,
  importAvailability,
  importKind,
  referenceData,
}: {
  batches: ImportBatchRow[]
  devMode: boolean
  importAvailability: ImportAvailability
  importKind?: DashboardImportKind
  referenceData: DashboardImportReferenceData
}) {
  const { importBatchId, importSheetType, importType, setParams } =
    useImportParams()
  const selectedImportKind =
    importKind ?? (isDashboardImportKind(importType) ? importType : null)
  const selectedBatch =
    batches.find((batch) => batch.id === importBatchId) ?? null
  const isCreateOpen =
    importSheetType === "create" &&
    Boolean(selectedImportKind) &&
    (!importKind || selectedImportKind === importKind)
  const isBatchOpen =
    Boolean(selectedBatch) &&
    (importSheetType === "details" || importSheetType === "apply")
  const isOpen = isCreateOpen || isBatchOpen
  const selectedBatchKind = selectedBatch?.importType ?? null
  const batchKind = isDashboardImportKind(selectedBatchKind)
    ? selectedBatchKind
    : null
  const activeKind = selectedImportKind ?? batchKind
  const config = activeKind ? dashboardImportConfigs[activeKind] : null
  const sheetWidthClass =
    activeKind === "members"
      ? "!w-[92vw] !max-w-[92vw] sm:!w-[min(92vw,72rem)] sm:!max-w-[72rem]"
      : "sm:max-w-xl"
  const batchAvailability = batchKind ? importAvailability[batchKind] : null
  const isBatchLocked =
    Boolean(selectedBatch) &&
    selectedBatch?.status !== "applied" &&
    !batchAvailability?.isAvailable

  const close = () => {
    setParams({
      importBatchId: null,
      importSheetType: null,
      importType: null,
    })
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetContent className={`overflow-y-auto ${sheetWidthClass}`}>
        <SheetHeader>
          <SheetTitle>
            {isCreateOpen
              ? `Import ${config?.title ?? "CSV"}`
              : selectedBatch
                ? `${formatImportKind(selectedBatch.importType)} batch`
                : "Import batch"}
          </SheetTitle>
          <SheetDescription>
            {isCreateOpen
              ? (config?.description ??
                "Paste CSV content and stage or import it.")
              : "Review the staged import batch before applying it."}
          </SheetDescription>
        </SheetHeader>

        {isCreateOpen && activeKind ? (
          <div className="px-6 pb-6">
            <DashboardImportForm
              availability={importAvailability[activeKind]}
              batches={batches}
              devMode={devMode}
              importKind={activeKind}
              onSuccess={close}
              referenceData={referenceData}
            />
          </div>
        ) : selectedBatch ? (
          <div className="space-y-4 px-6 pb-6">
            <div className="rounded-lg border border-border/70 bg-background p-4 text-sm">
              <p className="font-medium text-foreground">
                {selectedBatch.status} · {selectedBatch.validRows}/
                {selectedBatch.totalRows ?? selectedBatch._count.rows} rows
              </p>
              <p className="mt-1 text-muted-foreground">
                Created by {selectedBatch.createdByUser.fullName} on{" "}
                {selectedBatch.createdAt.toISOString().slice(0, 10)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {selectedBatch.existingMatchCount} existing matches ·{" "}
                {selectedBatch.duplicateRowCount} duplicate keys
              </p>
              {selectedBatch.errorMessage ? (
                <p className="mt-2 text-xs text-destructive">
                  {selectedBatch.errorMessage}
                </p>
              ) : null}
              {isBatchLocked ? (
                <p className="mt-2 text-xs leading-5 text-amber-800">
                  {batchAvailability?.blockedReason ??
                    "This staged batch is locked."}
                </p>
              ) : null}
            </div>

            {selectedBatch.rows?.length ? (
              <div className="space-y-2">
                {selectedBatch.rows.map((row) => (
                  <div
                    className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground"
                    key={row.id}
                  >
                    Row {row.rowIndex}
                    {row.primaryValue ? ` · ${row.primaryValue}` : ""}
                    {row.existingMatch ? " · existing match" : ""}
                    {row.duplicateInFile ? " · duplicate in file" : ""}
                  </div>
                ))}
              </div>
            ) : null}

            {selectedBatch.status === "applied" ? (
              <p className="text-sm text-muted-foreground">
                This batch has already been applied.
              </p>
            ) : isBatchLocked ? null : (
              <form action={applyImportBatchAction} className="grid gap-3">
                <input name="batchId" type="hidden" value={selectedBatch.id} />
                <input
                  className="h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground"
                  name="confirmation"
                  placeholder="APPLY IMPORT"
                  required
                  type="text"
                />
                <Button type="submit" variant="outline">
                  Apply batch
                </Button>
              </form>
            )}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
