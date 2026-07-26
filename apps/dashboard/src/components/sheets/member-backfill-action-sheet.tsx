"use client"

import type { ReactNode } from "react"
import { Button } from "@halaalvest/ui/components/button"
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useMemberBackfillParams } from "@/hooks/use-member-backfill-params"
import type { WorkflowPresentation as WorkflowPresentationType } from "@/lib/workflow-presentations"

export function MemberBackfillActionSheet({
  children,
  description,
  disabled,
  presentation = "dialog",
  sheetId,
  size = "default",
  title,
  triggerLabel,
  variant = "outline",
}: {
  children: ReactNode
  description: string
  disabled?: boolean
  presentation?: Exclude<WorkflowPresentationType, "alert-dialog">
  sheetId: string
  size?: "default" | "wide"
  title: string
  triggerLabel: string
  variant?: "default" | "outline"
}) {
  const { memberBackfillSheetType, setParams } = useMemberBackfillParams()
  const isOpen = memberBackfillSheetType === sheetId

  function openSheet() {
    void setParams({ memberBackfillSheetType: sheetId })
  }

  function closeSheet() {
    void setParams({ memberBackfillSheetType: null })
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
        config={{
          presentation,
          width: size === "wide" ? "wide" : "form",
        }}
        open={isOpen}
        onOpenChange={(open) => !open && closeSheet()}
      >
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          <div className="px-6 pb-6">{children}</div>
      </WorkflowPresentation>
    </>
  )
}
