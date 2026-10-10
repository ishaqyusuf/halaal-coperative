"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@halaalvest/ui/components/dropdown-menu"
import { formatCurrency } from "@halaalvest/utils"
import {
  CalendarClock,
  CalendarPlus,
  MoreHorizontal,
  Power,
} from "lucide-react"
import { useChargeOperationParams } from "@/hooks/use-charge-operation-params"
import type { ChargeLibraryRow } from "./data-table"

export function ChargeLibraryActionsMenu({
  canManageCharges,
  row,
}: {
  canManageCharges: boolean
  row: ChargeLibraryRow
}) {
  const { setParams } = useChargeOperationParams()

  function open(type: "toggle" | "version") {
    void setParams({
      chargeApplicationId: null,
      chargeDefinitionId: row.id,
      chargeIsActive:
        type === "toggle" ? (row.isActive ? "false" : "true") : null,
      chargeKind: type === "version" ? row.kind : null,
      chargeOperationSheetType: type,
      chargeValueType: type === "version" ? row.chargeValueType : null,
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`Open actions for ${row.name}`}
            className="size-8"
            size="icon"
            type="button"
            variant="ghost"
          />
        }
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <CalendarClock />
            View dated history
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent className="max-h-72 w-72 overflow-y-auto">
              {row.versions.length ? (
                row.versions.map((version) => (
                  <DropdownMenuItem disabled key={version.id}>
                    <span className="flex w-full items-center justify-between gap-3">
                      <span>{version.effectiveFrom}</span>
                      <span className="font-medium">
                        {row.chargeValueType === "percentage"
                          ? `${version.amount}%`
                          : formatCurrency(version.amount)}
                      </span>
                    </span>
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled>No dated updates</DropdownMenuItem>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
        {canManageCharges ? (
          <>
            <DropdownMenuItem onClick={() => open("version")}>
              <CalendarPlus />
              Add dated update
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => open("toggle")}>
              <Power />
              {row.isActive ? "Deactivate" : "Activate"} charge
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
