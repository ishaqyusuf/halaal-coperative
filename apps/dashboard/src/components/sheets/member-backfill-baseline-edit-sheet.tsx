"use client"

import { Button } from "@halaalvest/ui/components/button"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useMemberBackfillParams } from "@/hooks/use-member-backfill-params"
import type { MemberCollectionSourceOption } from "@/lib/members/load-members-page"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"
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
      <WorkflowPresentation
        className="overflow-hidden p-0"
        contentClassName="max-md:[&_a]:min-h-11 max-md:[&_button]:min-h-11 max-md:[&_input]:min-h-11 max-md:[_[role=combobox]]:min-h-11"
        config={getWorkflowPresentation("memberBackfill", "baselineEdit")}
        open={isOpen}
        onOpenChange={(open) => !open && closeSheet()}
      >
        <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-4">
          <MemberBackfillBaselineEditSheetHeader />
          <MemberBackfillBaselineEditContent
            canManageCollectionSources={canManageCollectionSources}
            collectionSourceOptions={collectionSourceOptions}
            isOpen={isOpen}
            member={member}
            onClose={closeSheet}
          />
        </div>
      </WorkflowPresentation>
    </>
  )
}
