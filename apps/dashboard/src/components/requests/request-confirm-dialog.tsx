"use client"

import type { ReactNode } from "react"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@halaalvest/ui/components/alert-dialog"
import { Button } from "@halaalvest/ui/components/button"
import { RequestFacts, type RequestFact } from "./request-facts"

/**
 * The confirm for every money or decline step on request pages: a real
 * AlertDialog (the backdrop never dismisses it). It may hold one reason field
 * as children; it never wraps a form.
 */
export function RequestConfirmDialog({
  children,
  confirmLabel,
  description,
  destructive = false,
  disabled = false,
  facts = [],
  onConfirm,
  onOpenChange,
  open,
  pending,
  title,
}: {
  children?: ReactNode
  confirmLabel: string
  description?: string
  destructive?: boolean
  disabled?: boolean
  facts?: RequestFact[]
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
  open: boolean
  pending: boolean
  title: string
}) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next)
      }}
    >
      <AlertDialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto data-[size=default]:max-w-[calc(100%-2rem)] data-[size=default]:sm:max-w-[480px]">
        <AlertDialogHeader className="place-items-start text-left">
          <AlertDialogTitle className="text-xl font-semibold">
            {title}
          </AlertDialogTitle>
          {description ? (
            <AlertDialogDescription className="text-base">
              {description}
            </AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        {facts.length ? <RequestFacts items={facts} /> : null}
        {children}
        <AlertDialogFooter className="[&_button]:h-12">
          <AlertDialogCancel disabled={pending}>Go back</AlertDialogCancel>
          <Button
            disabled={pending || disabled}
            onClick={onConfirm}
            type="button"
            variant={destructive ? "destructive" : "default"}
          >
            {pending ? "Saving..." : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
