"use client"

import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"
import { useChargeParams } from "@/hooks/use-charge-params"

export function ChargeSheetHeader() {
  const { chargeType, chargeVersionId } = useChargeParams()
  const [title, description] =
    chargeType === "create"
      ? ["Add a charge", "A levy or fee, and its amount from a date."]
      : chargeType === "update"
        ? ["Add a new amount", "The charge's amount from a new date. Earlier amounts stay."]
        : chargeVersionId
          ? ["Fix this amount", "Change the amount or the date it started."]
          : ["Charge", "Its amounts over time."]

  return (
    <SheetHeader className="px-0">
      <SheetTitle className="text-xl">{title}</SheetTitle>
      <SheetDescription className="text-base">{description}</SheetDescription>
    </SheetHeader>
  )
}
