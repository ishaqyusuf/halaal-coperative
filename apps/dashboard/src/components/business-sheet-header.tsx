"use client"

import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"
import { useBusinessParams } from "@/hooks/use-business-params"
import { useBusinessFormContext } from "@/components/business/form-context"

const sheetTitles = {
  create: "Record business",
  details: "Business details",
  edit: "Edit business",
  editProfit: "Edit profit entry",
  profit: "Add profit entry",
  reviewNone: "Review no business profits",
} as const

export function BusinessSheetHeader() {
  const { businessType } = useBusinessParams()
  const { business } = useBusinessFormContext()
  const title = businessType ? sheetTitles[businessType] : "Business"

  return (
    <SheetHeader>
      <SheetTitle>{title}</SheetTitle>
      <SheetDescription>
        {business?.name
          ? `${business.name} profit records are reviewed before member share profit allocation.`
          : "Business profit entries are reviewed before member share profit allocation."}
      </SheetDescription>
    </SheetHeader>
  )
}
