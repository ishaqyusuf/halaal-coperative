"use client"

import { useState, type ReactNode } from "react"
import { Button } from "@halaalvest/ui/components/button"
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"
import { cn } from "@halaalvest/ui/lib/utils"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import type { WorkflowPresentation as WorkflowPresentationType } from "@/lib/workflow-presentations"

export function MigrationActionSheet({
  bodyClassName = "px-6",
  children,
  contentClassName = "w-full overflow-y-auto sm:max-w-2xl",
  description,
  disabled,
  eyebrow,
  presentation = "dialog",
  title,
  triggerClassName,
  triggerLabel,
  variant = "outline",
}: {
  bodyClassName?: string
  children: ReactNode
  contentClassName?: string
  description: string
  disabled?: boolean
  eyebrow?: string
  presentation?: Exclude<WorkflowPresentationType, "alert-dialog">
  title: ReactNode
  triggerClassName?: string
  triggerLabel: string
  variant?: "default" | "outline"
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        className={triggerClassName}
        disabled={disabled}
        onClick={() => setOpen(true)}
        size="sm"
        type="button"
        variant={variant}
      >
        {triggerLabel}
      </Button>
      <WorkflowPresentation
        className={contentClassName}
        config={{
          presentation,
          width: contentClassName.includes("2xl") ? "review" : "form",
        }}
        open={open}
        onOpenChange={setOpen}
      >
          <SheetHeader>
            {eyebrow ? (
              <p className="text-xs font-medium text-muted-foreground uppercase">
                {eyebrow}
              </p>
            ) : null}
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          <div className={cn(bodyClassName)}>{children}</div>
      </WorkflowPresentation>
    </>
  )
}
