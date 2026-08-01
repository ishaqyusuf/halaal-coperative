"use client"

import { MemberImportContent } from "@/components/member-import-content"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useMemberParams } from "@/hooks/use-member-params"
import type { DashboardImportReferenceData } from "@/lib/import-csv"
import type { MemberImportColumnSettings } from "@/lib/member-import-column-settings"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

export function MemberImportSheet({
  batches,
  devMode,
  initialColumnSettings,
  onOpenChange,
  open,
  referenceData,
}: {
  batches: Array<{
    _count: { rows: number }
    createdAt: Date
    duplicateRowCount: number
    existingMatchCount: number
    id: string
    importType: string
    status: string
    validRows: number
  }>
  devMode: boolean
  initialColumnSettings?: MemberImportColumnSettings
  onOpenChange?: (open: boolean) => void
  open?: boolean
  referenceData: DashboardImportReferenceData
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
      contentClassName="flex min-h-0 flex-1 flex-col"
      config={getWorkflowPresentation("memberImport", "import")}
      open={sheetOpen}
      onOpenChange={setSheetOpen}
    >
      <MemberImportContent
        batches={batches}
        devMode={devMode}
        initialColumnSettings={initialColumnSettings}
        referenceData={referenceData}
        onClose={() => setSheetOpen(false)}
      />
    </WorkflowPresentation>
  )
}
