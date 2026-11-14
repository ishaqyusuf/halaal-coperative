"use client"

import { SheetHeader, SheetTitle } from "@halaalvest/ui/components/sheet"
import { useBusinessFormContext } from "@/components/business/form-context"
import { useBusinessParams } from "@/hooks/use-business-params"

const sheetTitles = {
  create: "Add a business",
  details: "Business",
  edit: "Edit business",
  editProfit: "Change profit",
  profit: "Record profit",
  reviewNone: "No businesses to bring in",
} as const

/** The business name on its own sheet; a plain action name on forms. */
export function BusinessSheetHeader() {
  const { businessType } = useBusinessParams()
  const { business } = useBusinessFormContext()
  const title =
    businessType === "details" && business
      ? business.name
      : businessType
        ? sheetTitles[businessType]
        : "Business"

  return (
    <SheetHeader className="px-0">
      <SheetTitle className="text-2xl font-semibold">{title}</SheetTitle>
      {business && businessType !== "details" && businessType !== "create" ? (
        <p className="text-base text-muted-foreground">{business.name}</p>
      ) : null}
    </SheetHeader>
  )
}
