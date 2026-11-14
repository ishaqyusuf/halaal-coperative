"use client"

import { ChevronRight } from "lucide-react"
import { ImportStatusBadge } from "@/components/imports/import-status-badge"
import { formatDayMonthYear } from "@/utils/format"
import { importBatchTitle } from "./columns"
import type { ImportBatchRow } from "./data-table"

/** One import on a phone: a single tap target that opens the batch. */
export function ImportMobileItem({
  batch,
  onOpenDetails,
}: {
  batch: ImportBatchRow
  onOpenDetails: (batch: ImportBatchRow) => void
}) {
  const { count, title } = importBatchTitle(batch)

  return (
    <button
      aria-label={`${title}, ${count}`}
      className="flex min-h-20 w-full items-center gap-3 py-4 text-left hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      onClick={() => onOpenDetails(batch)}
      type="button"
    >
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-base font-medium text-foreground">
          {title}
        </p>
        <p className="truncate text-sm text-muted-foreground">
          {count} · {formatDayMonthYear(batch.appliedAt ?? batch.createdAt)}
        </p>
      </div>
      <ImportStatusBadge status={batch.status} />
      <ChevronRight
        aria-hidden
        className="size-5 shrink-0 text-muted-foreground"
      />
    </button>
  )
}
