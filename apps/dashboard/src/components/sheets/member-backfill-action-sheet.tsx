"use client"

import type { ReactNode } from "react"
import { Button } from "@halaalvest/ui/components/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"
import { useMemberBackfillParams } from "@/hooks/use-member-backfill-params"

export function MemberBackfillActionSheet({
  children,
  description,
  disabled,
  sheetId,
  title,
  triggerLabel,
  variant = "outline",
}: {
  children: ReactNode
  description: string
  disabled?: boolean
  sheetId: string
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
      <Sheet open={isOpen} onOpenChange={(open) => !open && closeSheet()}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          <div className="px-6 pb-6">{children}</div>
        </SheetContent>
      </Sheet>
    </>
  )
}
