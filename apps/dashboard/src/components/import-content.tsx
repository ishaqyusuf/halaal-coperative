"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useTransition, type FormEvent } from "react"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
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
import { useTRPC } from "@/trpc/client"

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
  const queryClient = useQueryClient()
  const router = useRouter()
  const trpc = useTRPC()
  const { showError, showSuccess } = useNotifications()
  const [isApplying, startApplying] = useTransition()

  function handleApply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    startApplying(async () => {
      try {
        await applyImportBatchAction(formData)
        const invalidations = [
          queryClient.invalidateQueries(
            trpc.imports.batches.infiniteQueryFilter()
          ),
        ]

        if (activeKind === "members") {
          invalidations.push(
            queryClient.invalidateQueries(
              trpc.members.list.infiniteQueryFilter()
            )
          )
        }

        await Promise.all(invalidations)
        router.refresh()
        showSuccess("Import applied", "The staged batch was applied.")
        onSuccess()
      } catch (error) {
        showError(
          "Could not apply import",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

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
    <div className="space-y-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-6">
      <div className="border-y border-border py-4 text-sm">
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
        <div className="divide-y divide-border border-y border-border">
          {selectedBatch.rows.map((row) => (
            <div
              className="px-1 py-3 text-xs text-muted-foreground"
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
        <form className="grid gap-3" onSubmit={handleApply}>
          <input name="batchId" type="hidden" value={selectedBatch.id} />
          <Input
            className="h-11"
            disabled={isApplying}
            name="confirmation"
            placeholder="APPLY IMPORT"
            required
            type="text"
          />
          <Button className="h-11" disabled={isApplying} type="submit">
            {isApplying ? "Applying…" : "Apply batch"}
          </Button>
        </form>
      )}
    </div>
  )
}
