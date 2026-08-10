"use client"

import { Badge } from "@halaalvest/ui/components/badge"
import { Button } from "@halaalvest/ui/components/button"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemHeader,
  ItemTitle,
} from "@halaalvest/ui/components/item"
import { MoreHorizontal } from "lucide-react"
import { useState, type KeyboardEvent } from "react"
import { MobileActionsDrawer } from "@/components/tables/core/mobile-actions-drawer"
import type { ImportBatchRow } from "./data-table"

function formatImportKind(kind: string) {
  return kind.replaceAll("_", " ")
}

function ImportStatusBadge({ status }: { status: string }) {
  const applied = status === "applied"

  return (
    <Badge
      className={
        applied
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-amber-200 bg-amber-50 text-amber-700"
      }
      variant="outline"
    >
      {status.replaceAll("_", " ")}
    </Badge>
  )
}

export function ImportMobileItem({
  batch,
  onOpenApply,
  onOpenDetails,
}: {
  batch: ImportBatchRow
  onOpenApply: (batch: ImportBatchRow) => void
  onOpenDetails: (batch: ImportBatchRow) => void
}) {
  const [actionsOpen, setActionsOpen] = useState(false)
  const totalRows = batch.totalRows ?? batch._count.rows
  const title = `${formatImportKind(batch.importType)} import`

  function openDetails() {
    onOpenDetails(batch)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") return

    event.preventDefault()
    openDetails()
  }

  return (
    <>
      <Item
        aria-label={`Review ${title}`}
        className="cursor-pointer gap-3 border-0 bg-transparent px-0 py-4 hover:bg-muted/50"
        onClick={openDetails}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
      >
        <ItemHeader>
          <ItemContent className="min-w-0">
            <ItemTitle className="max-w-full text-sm capitalize">
              <span className="truncate">{title}</span>
            </ItemTitle>
            <ItemDescription>
              Created {batch.createdAt.toISOString().slice(0, 10)}
            </ItemDescription>
          </ItemContent>

          <ItemActions
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <Button
              aria-label={`Open actions for ${title}`}
              className="size-11"
              onClick={() => setActionsOpen(true)}
              size="icon-lg"
              type="button"
              variant="ghost"
            >
              <MoreHorizontal />
            </Button>
          </ItemActions>
        </ItemHeader>

        <ItemContent className="min-w-0 basis-full">
          <dl className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2">
            <dt className="text-[11px] text-muted-foreground">Status</dt>
            <dd className="flex justify-end capitalize">
              <ImportStatusBadge status={batch.status} />
            </dd>

            <dt className="text-[11px] text-muted-foreground">Valid rows</dt>
            <dd className="text-right text-xs font-medium text-foreground">
              {batch.validRows}/{totalRows}
            </dd>

            <dt className="text-[11px] text-muted-foreground">Review flags</dt>
            <dd className="text-right text-xs text-foreground">
              {batch.existingMatchCount} matches · {batch.duplicateRowCount}{" "}
              duplicates
            </dd>

            <dt className="text-[11px] text-muted-foreground">Created by</dt>
            <dd className="max-w-48 truncate text-right text-xs text-foreground">
              {batch.createdByUser.fullName}
            </dd>
          </dl>
        </ItemContent>
      </Item>

      <MobileActionsDrawer
        description="Review the staged rows or apply this import batch."
        onOpenChange={setActionsOpen}
        open={actionsOpen}
        title={title}
      >
        <div className="divide-y divide-border border-y border-border">
          <Button
            className="h-11 w-full justify-start px-0"
            onClick={() => {
              setActionsOpen(false)
              onOpenDetails(batch)
            }}
            type="button"
            variant="ghost"
          >
            Review batch
          </Button>
          <Button
            className="h-11 w-full justify-start px-0"
            disabled={batch.status === "applied"}
            onClick={() => {
              setActionsOpen(false)
              onOpenApply(batch)
            }}
            type="button"
            variant="ghost"
          >
            Apply batch
          </Button>
        </div>
      </MobileActionsDrawer>
    </>
  )
}
