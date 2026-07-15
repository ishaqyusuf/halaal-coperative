"use client"

import { Sheet, SheetContent } from "@halaalvest/ui/components/sheet"
import type {
  ImportAvailability,
} from "@/components/forms/import-forms"
import { ImportContent } from "@/components/import-content"
import { ImportSheetHeader } from "@/components/import-sheet-header"
import type { ImportBatchRow } from "@/components/import-sheet-types"
import { useImportParams } from "@/hooks/use-import-params"
import {
  dashboardImportConfigs,
  type DashboardImportKind,
  type DashboardImportReferenceData,
} from "@/lib/import-csv"

function isDashboardImportKind(
  value: string | null
): value is DashboardImportKind {
  return Boolean(value && value in dashboardImportConfigs)
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
        <ImportSheetHeader
          activeKind={activeKind}
          isCreateOpen={isCreateOpen}
          selectedBatch={selectedBatch}
        />
        <ImportContent
          activeKind={activeKind}
          batches={batches}
          batchAvailability={batchAvailability}
          devMode={devMode}
          importAvailability={importAvailability}
          isBatchLocked={isBatchLocked}
          isCreateOpen={isCreateOpen}
          referenceData={referenceData}
          selectedBatch={selectedBatch}
          onSuccess={close}
        />
      </SheetContent>
    </Sheet>
  )
}
