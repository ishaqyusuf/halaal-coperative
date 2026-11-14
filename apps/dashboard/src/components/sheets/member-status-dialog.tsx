"use client"

import { MemberSheetHeader } from "@/components/member-sheet-header"
import { MemberStatusConfirm } from "@/components/member-status-confirm"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useMemberParams } from "@/hooks/use-member-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

/**
 * Status-change confirm on the member detail page. Same URL contract as the
 * registry (`memberSheetType=status&selectedMemberId&selectedMemberStatus`).
 */
export function MemberStatusDialog() {
  const { memberSheetType, setParams } = useMemberParams()
  const isOpen = memberSheetType === "status"
  const config = getWorkflowPresentation("member", "status")

  return (
    <WorkflowPresentation
      config={config}
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          void setParams({
            memberSheetType: null,
            selectedMemberId: null,
            selectedMemberStatus: null,
          })
        }
      }}
    >
      {isOpen ? (
        <>
          <MemberSheetHeader
            presentation={config.presentation === "sheet" ? "sheet" : "dialog"}
            sheetType="status"
          />
          <MemberStatusConfirm />
        </>
      ) : null}
    </WorkflowPresentation>
  )
}
