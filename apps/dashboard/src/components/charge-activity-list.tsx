"use client"

import { Badge } from "@halaalvest/ui/components/badge"
import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import { Search } from "lucide-react"
import { ChargeActivityActionsMenu } from "@/components/charge-activity-actions-menu"
import { useChargeActivityQuery } from "@/hooks/use-charge-activity-query"
import { useChargesPageParams } from "@/hooks/use-charges-page-params"
import {
  formatChargeAmount,
  getChargeCorrections,
  getChargeSourceWord,
  getChargeStatusWord,
} from "@/lib/charges/charge-words"
import { memberStateToneClassNames } from "@/lib/members/member-status-words"
import { formatDayMonthYear } from "@/utils/format"

export function ChargeActivitySearch() {
  const { chargedQ, setParams } = useChargesPageParams()

  return (
    <label className="relative block w-full sm:max-w-sm">
      <span className="sr-only">Search member charges</span>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        className="h-11 pl-10 text-base"
        onChange={(event) =>
          void setParams({ chargedQ: event.target.value || null })
        }
        placeholder="Search name or charge"
        type="search"
        value={chargedQ ?? ""}
      />
    </label>
  )
}

/** Member charges, newest first: who, what, when, how much, and one status word. */
export function ChargeActivityList({
  canManageCharges,
}: {
  canManageCharges: boolean
}) {
  const { fetchNextPage, hasNextPage, hasSearch, isFetchingNextPage, rows } =
    useChargeActivityQuery()

  if (!rows.length) {
    return (
      <div className="border-y border-border py-10 text-center">
        <p className="text-lg font-semibold">
          {hasSearch ? "No charges match" : "No member charges yet"}
        </p>
        <p className="mt-1 text-base text-muted-foreground">
          {hasSearch
            ? "Try another name or charge."
            : "Charges added to members show here."}
        </p>
      </div>
    )
  }

  return (
    <div>
      <ul className="divide-y divide-border border-y border-border">
        {rows.map((row) => {
          const status = getChargeStatusWord(row.status, row.collectionMode)
          const corrections = canManageCharges
            ? getChargeCorrections(row.status, row.collectionMode)
            : []

          return (
            <li
              className="flex items-start gap-3 px-1 py-4 sm:items-center sm:gap-4 sm:px-3"
              key={row.id}
            >
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold break-words text-foreground">
                  {row.memberName}
                </p>
                <p className="mt-0.5 text-base text-muted-foreground">
                  {row.chargeName} · {formatDayMonthYear(row.assessedAt)}
                </p>
                <p className="text-base text-muted-foreground">
                  {getChargeSourceWord(row.source)}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className="text-lg font-semibold tabular-nums">
                  {formatChargeAmount(row.amount, "fixed_amount")}
                </span>
                <Badge
                  className={`text-sm ${memberStateToneClassNames[status.tone]}`}
                  variant="outline"
                >
                  {status.label}
                </Badge>
              </div>
              {corrections.length ? (
                <ChargeActivityActionsMenu
                  applicationId={row.id}
                  corrections={corrections}
                  label={`${row.chargeName} for ${row.memberName}`}
                />
              ) : canManageCharges ? (
                <span aria-hidden="true" className="w-11 shrink-0" />
              ) : null}
            </li>
          )
        })}
      </ul>
      {hasNextPage ? (
        <div className="flex justify-center pt-4">
          <Button
            className="h-11 w-full text-base sm:w-auto"
            disabled={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
            type="button"
            variant="outline"
          >
            {isFetchingNextPage ? "Loading…" : "Show more"}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
