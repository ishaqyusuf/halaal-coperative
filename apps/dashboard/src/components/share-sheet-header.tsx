"use client"

import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"
import { useShareParams } from "@/hooks/use-share-params"

export function ShareSheetHeader() {
  const { shareType } = useShareParams()
  const isCreate = shareType === "create"
  const isPolicy = shareType === "policy"

  return (
    <SheetHeader>
      <SheetTitle>
        {isPolicy
          ? "Edit share model"
          : isCreate
            ? "Create share rule"
            : "Edit share rule"}
      </SheetTitle>
      <SheetDescription>
        {isPolicy
          ? "Choose whether this cooperative uses monthly share history or unit-based shareholding."
          : isCreate
            ? "Add a dated fixed or percentage share capital rule for historical migration."
            : "Update the dated share rule used by historical member ledger generation."}
      </SheetDescription>
    </SheetHeader>
  )
}
