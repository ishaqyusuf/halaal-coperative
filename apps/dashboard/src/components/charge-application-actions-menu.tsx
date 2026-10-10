"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@halaalvest/ui/components/dropdown-menu"
import { Ban, MoreHorizontal, RotateCcw } from "lucide-react"
import { useChargeOperationParams } from "@/hooks/use-charge-operation-params"

export function ChargeApplicationActionsMenu({
  applicationId,
  memberName,
}: {
  applicationId: string
  memberName: string
}) {
  const { setParams } = useChargeOperationParams()

  function open(type: "reverse" | "waive") {
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
        <DropdownMenuItem onClick={() => open("waive")}>
          <Ban />
          Waive charge
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => open("reverse")}>
          <RotateCcw />
          Reverse charge
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
