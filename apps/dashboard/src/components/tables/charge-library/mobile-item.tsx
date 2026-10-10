"use client"

import { Badge } from "@halaalvest/ui/components/badge"
import { Button } from "@halaalvest/ui/components/button"
import { Item, ItemActions, ItemContent, ItemDescription, ItemHeader, ItemTitle } from "@halaalvest/ui/components/item"
import { formatCurrency } from "@halaalvest/utils"
import { CalendarPlus, MoreHorizontal, Power } from "lucide-react"
import { useState } from "react"
import { MobileActionsDrawer } from "@/components/tables/core/mobile-actions-drawer"
import { useChargeOperationParams } from "@/hooks/use-charge-operation-params"
import type { ChargeLibraryRow } from "./data-table"

function amountLabel(row: ChargeLibraryRow) {
  return row.chargeValueType === "percentage" ? `${row.amount}%` : formatCurrency(row.amount)
}

export function ChargeLibraryMobileItem({ canManageCharges, row }: { canManageCharges: boolean; row: ChargeLibraryRow }) {
  const [open, setOpen] = useState(false)
  const { setParams } = useChargeOperationParams()

  function openOperation(type: "toggle" | "version") {
    setOpen(false)
    void setParams({
      chargeApplicationId: null,
      chargeDefinitionId: row.id,
      chargeIsActive: type === "toggle" ? (row.isActive ? "false" : "true") : null,
      chargeKind: type === "version" ? row.kind : null,
      chargeOperationSheetType: type,
      chargeValueType: type === "version" ? row.chargeValueType : null,
    })
  }

  return (
    <>
      <Item className="gap-3 border-0 bg-transparent px-0 py-4">
        <ItemHeader>
          <ItemContent className="min-w-0">
            <ItemTitle className="max-w-full text-sm"><span className="truncate">{row.name}</span></ItemTitle>
            <ItemDescription className="truncate">{row.code} · {amountLabel(row)}</ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button aria-label={`Open actions for ${row.name}`} className="size-11" onClick={() => setOpen(true)} size="icon-lg" type="button" variant="ghost">
              <MoreHorizontal />
            </Button>
          </ItemActions>
        </ItemHeader>
        <ItemContent className="min-w-0 basis-full">
          <div className="flex flex-wrap gap-2">
            <Badge variant={row.isActive ? "default" : "secondary"}>{row.isActive ? "Active" : "Inactive"}</Badge>
            {row.isMonthlyLevy ? <Badge variant="outline">Monthly levy</Badge> : null}
            <Badge className="capitalize" variant="outline">{row.chargeFrequency.replaceAll("_", " ")}</Badge>
          </div>
          <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs">
            <dt className="text-muted-foreground">Value type</dt><dd className="truncate text-right capitalize">{row.chargeValueType.replaceAll("_", " ")}</dd>
            <dt className="text-muted-foreground">Effective from</dt><dd className="truncate text-right">{row.currentEffectiveFrom ?? "No dated version"}</dd>
            <dt className="text-muted-foreground">History</dt><dd className="text-right">{row.versions.length} dated updates</dd>
          </dl>
        </ItemContent>
      </Item>

      <MobileActionsDrawer description="Review dated history or update this charge definition." onOpenChange={setOpen} open={open} title={row.name}>
        <div className="divide-y divide-border border-y border-border">
          {row.versions.map((version) => (
            <div className="flex items-start justify-between gap-4 py-3" key={version.id}>
              <div className="min-w-0"><p className="text-sm font-medium">{version.effectiveFrom}</p><p className="truncate text-xs text-muted-foreground">{version.notes ?? "No note"}</p></div>
              <div className="text-right"><p className="text-sm font-medium">{row.chargeValueType === "percentage" ? `${version.amount}%` : formatCurrency(version.amount)}</p><p className="text-xs capitalize text-muted-foreground">{version.status}</p></div>
            </div>
          ))}
        </div>
        {canManageCharges ? (
          <div className="mt-4 space-y-2">
            <Button className="h-11 w-full justify-start" onClick={() => openOperation("version")} variant="ghost"><CalendarPlus data-icon="inline-start" /> Add dated update</Button>
            <Button className="h-11 w-full justify-start" onClick={() => openOperation("toggle")} variant="ghost"><Power data-icon="inline-start" /> {row.isActive ? "Deactivate" : "Activate"} charge</Button>
          </div>
        ) : null}
      </MobileActionsDrawer>
    </>
  )
}
