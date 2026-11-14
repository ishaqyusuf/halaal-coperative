"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@halaalvest/ui/components/dialog"
import { ConfirmActionDialog } from "@/components/confirm-action-dialog"
import { ImportStatusBadge } from "@/components/imports/import-status-badge"
import type {
  ImportAvailability,
  ImportBatchDetail,
} from "@/components/imports/import-types"
import { applyImportBatchAction } from "@/lib/dashboard-actions"
import { objectToFormData } from "@/lib/form-submit"
import type { DashboardImportKind } from "@/lib/import-csv"
import { describeImportRow } from "@/lib/imports/import-rows"
import {
  formatImportNaira,
  importCount,
  importKindWords,
} from "@/lib/imports/import-words"
import { useTRPC } from "@/trpc/client"
import { formatDayMonthYear } from "@/utils/format"

/**
 * One import batch: what was in the file and what happened to it. A batch
 * saved earlier (or one that stopped) can be added from here.
 */
export function ImportBatchContent({
  availability,
  batch,
  onClose,
}: {
  availability: ImportAvailability[DashboardImportKind] | null
  batch: ImportBatchDetail
  onClose: () => void
}) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const router = useRouter()
  const { showError, showSuccess } = useNotifications()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isAdding, startAdding] = useTransition()
  const kind = batch.importType as DashboardImportKind
  const words = importKindWords[kind]
  const count = importCount(kind, batch.totalRows)
  const total =
    batch.totalAmount == null ? null : formatImportNaira(batch.totalAmount)
  const canAdd =
    (batch.status === "draft" || batch.status === "failed") &&
    Boolean(availability?.isAvailable)

  function add() {
    startAdding(async () => {
      try {
        await applyImportBatchAction(objectToFormData({ batchId: batch.id }))
        await queryClient.invalidateQueries(trpc.imports.pathFilter())
        router.refresh()
        setConfirmOpen(false)
        showSuccess("Added", `${count} added.`)
      } catch (error) {
        setConfirmOpen(false)
        await queryClient.invalidateQueries(trpc.imports.pathFilter())
        showError(
          "Nothing was added",
          error instanceof Error ? error.message : "Please try again."
        )
      }
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DialogHeader className="border-b border-border/70 px-4 py-4 text-left sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <DialogTitle className="text-xl font-semibold">
            {words.title}
          </DialogTitle>
          <ImportStatusBadge status={batch.status} />
        </div>
        <DialogDescription className="text-base text-foreground/80">
          {count} from a spreadsheet, by {batch.createdByUser.fullName}
        </DialogDescription>
      </DialogHeader>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-5 sm:px-6">
        <BatchStatusNotice batch={batch} total={total} />
        {(batch.status === "draft" || batch.status === "failed") &&
        availability &&
        !availability.isAvailable ? (
          <p className="text-base text-amber-900">
            {availability.blockedReason}
          </p>
        ) : null}

        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-3 text-base">
          <dt className="text-muted-foreground">{words.title}</dt>
          <dd className="text-right font-medium">
            {batch.totalRows.toLocaleString("en-NG")}
          </dd>
          {total ? (
            <>
              <dt className="text-muted-foreground">
                {kind === "loan_migrations" ? "Still owed" : "Total"}
              </dt>
              <dd className="text-right font-medium">{total}</dd>
            </>
          ) : null}
          {batch.existingMatchCount > 0 && kind === "members" ? (
            <>
              <dt className="text-muted-foreground">Updated, not new</dt>
              <dd className="text-right font-medium">
                {batch.existingMatchCount.toLocaleString("en-NG")}
              </dd>
            </>
          ) : null}
          <dt className="text-muted-foreground">Saved</dt>
          <dd className="text-right">{formatDayMonthYear(batch.createdAt)}</dd>
          {batch.appliedAt ? (
            <>
              <dt className="text-muted-foreground">Added</dt>
              <dd className="text-right">
                {formatDayMonthYear(batch.appliedAt)}
              </dd>
            </>
          ) : null}
        </dl>

        <section className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">In the file</h3>
          <ul className="divide-y divide-border/70 border-y border-border/70">
            {batch.rows.map((row) => {
              const item = describeImportRow(kind, row.payload)
              return (
                <li
                  className="flex items-start justify-between gap-4 py-3 text-base"
                  key={row.id}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {item.title}
                    </p>
                    {item.detail ? (
                      <p className="truncate text-sm text-muted-foreground">
                        {item.detail}
                      </p>
                    ) : null}
                  </div>
                  {item.amount !== null ? (
                    <p className="shrink-0 font-medium">
                      {formatImportNaira(item.amount)}
                    </p>
                  ) : null}
                </li>
              )
            })}
          </ul>
          {batch.totalRows > batch.rows.length ? (
            <p className="text-sm text-muted-foreground">
              Showing the first {batch.rows.length} of{" "}
              {batch.totalRows.toLocaleString("en-NG")}.
            </p>
          ) : null}
        </section>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-border/70 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex sm:justify-end sm:px-6">
        <Button
          className={canAdd ? "h-11 text-base" : "col-span-2 h-11 text-base"}
          onClick={onClose}
          type="button"
          variant={canAdd ? "ghost" : "outline"}
        >
          Close
        </Button>
        {canAdd ? (
          <Button
            className="h-11 text-base"
            disabled={isAdding}
            onClick={() => (words.postsMoney ? setConfirmOpen(true) : add())}
            type="button"
          >
            {isAdding ? "Adding…" : `Add ${count}`}
          </Button>
        ) : null}
      </div>

      {words.postsMoney ? (
        <ConfirmActionDialog
          actionLabel={`Add ${count}`}
          description={`${words.moneyEffect?.(total ?? "") ?? ""} A batch can only be added once.`}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={add}
          open={confirmOpen}
          pending={isAdding}
          title={`Add ${count}?`}
        />
      ) : null}
    </div>
  )
}

function BatchStatusNotice({
  batch,
  total,
}: {
  batch: ImportBatchDetail
  total: string | null
}) {
  const kind = batch.importType as DashboardImportKind
  const count = importCount(kind, batch.totalRows)

  switch (batch.status) {
    case "applied":
      return (
        <p className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-base text-emerald-950">
          {count}
          {total ? ` (${total})` : ""} added on{" "}
          {formatDayMonthYear(batch.appliedAt ?? batch.createdAt)}.
        </p>
      )
    case "applying":
      return (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-base text-amber-950">
          This file is being added now. Check again in a minute.
        </p>
      )
    case "partial":
      return (
        <p
          className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-base text-destructive"
          role="alert"
        >
          {batch.errorMessage ??
            "Part of this file was added before it stopped."}{" "}
          Check the records before adding anything again.
        </p>
      )
    case "failed":
      return (
        <p
          className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-base text-destructive"
          role="alert"
        >
          {batch.errorMessage ?? "This file could not be added."} Nothing was
          added.
        </p>
      )
    default:
      return (
        <p className="rounded-lg border border-border bg-muted/40 p-4 text-base">
          This file was saved but not added yet.
        </p>
      )
  }
}
