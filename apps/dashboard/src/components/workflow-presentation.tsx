"use client"

import { useEffect, useState, type ReactNode } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@halaalvest/ui/components/alert-dialog"
import { Dialog, DialogContent } from "@halaalvest/ui/components/dialog"
import { Sheet, SheetContent } from "@halaalvest/ui/components/sheet"
import { cn } from "@halaalvest/ui/lib/utils"
import type {
  WorkflowPresentationConfig,
  WorkflowPresentationWidth,
} from "@/lib/workflow-presentations"

const dialogWidthClasses: Record<WorkflowPresentationWidth, string> = {
  compact: "sm:max-w-[455px]",
  form: "sm:max-w-[640px]",
  review: "sm:max-w-[768px]",
  wide: "sm:max-w-[calc(100vw-4rem)] lg:max-w-[92rem]",
}

const mobileFullScreenDialogWidthClasses: Record<
  WorkflowPresentationWidth,
  string
> = {
  compact: "md:max-w-[455px]",
  form: "md:max-w-[640px]",
  review: "md:max-w-[768px]",
  wide: "md:max-w-[calc(100vw-4rem)] lg:max-w-[92rem]",
}

const sheetWidthClasses: Record<WorkflowPresentationWidth, string> = {
  compact: "sm:max-w-[455px]!",
  form: "sm:max-w-2xl!",
  review: "sm:max-w-3xl!",
  wide: "sm:max-w-[92rem]!",
}

export function WorkflowPresentation({
  children,
  className,
  config,
  contentClassName,
  mobileFullScreen = false,
  onOpenChange,
  open,
}: {
  children: ReactNode
  className?: string
  config: WorkflowPresentationConfig
  contentClassName?: string
  mobileFullScreen?: boolean
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  const [isDirty, setIsDirty] = useState(false)
  const [showDiscardConfirmation, setShowDiscardConfirmation] = useState(false)

  useEffect(() => {
    if (!open) {
      setIsDirty(false)
      setShowDiscardConfirmation(false)
    }
  }, [open])

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && isDirty) {
      setShowDiscardConfirmation(true)
      return
    }

    onOpenChange(nextOpen)
  }

  function discardChanges() {
    setIsDirty(false)
    setShowDiscardConfirmation(false)
    onOpenChange(false)
  }

  const content = (
    <div
      className={contentClassName}
      onChangeCapture={() => setIsDirty(true)}
      onInputCapture={() => setIsDirty(true)}
    >
      {children}
    </div>
  )

  const discardConfirmation = (
    <AlertDialog
      open={showDiscardConfirmation}
      onOpenChange={setShowDiscardConfirmation}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
          <AlertDialogDescription>
            Your changes have not been saved. Discard them and close this
            workflow?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep editing</AlertDialogCancel>
          <AlertDialogAction onClick={discardChanges} variant="destructive">
            Discard changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  if (config.presentation === "sheet") {
    return (
      <>
        <Sheet open={open} onOpenChange={handleOpenChange}>
          <SheetContent
            className={cn(
              "max-h-dvh w-full! overflow-y-auto",
              sheetWidthClasses[config.width],
              className
            )}
          >
            {content}
          </SheetContent>
        </Sheet>
        {discardConfirmation}
      </>
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className={cn(
            "max-h-[calc(100dvh-2rem)] overflow-y-auto",
            mobileFullScreen
              ? mobileFullScreenDialogWidthClasses[config.width]
              : dialogWidthClasses[config.width],
            mobileFullScreen &&
              "top-0 left-0 h-dvh max-h-dvh w-screen max-w-none translate-x-0 translate-y-0 overflow-y-auto p-0 ring-0 sm:max-w-none md:top-1/2 md:left-1/2 md:h-auto md:max-h-[calc(100dvh-2rem)] md:w-full md:-translate-x-1/2 md:-translate-y-1/2 md:p-4 md:ring-1",
            className
          )}
          role={
            config.presentation === "alert-dialog" ? "alertdialog" : undefined
          }
        >
          {content}
        </DialogContent>
      </Dialog>
      {discardConfirmation}
    </>
  )
}
