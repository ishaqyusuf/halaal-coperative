"use client"

import type { ImportAvailability } from "@/components/forms/import-forms"
import { Skeleton } from "@halaalvest/ui/components/skeleton"
import { useQuery } from "@tanstack/react-query"
import { ImportContent } from "@/components/import-content"
import { ImportSheetHeader } from "@/components/import-sheet-header"
import type { ImportBatchRow } from "@/components/import-sheet-types"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useImportParams } from "@/hooks/use-import-params"
import {
  dashboardImportConfigs,
  type DashboardImportKind,
  type DashboardImportReferenceData,
} from "@/lib/import-csv"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"
import { useTRPC } from "@/trpc/client"

const disabledImportBatchId = "00000000-0000-4000-8000-000000000000"

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
  const trpc = useTRPC()
  const { importBatchId, importSheetType, importType, setParams } =
    useImportParams()
  const isBatchRoute =
    Boolean(importBatchId) &&
    (importSheetType === "details" || importSheetType === "apply")
  const { data: queriedBatch, isLoading: isBatchLoading } = useQuery(
    trpc.imports.batch.queryOptions(
      { batchId: importBatchId ?? disabledImportBatchId },
      { enabled: isBatchRoute }
    )
  )
  const selectedImportKind =
    importKind ?? (isDashboardImportKind(importType) ? importType : null)
  const selectedBatch =
    queriedBatch ?? batches.find((batch) => batch.id === importBatchId) ?? null
  const isCreateOpen =
    importSheetType === "create" &&
    Boolean(selectedImportKind) &&
    (!importKind || selectedImportKind === importKind)
  const isBatchOpen = isBatchRoute
  const isOpen = isCreateOpen || isBatchOpen
  const presentation = getWorkflowPresentation("import", importSheetType)
  const selectedBatchKind = selectedBatch?.importType ?? null
  const batchKind = isDashboardImportKind(selectedBatchKind)
    ? selectedBatchKind
    : null
  const activeKind = selectedImportKind ?? batchKind
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
    <WorkflowPresentation
      config={presentation}
      open={isOpen}
      onOpenChange={(open) => !open && close()}
    >
      <ImportSheetHeader
        activeKind={activeKind}
        isCreateOpen={isCreateOpen}
        selectedBatch={selectedBatch}
      />
      {isBatchOpen && isBatchLoading && !selectedBatch ? (
        <div className="space-y-4 px-6 pb-6" aria-label="Loading import batch">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      ) : (
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
      )}
    </WorkflowPresentation>
  )
}
