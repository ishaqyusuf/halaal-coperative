"use client"

import { Button } from "@halaalvest/ui/components/button"
import { Sheet, SheetContent } from "@halaalvest/ui/components/sheet"
import { useMemberBackfillParams } from "@/hooks/use-member-backfill-params"
import type { MemberCollectionSourceOption } from "@/lib/members/load-members-page"
import { MemberBackfillBaselineEditContent } from "@/components/members/member-backfill-baseline-edit-content"
import { MemberBackfillBaselineEditSheetHeader } from "@/components/members/member-backfill-baseline-edit-sheet-header"
import type { MemberBackfillBaselineMember } from "@/components/members/member-backfill-baseline-edit-types"

export function MemberBackfillBaselineEditSheet({
  canManageCollectionSources = false,
  collectionSourceOptions = [],
  disabled,
  member,
}: {
  canManageCollectionSources?: boolean
  collectionSourceOptions?: MemberCollectionSourceOption[]
  disabled?: boolean
  member: MemberBackfillBaselineMember
}) {
  const { memberBackfillSheetType, setParams } = useMemberBackfillParams()
  const isOpen = memberBackfillSheetType === "baselineEdit"

  function openSheet() {
    void setParams({ memberBackfillSheetType: "baselineEdit" })
  }

  function closeSheet() {
    void setParams({ memberBackfillSheetType: null })
  }

  return (
    <>
      <Button
        disabled={disabled}
        size="sm"
        type="button"
        variant="outline"
        onClick={openSheet}
      >
        Edit basic information
      </Button>
      <Sheet open={isOpen} onOpenChange={(open) => !open && closeSheet()}>
        <SheetContent
          showCloseButton={false}
          className="max-h-[calc(100vh-2rem)] overflow-hidden p-0 sm:max-w-[520px]"
        >
          <div className="max-h-[calc(100vh-2rem)] overflow-y-auto p-4">
            <MemberBackfillBaselineEditSheetHeader />
            <MemberBackfillBaselineEditContent
              canManageCollectionSources={canManageCollectionSources}
              collectionSourceOptions={collectionSourceOptions}
              isOpen={isOpen}
              member={member}
              onClose={closeSheet}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
