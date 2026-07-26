"use client"

import type { ReactNode } from "react"
import { Button } from "@halaalvest/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@halaalvest/ui/components/dialog"
import { useMemberBackfillParams } from "@/hooks/use-member-backfill-params"

export function MemberBackfillActionModal({
  children,
  description,
  disabled,
  modalId,
  title,
  triggerLabel,
  variant = "outline",
}: {
  children: ReactNode
  description: string
  disabled?: boolean
  modalId: string
  title: string
  triggerLabel: string
  variant?: "default" | "outline"
}) {
  const { memberBackfillSheetType, setParams } = useMemberBackfillParams()
  const isOpen = memberBackfillSheetType === modalId

  function openModal() {
    void setParams({ memberBackfillSheetType: modalId })
  }

  function closeModal() {
    void setParams({ memberBackfillSheetType: null })
  }

  return (
    <>
      <Button
        disabled={disabled}
        onClick={openModal}
        type="button"
        variant={variant}
      >
        {triggerLabel}
      </Button>
      <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    </>
  )
}
