"use client"

import type { ReactNode } from "react"
import {
  AlertDialogCancel,
  AlertDialogFooter,
} from "@halaalvest/ui/components/alert-dialog"
import { cn } from "@halaalvest/ui/lib/utils"

// Cancel/Action row for an `alert-dialog` workflow confirm. The action is the
// form's submit button, passed as children; Cancel closes the overlay, which
// clears the workflow's URL params through its onOpenChange.
export function WorkflowConfirmFooter({
  children,
  className,
  disabled,
}: {
  children: ReactNode
  className?: string
  disabled?: boolean
}) {
  return (
    <AlertDialogFooter className={cn("sm:col-span-full", className)}>
      <AlertDialogCancel disabled={disabled}>Cancel</AlertDialogCancel>
      {children}
    </AlertDialogFooter>
  )
}
