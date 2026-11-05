"use client"

import { useQuery } from "@tanstack/react-query"
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@halaalvest/ui/components/dialog"
import { Spinner } from "@halaalvest/ui/components/spinner"
import { MemberImportContent } from "@/components/member-import-content"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useMemberParams } from "@/hooks/use-member-params"
import type { MemberImportColumnSettings } from "@/lib/member-import-column-settings"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"
import { useTRPC } from "@/trpc/client"

export function MemberImportSheet({
  devMode,
  initialColumnSettings,
  onOpenChange,
  open,
}: {
  devMode: boolean
  initialColumnSettings?: MemberImportColumnSettings
  onOpenChange?: (open: boolean) => void
  open?: boolean
}) {
  const trpc = useTRPC()
  const { memberSheetType, setParams } = useMemberParams()
  const sheetOpen = open ?? memberSheetType === "import"
  // Import reference data and the latest batch load when the sheet opens;
  // httpBatchLink sends both in one request.
  const referenceDataQuery = useQuery({
    ...trpc.imports.referenceData.queryOptions(),
    enabled: sheetOpen,
  })
  const latestBatchQuery = useQuery({
    ...trpc.imports.batches.queryOptions({
      importType: "members",
      pageSize: 1,
    }),
    enabled: sheetOpen,
  })

  function setSheetOpen(nextOpen: boolean) {
    onOpenChange?.(nextOpen)
    void setParams({
      memberSheetType: nextOpen ? "import" : null,
      selectedMemberId: null,
      selectedMemberStatus: null,
    })
  }

  return (
    <WorkflowPresentation
      className="flex flex-col gap-0 overflow-hidden p-0"
      contentClassName="flex min-h-0 flex-1 flex-col"
      config={getWorkflowPresentation("memberImport", "import")}
      open={sheetOpen}
      onOpenChange={setSheetOpen}
    >
      {referenceDataQuery.data ? (
        <MemberImportContent
          devMode={devMode}
          initialColumnSettings={initialColumnSettings}
          latestBatch={latestBatchQuery.data?.data[0] ?? null}
          referenceData={referenceDataQuery.data}
          onClose={() => setSheetOpen(false)}
        />
      ) : (
        <>
          <DialogHeader className="border-b border-border/70 px-4 py-4 text-left sm:px-6">
            <DialogTitle>Import members</DialogTitle>
            <DialogDescription>
              {referenceDataQuery.isError
                ? "Existing member records could not load, so the import can't check for duplicates. Close and try again."
                : "Loading existing member records for duplicate checks."}
            </DialogDescription>
          </DialogHeader>
          {referenceDataQuery.isError ? null : (
            <div className="flex flex-1 items-center justify-center py-16">
              <Spinner className="size-6 text-muted-foreground" />
            </div>
          )}
        </>
      )}
    </WorkflowPresentation>
  )
}
