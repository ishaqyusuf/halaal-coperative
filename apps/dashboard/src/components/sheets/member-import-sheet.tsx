"use client"

import { ImportFileContent } from "@/components/imports/import-file-content"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useMemberParams } from "@/hooks/use-member-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

/**
 * "Import" on the member registry: the same add-from-a-spreadsheet modal as
 * Settings, Imports, Members, so there is one way to import members. The
 * page only offers it while imports are open; the server checks again.
 */
export function MemberImportSheet({
  devMode,
  onOpenChange,
  open,
}: {
  devMode: boolean
  onOpenChange?: (open: boolean) => void
  open?: boolean
}) {
  const { memberSheetType, setParams } = useMemberParams()
  const sheetOpen = open ?? memberSheetType === "import"

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
      config={getWorkflowPresentation("memberImport", "import")}
      contentClassName="flex min-h-0 min-w-0 flex-1 flex-col"
      mobileFullScreen
      open={sheetOpen}
      onOpenChange={setSheetOpen}
    >
      {sheetOpen ? (
        <ImportFileContent
          availability={{ isAvailable: true }}
          devMode={devMode}
          importKind="members"
          onAdded={() => setSheetOpen(false)}
          onClose={() => setSheetOpen(false)}
        />
      ) : null}
    </WorkflowPresentation>
  )
}
