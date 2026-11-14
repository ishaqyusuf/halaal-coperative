"use client"

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
import type { ReactNode } from "react"

/**
 * A money or decision confirm opened from inside a form (charge a member,
 * approve a share request). The backdrop never closes it; Cancel returns to
 * the form with its values kept.
 */
export function ConfirmActionDialog({
  actionLabel,
  children,
  confirmDisabled = false,
  description,
  destructive = false,
  onCancel,
  onConfirm,
  open,
  pending,
  title,
}: {
  actionLabel: string
  /** Short facts shown between the description and the buttons. */
  children?: ReactNode
  /** For example while a required reason is empty. */
  confirmDisabled?: boolean
  description: string
  destructive?: boolean
  onCancel: () => void
  onConfirm: () => void
  open: boolean
  pending: boolean
  title: string
}) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && !pending && onCancel()}
    >
      <AlertDialogContent className="data-[size=default]:max-w-[calc(100%-2rem)] data-[size=default]:sm:max-w-[455px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-semibold">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base text-foreground/80">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11 text-base" disabled={pending}>
            Go back
          </AlertDialogCancel>
          <AlertDialogAction
            className="h-11 text-base"
            disabled={pending || confirmDisabled}
            onClick={onConfirm}
            variant={destructive ? "destructive" : "default"}
          >
            {pending ? "Saving…" : actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
