"use client"

import { useQuery } from "@tanstack/react-query"
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@halaalvest/ui/components/dialog"
import { Skeleton } from "@halaalvest/ui/components/skeleton"
import { ImportBatchContent } from "@/components/imports/import-batch-content"
import { ImportFileContent } from "@/components/imports/import-file-content"
import type { ImportAvailability } from "@/components/imports/import-types"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useImportParams } from "@/hooks/use-import-params"
import {
  dashboardImportConfigs,
  type DashboardImportKind,
} from "@/lib/import-csv"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"
import { useTRPC } from "@/trpc/client"

const disabledImportBatchId = "00000000-0000-4000-8000-000000000000"

function isDashboardImportKind(
  value: string | null
): value is DashboardImportKind {
  return Boolean(value && value in dashboardImportConfigs)
}

/**
 * The imports modal (Midday: import is a modal). URL-owned: `create` adds a
 * file, `details` (or the older `apply`) opens one batch.
 */
export function ImportSheet({
  devMode,
  importAvailability,
  importKind,
}: {
  devMode: boolean
  importAvailability: ImportAvailability
  importKind?: DashboardImportKind
}) {
  const trpc = useTRPC()
  const { importBatchId, importSheetType, importType, setParams } =
    useImportParams()
  const isBatchRoute =
    Boolean(importBatchId) &&
    (importSheetType === "details" || importSheetType === "apply")
  const batchQuery = useQuery(
    trpc.imports.batch.queryOptions(
      { batchId: importBatchId ?? disabledImportBatchId },
      { enabled: isBatchRoute }
    )
  )
  const urlImportKind = isDashboardImportKind(importType) ? importType : null
  const createKind = importKind ?? urlImportKind
  const batch = isBatchRoute ? (batchQuery.data ?? null) : null
  const isCreateOpen =
    importSheetType === "create" &&
    Boolean(createKind) &&
    (!importKind || !urlImportKind || urlImportKind === importKind)
  // A batch of another kind never opens on a kind's own page.
  const routeTypeMismatch = Boolean(
    importKind &&
    ((urlImportKind && urlImportKind !== importKind) ||
      (batch && batch.importType !== importKind))
  )
  const isBatchOpen = isBatchRoute && !routeTypeMismatch
  const batchKind =
    batch && isDashboardImportKind(batch.importType) ? batch.importType : null

  const close = () => {
    setParams({
      importBatchId: null,
      importSheetType: null,
      importType: null,
    })
  }

  return (
    <WorkflowPresentation
      className="flex flex-col gap-0 overflow-hidden p-0"
      config={getWorkflowPresentation("import", importSheetType)}
      contentClassName="flex min-h-0 min-w-0 flex-1 flex-col"
      mobileFullScreen
      open={isCreateOpen || isBatchOpen}
      onOpenChange={(open) => !open && close()}
    >
      {isCreateOpen && createKind ? (
        <ImportFileContent
          availability={importAvailability[createKind]}
          devMode={devMode}
          importKind={createKind}
          onAdded={(batchId) =>
            setParams({
              importBatchId: batchId,
              importSheetType: "details",
              importType: createKind,
            })
          }
          onClose={close}
        />
      ) : batch ? (
        <ImportBatchContent
          availability={batchKind ? importAvailability[batchKind] : null}
          batch={batch}
          onClose={close}
        />
      ) : (
        <>
          <DialogHeader className="border-b border-border/70 px-4 py-4 text-left sm:px-6">
            <DialogTitle className="text-xl font-semibold">Import</DialogTitle>
            <DialogDescription className="text-base">
              {batchQuery.isError
                ? "This import could not be found."
                : "Loading…"}
            </DialogDescription>
          </DialogHeader>
          {batchQuery.isError ? null : (
            <div
              aria-label="Loading import"
              className="space-y-4 px-4 py-5 sm:px-6"
            >
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
            </div>
          )}
        </>
      )}
    </WorkflowPresentation>
  )
}
