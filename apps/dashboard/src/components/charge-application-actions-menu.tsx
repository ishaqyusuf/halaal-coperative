"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@halaalvest/ui/components/dropdown-menu"
import { Ban, Banknote, MoreHorizontal, RotateCcw } from "lucide-react"
import { useChargeOperationParams } from "@/hooks/use-charge-operation-params"

export function ChargeApplicationActionsMenu({
  applicationId,
  collectionMode,
  memberName,
  status,
}: {
  applicationId: string
  collectionMode: string
  memberName: string
  status: string
}) {
  const { setParams } = useChargeOperationParams()
  const canSettle = status === "pending" && collectionMode === "pay_separately"

  function open(type: "reverse" | "settle" | "waive") {
    void setParams({
      chargeApplicationId: applicationId,
      chargeDefinitionId: null,
      chargeIsActive: null,
      chargeKind: null,
      chargeOperationSheetType: type,
      chargeValueType: null,
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`Open charge actions for ${memberName}`}
            className="size-9"
            size="icon"
            type="button"
            variant="ghost"
          />
        }
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {canSettle ? (
          <DropdownMenuItem onClick={() => open("settle")}>
            <Banknote />
            Record payment
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onClick={() => open("waive")}>
          <Ban />
          Waive charge
        </DropdownMenuItem>
        {status === "posted" ? (
          <DropdownMenuItem onClick={() => open("reverse")}>
            <RotateCcw />
            Reverse charge
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
