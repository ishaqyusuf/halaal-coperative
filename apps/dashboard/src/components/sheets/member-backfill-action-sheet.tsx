"use client"

import type { ReactNode } from "react"
import { Button } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { WorkflowPresentationHeader } from "@/components/workflow-presentation-header"
import {
  type MemberBackfillSheetType,
  useMemberBackfillParams,
} from "@/hooks/use-member-backfill-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

export function MemberBackfillActionSheet({
  children,
  description,
  disabled,
  mode,
  targetId = null,
  title,
  triggerLabel,
  variant = "outline",
}: {
  children: ReactNode
  description: string
  disabled?: boolean
  mode: Exclude<MemberBackfillSheetType, "adjustment" | "missedMonths">
  targetId?: string | null
  title: string
  triggerLabel: string
  variant?: "default" | "outline"
}) {
  const { memberBackfillSheetType, memberBackfillTargetId, setParams } =
    useMemberBackfillParams()
  const config = getWorkflowPresentation("memberBackfill", mode)
  const isOpen =
    memberBackfillSheetType === mode && memberBackfillTargetId === targetId

  function openSheet() {
    void setParams({
      memberBackfillSheetType: mode,
      memberBackfillTargetId: targetId,
    })
  }

  function closeSheet() {
    void setParams({
      memberBackfillSheetType: null,
      memberBackfillTargetId: null,
    })
  }

  return (
    <>
      <Button
        disabled={disabled}
        onClick={openSheet}
        size="sm"
        type="button"
        variant={variant}
      >
        {triggerLabel}
      </Button>
      <WorkflowPresentation
        contentClassName={cn(
          "max-md:[&_a]:min-h-11 max-md:[&_button]:min-h-11 max-md:[&_input]:min-h-11 max-md:[_[role=combobox]]:min-h-11",
          config.presentation !== "sheet" && "grid gap-4"
        )}
        config={config}
        open={isOpen}
        onOpenChange={(open) => !open && closeSheet()}
      >
        <WorkflowPresentationHeader
          description={description}
          presentation={config.presentation}
          title={title}
        />
        <div className={config.presentation === "sheet" ? "px-6 pb-6" : ""}>
          {children}
        </div>
      </WorkflowPresentation>
    </>
  )
}
