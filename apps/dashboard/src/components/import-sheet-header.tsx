"use client"

import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"
import type { DashboardImportKind } from "@/lib/import-csv"
import { dashboardImportConfigs } from "@/lib/import-csv"
import type { ImportBatchRow } from "@/components/import-sheet-types"

function formatImportKind(kind: string) {
  return kind.replace(/_/g, " ")
}

export function ImportSheetHeader({
  activeKind,
  isCreateOpen,
  selectedBatch,
}: {
  activeKind: DashboardImportKind | null
  isCreateOpen: boolean
  selectedBatch: ImportBatchRow | null
}) {
  const config = activeKind ? dashboardImportConfigs[activeKind] : null

  return (
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
          ? (config?.description ?? "Paste CSV content and stage or import it.")
          : "Review the staged import batch before applying it."}
      </SheetDescription>
    </SheetHeader>
  )
}
