"use client"

import type { ReactNode } from "react"
import {
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@halaalvest/ui/components/alert-dialog"
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@halaalvest/ui/components/dialog"
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"
import type { WorkflowPresentation } from "@/lib/workflow-presentations"

const eyebrowClassName = "text-xs font-medium text-muted-foreground uppercase"

// Title and description parts that match the overlay a registry mode renders,
// so a sheet, dialog and alert dialog each label their own popup.
export function WorkflowPresentationHeader({
  description,
  eyebrow,
  presentation,
  title,
}: {
  description: ReactNode
  eyebrow?: string
  presentation: WorkflowPresentation
  title: ReactNode
}) {
  const eyebrowLine = eyebrow ? (
    <p className={eyebrowClassName}>{eyebrow}</p>
  ) : null

  if (presentation === "alert-dialog") {
    return (
      <AlertDialogHeader>
        {eyebrowLine}
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
    )
  }

  if (presentation === "dialog") {
    return (
      <DialogHeader>
        {eyebrowLine}
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
    )
  }

  return (
    <SheetHeader>
      {eyebrowLine}
      <SheetTitle>{title}</SheetTitle>
      <SheetDescription>{description}</SheetDescription>
    </SheetHeader>
  )
}
