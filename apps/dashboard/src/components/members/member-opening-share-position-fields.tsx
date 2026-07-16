"use client"

import { useMemo, useState } from "react"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@halaalvest/ui/components/field"
import { Input } from "@halaalvest/ui/components/input"
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
      <Field data-disabled={disabled ? true : undefined}>
        <FieldLabel htmlFor="member-opening-share-units">
          Share units
        </FieldLabel>
        <Input
          disabled={disabled}
          id="member-opening-share-units"
          min="0"
          name="shareUnits"
          onChange={(event) => setShareUnits(event.target.value)}
          placeholder="0"
          required
          step="1"
          type="number"
          value={shareUnits}
        />
      </Field>
      <input
        name="shareCapitalBalance"
        type="hidden"
        value={shareCapitalBalance.toFixed(2)}
      />
      <div className="flex flex-col justify-end gap-1 border-b border-border/70 pb-2">
        <FieldDescription>Calculated share capital</FieldDescription>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-base font-semibold text-foreground">
            {formatCurrency(shareCapitalBalance)}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatCurrency(unitAmount)} per share unit
          </span>
        </div>
      </div>
    </>
  )
}
