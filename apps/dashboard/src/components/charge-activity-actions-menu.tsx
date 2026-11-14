"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@halaalvest/ui/components/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import { useChargeOperationParams } from "@/hooks/use-charge-operation-params"
import type { ChargeCorrection } from "@/lib/charges/charge-words"

const correctionLabels: Record<ChargeCorrection, string> = {
  reverse: "Undo charge (a mistake)",
  settle: "Record payment",
  waive: "Waive charge",
}

export function ChargeActivityActionsMenu({
  applicationId,
  corrections,
  label,
}: {
  applicationId: string
  corrections: ChargeCorrection[]
  label: string
}) {
  const { setParams } = useChargeOperationParams()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`Actions for ${label}`}
            className="size-11"
            size="icon"
            type="button"
            variant="ghost"
          />
        }
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        {corrections.map((correction) => (
          <DropdownMenuItem
            className="min-h-11 text-base"
            key={correction}
            onClick={() =>
              void setParams({
                chargeApplicationId: applicationId,
                chargeDefinitionId: null,
                chargeOperationSheetType: correction,
              })
            }
            variant={correction === "settle" ? "default" : "destructive"}
          >
            {correctionLabels[correction]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
