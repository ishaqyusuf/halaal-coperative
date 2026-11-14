"use client"

import { Badge } from "@halaalvest/ui/components/badge"
import { formatCurrency } from "@halaalvest/utils"
import { useSuspenseQuery } from "@tanstack/react-query"
import { ChevronRight } from "lucide-react"
import { useProfitSeasonParams } from "@/hooks/use-profit-season-params"
import { formatDateRange, getSeasonWord } from "@/lib/business/business-words"
import { memberStateToneClassNames } from "@/lib/members/member-status-words"
import { useTRPC } from "@/trpc/client"

/** Profit-sharing seasons, newest first. A row opens the season. */
export function ProfitSeasonList() {
  const trpc = useTRPC()
  const { setParams } = useProfitSeasonParams()
  const { data: seasons } = useSuspenseQuery(
    trpc.business.seasons.queryOptions()
  )

  if (!seasons.length) {
    return (
      <div className="border-y border-border py-10 text-center">
        <p className="text-lg font-semibold">No profit to share yet</p>
        <p className="mt-1 text-base text-muted-foreground">
          Record profit on a business. It shows here by season.
        </p>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-border border-y border-border">
      {seasons.map((season) => {
        const word = getSeasonWord(season.status)

        return (
          <li key={season.id}>
            <button
              className="flex min-h-11 w-full items-center gap-3 px-1 py-4 text-left hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:gap-4 sm:px-3"
              onClick={() => void setParams({ profitSeasonId: season.id })}
              type="button"
            >
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-lg font-semibold break-words text-foreground">
                    {season.name}
                  </span>
                  <Badge
                    className={memberStateToneClassNames[word.tone]}
                    variant="outline"
                  >
                    {word.label}
                  </Badge>
                </span>
                <span className="mt-1 block text-base text-muted-foreground">
                  {formatDateRange(season.periodStart, season.periodEnd)}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-sm text-muted-foreground">
                  {season.status === "published" ? "Shared" : "To share"}
                </span>
                <span className="block text-lg font-semibold tabular-nums">
                  {formatCurrency(season.toShare)}
                </span>
              </span>
              <ChevronRight
                aria-hidden="true"
                className="size-5 shrink-0 text-muted-foreground"
              />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
