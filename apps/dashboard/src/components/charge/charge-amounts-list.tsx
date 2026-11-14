"use client"

import { Button } from "@halaalvest/ui/components/button"
import { ChevronRight } from "lucide-react"
import type { Charge } from "@/components/charge/charge-types"
import {
  formatChargeAmount,
  getChargeFrequencyWord,
} from "@/lib/charges/charge-words"
import { formatDayMonthYear } from "@/utils/format"

const statusWords = {
  current: "Now",
  historical: "Before",
  scheduled: "Starts later",
} as const

/** A charge's amounts over time, newest first. Tap one to fix it. */
export function ChargeAmountsList({
  charge,
  isLocked,
  onAdd,
  onPick,
}: {
  charge: Charge
  isLocked: boolean
  onAdd: () => void
  onPick: (versionId: string) => void
}) {
  const versions = [...charge.versions].reverse()

  return (
    <div className="grid gap-5">
      <p className="text-base text-muted-foreground">
        {charge.name} · {getChargeFrequencyWord(charge.chargeFrequency)}
      </p>
      <ul className="divide-y divide-border border-y border-border">
        {versions.map((version) => {
          const body = (
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-semibold tabular-nums">
                {formatChargeAmount(version.amount, version.chargeValueType)}
              </span>
              <span className="mt-1 block text-base text-muted-foreground">
                From {formatDayMonthYear(version.effectiveFrom)} ·{" "}
                {statusWords[version.status]}
              </span>
            </span>
          )

          return (
            <li key={version.id}>
              {isLocked ? (
                <div className="flex items-center gap-3 py-4">{body}</div>
              ) : (
                <button
                  className="flex min-h-11 w-full items-center gap-3 py-4 text-left hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                  onClick={() => onPick(version.id)}
                  type="button"
                >
                  {body}
                  <ChevronRight
                    aria-hidden="true"
                    className="size-5 shrink-0 text-muted-foreground"
                  />
                </button>
              )}
            </li>
          )
        })}
      </ul>
      {isLocked ? (
        <p className="text-base text-muted-foreground">
          Past amounts can’t change any more.
        </p>
      ) : (
        <Button className="h-12 w-full sm:w-auto" onClick={onAdd} type="button">
          Add a new amount
        </Button>
      )}
    </div>
  )
}
