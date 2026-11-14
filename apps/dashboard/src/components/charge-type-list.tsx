"use client"

import { Badge } from "@halaalvest/ui/components/badge"
import { ChevronRight } from "lucide-react"
import { useChargeOperationParams } from "@/hooks/use-charge-operation-params"
import { useChargeTypesQuery } from "@/hooks/use-charge-types-query"
import {
  formatChargeAmount,
  getChargeAppliesToWords,
  getChargeFrequencyWord,
} from "@/lib/charges/charge-words"
import { memberStateToneClassNames } from "@/lib/members/member-status-words"

/** Charge types: one tappable row each, the same on phone and desktop. */
export function ChargeTypeList({
  canManageCharges,
}: {
  canManageCharges: boolean
}) {
  const chargeTypes = useChargeTypesQuery()
  const { setParams } = useChargeOperationParams()

  if (!chargeTypes.length) {
    return (
      <div className="border-y border-border py-10 text-center">
        <p className="text-lg font-semibold">No charges yet</p>
        <p className="mt-1 text-base text-muted-foreground">
          {canManageCharges
            ? "Add the levies and fees your cooperative takes."
            : "Charges your cooperative takes will show here."}
        </p>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-border border-y border-border">
      {chargeTypes.map((charge) => (
        <li key={charge.id}>
          <button
            className="flex min-h-11 w-full items-center gap-3 px-1 py-4 text-left hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:gap-4 sm:px-3"
            onClick={() =>
              void setParams({
                chargeApplicationId: null,
                chargeDefinitionId: charge.id,
                chargeOperationSheetType: "details",
              })
            }
            type="button"
          >
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-lg font-semibold break-words text-foreground">
                  {charge.name}
                </span>
                {charge.isActive ? null : (
                  <Badge
                    className={memberStateToneClassNames.muted}
                    variant="outline"
                  >
                    Off
                  </Badge>
                )}
              </span>
              <span className="mt-1 block text-base text-muted-foreground">
                {getChargeFrequencyWord(charge.chargeFrequency)} ·{" "}
                {getChargeAppliesToWords(charge.appliesTo ?? [])}
              </span>
            </span>
            <span className="shrink-0 text-right text-lg font-semibold tabular-nums">
              {formatChargeAmount(charge.amount, charge.chargeValueType)}
            </span>
            <ChevronRight
              aria-hidden="true"
              className="size-5 shrink-0 text-muted-foreground"
            />
          </button>
        </li>
      ))}
    </ul>
  )
}
