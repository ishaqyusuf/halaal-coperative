"use client"

import { Button } from "@halaalvest/ui/components/button"
import { DashboardImportForm } from "@/components/forms/import-forms"
import type {
  ImportAvailability,
  ImportBatchSummary,
} from "@/components/forms/import-forms"
import type { ImportBatchRow } from "@/components/import-sheet-types"
import { applyImportBatchAction } from "@/lib/dashboard-actions"
import type {
  DashboardImportKind,
  DashboardImportReferenceData,
} from "@/lib/import-csv"

export function ImportContent({
  activeKind,
  batches,
  batchAvailability,
  devMode,
  importAvailability,
  isBatchLocked,
  isCreateOpen,
  onSuccess,
  referenceData,
  selectedBatch,
}: {
  activeKind: DashboardImportKind | null
  batches: ImportBatchSummary[]
  batchAvailability: ImportAvailability[DashboardImportKind] | null
  devMode: boolean
  importAvailability: ImportAvailability
  isBatchLocked: boolean
  isCreateOpen: boolean
  onSuccess: () => void
  referenceData: DashboardImportReferenceData
  selectedBatch: ImportBatchRow | null
}) {
  if (isCreateOpen && activeKind) {
    return (
      <div className="px-6 pb-6">
        <DashboardImportForm
          availability={importAvailability[activeKind]}
          batches={batches}
          devMode={devMode}
          importKind={activeKind}
          onSuccess={onSuccess}
          referenceData={referenceData}
        />
      </div>
    )
  }

  if (!selectedBatch) {
    return null
  }

  return (
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
            {batchAvailability?.blockedReason ?? "This staged batch is locked."}
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
  )
}
