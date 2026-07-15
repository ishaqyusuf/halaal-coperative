"use client"

import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"
import { useChargeParams } from "@/hooks/use-charge-params"

export function ChargeSheetHeader() {
  const { chargeType } = useChargeParams()

  const title =
    chargeType === "create"
      ? "Create charge"
      : chargeType === "update"
        ? "Add charge update"
        : "Edit charge update"

  return (
    <SheetHeader>
      <SheetTitle>{title}</SheetTitle>
      <SheetDescription>
        Charge schedules are dated migration inputs. Once member backfill
        starts, this history is locked for ledger accuracy.
      </SheetDescription>
    </SheetHeader>
  )
}
