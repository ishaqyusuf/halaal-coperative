"use client"

import type { CreatedMemberSummary } from "@/components/forms/member-forms"
import { MemberBackfillStartContent } from "@/components/member-backfill-start-content"
import { MemberBackfillStartSheetHeader } from "@/components/member-backfill-start-sheet-header"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

export function MemberBackfillStartSheet({
  member,
  onLater,
  onStartBackfill,
  open,
}: {
  member: CreatedMemberSummary | null
  onLater: () => void
  onStartBackfill: () => void
  open: boolean
}) {
  if (!member) {
    return null
  }

  return (
    <WorkflowPresentation
      config={getWorkflowPresentation("memberBackfill", "start")}
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onLater()
        }
      }}
    >
        <MemberBackfillStartSheetHeader />
        <MemberBackfillStartContent
          member={member}
          onLater={onLater}
          onStartBackfill={onStartBackfill}
        />
    </WorkflowPresentation>
  )
}
