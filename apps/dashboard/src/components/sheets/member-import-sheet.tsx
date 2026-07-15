"use client"

import { Sheet, SheetContent } from "@halaalvest/ui/components/sheet"
import { MemberImportContent } from "@/components/member-import-content"
import { useMemberParams } from "@/hooks/use-member-params"
import type { DashboardImportReferenceData } from "@/lib/import-csv"
import type { MemberImportColumnSettings } from "@/lib/member-import-column-settings"

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
  const sheetOpen = open ?? (memberSheetType === "import")

  function setSheetOpen(nextOpen: boolean) {
    onOpenChange?.(nextOpen)
    void setParams({
      memberSheetType: nextOpen ? "import" : null,
      selectedMemberId: null,
      selectedMemberStatus: null,
    })
  }

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetContent className="flex max-h-[90vh] w-[96vw] max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden rounded-xl p-0 sm:max-w-[92rem]">
        <MemberImportContent
          batches={batches}
          devMode={devMode}
          initialColumnSettings={initialColumnSettings}
          referenceData={referenceData}
          onClose={() => setSheetOpen(false)}
        />
      </SheetContent>
    </Sheet>
  )
}
