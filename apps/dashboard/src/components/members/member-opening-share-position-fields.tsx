"use client"

import { useMemo, useState } from "react"
import { formatCurrency } from "@halaalvest/utils"
import { calculateOpeningShareCapitalFromUnits } from "@/lib/members/member-opening-position"

export function MemberOpeningSharePositionFields({
  disabled,
  unitAmount,
}: {
  disabled?: boolean
  unitAmount: number
}) {
  const [shareUnits, setShareUnits] = useState("")
  const shareCapitalBalance = useMemo(() => {
    const units = Number(shareUnits)
    return calculateOpeningShareCapitalFromUnits({
      shareUnits: units,
      unitAmount,
    })
  }, [shareUnits, unitAmount])

  return (
    <>
      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
        Share units
        <input
          className="h-9 border border-border bg-background px-3 text-sm text-foreground"
          disabled={disabled}
          min="0"
          name="shareUnits"
          onChange={(event) => setShareUnits(event.target.value)}
          placeholder="0"
          required
          step="1"
          type="number"
          value={shareUnits}
        />
      </label>
      <input
        name="shareCapitalBalance"
        type="hidden"
        value={shareCapitalBalance.toFixed(2)}
      />
      <div className="border border-border/70 bg-muted/20 p-3">
        <p className="text-xs text-muted-foreground">Calculated share capital</p>
        <p className="mt-1 text-sm font-semibold text-foreground">
          {formatCurrency(shareCapitalBalance)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatCurrency(unitAmount)} per share unit
        </p>
      </div>
    </>
  )
}
