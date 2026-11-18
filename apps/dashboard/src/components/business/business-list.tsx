"use client"

import { Badge } from "@halaalvest/ui/components/badge"
import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import { cn } from "@halaalvest/ui/lib/utils"
import { formatCurrency } from "@halaalvest/utils"
import { ChevronRight, Search } from "lucide-react"
import { useBusinessListQuery } from "@/hooks/use-business-list-query"
import { useBusinessPageParams } from "@/hooks/use-business-page-params"
import { useBusinessParams } from "@/hooks/use-business-params"
import {
  businessStatusOptions,
  formatBusinessDates,
  getBusinessStatusWord,
} from "@/lib/business/business-words"
import { memberStateToneClassNames } from "@/lib/members/member-status-words"

export function BusinessSearch() {
  const { q, setParams } = useBusinessPageParams()

  return (
    <label className="relative block w-full sm:max-w-sm">
      <span className="sr-only">Search businesses</span>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        className="h-11 pl-10 text-base"
        onChange={(event) => void setParams({ q: event.target.value || null })}
        placeholder="Search businesses"
        type="search"
        value={q ?? ""}
      />
    </label>
  )
}

/** All, Running, Not started, Finished, Archived. */
export function BusinessStatusFilter() {
  const { setParams, status } = useBusinessPageParams()
  const options = [{ label: "All", value: null }, ...businessStatusOptions]

  return (
    <div aria-label="Show" className="flex flex-wrap gap-2" role="group">
      {options.map((option) => {
        const selected = option.value === status

        return (
          <Button
            size="touch"
            aria-pressed={selected}
            className={cn(
              "rounded-full px-4 text-base",
              selected &&
                "border-foreground bg-foreground text-background hover:bg-foreground/90 hover:text-background"
            )}
            key={option.label}
            onClick={() => void setParams({ status: option.value })}
            type="button"
            variant="outline"
          >
            {option.label}
          </Button>
        )
      })}
    </div>
  )
}

/** One tappable row per business, the same on phone and desktop. */
export function BusinessList({ canRecord }: { canRecord: boolean }) {
  const { fetchNextPage, hasFilters, hasNextPage, isFetchingNextPage, rows } =
    useBusinessListQuery()
  const { setParams } = useBusinessParams()

  if (!rows.length) {
    return (
      <div className="border-y border-border py-10 text-center">
        <p className="text-lg font-semibold">
          {hasFilters ? "No businesses match" : "No businesses yet"}
        </p>
        <p className="mt-1 text-base text-muted-foreground">
          {hasFilters
            ? "Try another name or show all."
            : canRecord
              ? "Add the businesses your cooperative runs."
              : "Businesses your cooperative runs will show here."}
        </p>
      </div>
    )
  }

  return (
    <div>
      <ul className="divide-y divide-border border-y border-border">
        {rows.map((business) => {
          const word = getBusinessStatusWord(business.status)

          return (
            <li key={business.id}>
              <button
                className="flex min-h-11 w-full items-center gap-3 px-1 py-4 text-left hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:gap-4 sm:px-3"
                onClick={() =>
                  void setParams({
                    businessId: business.id,
                    businessType: "details",
                    profitEntryId: null,
                  })
                }
                type="button"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-lg font-semibold break-words text-foreground">
                      {business.name}
                    </span>
                    <Badge
                      className={memberStateToneClassNames[word.tone]}
                      variant="outline"
                    >
                      {word.label}
                    </Badge>
                    {business.isAutomatic ? (
                      <Badge variant="outline">Added automatically</Badge>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-base text-muted-foreground">
                    {formatBusinessDates(business.startDate, business.endDate)}
                  </span>
                  <span className="mt-2 grid gap-1 text-base sm:hidden">
                    <span>
                      <span className="text-muted-foreground">
                        Money put in{" "}
                      </span>
                      <span className="font-medium tabular-nums">
                        {formatCurrency(business.capitalAmount)}
                      </span>
                    </span>
                    <span>
                      <span className="text-muted-foreground">
                        Profit so far{" "}
                      </span>
                      <span className="font-medium tabular-nums">
                        {formatCurrency(business.profitTotal)}
                      </span>
                    </span>
                  </span>
                </span>
                <span className="hidden w-44 shrink-0 text-right sm:block">
                  <span className="block text-sm text-muted-foreground">
                    Money put in
                  </span>
                  <span className="block text-lg font-semibold tabular-nums">
                    {formatCurrency(business.capitalAmount)}
                  </span>
                </span>
                <span className="hidden w-44 shrink-0 text-right sm:block">
                  <span className="block text-sm text-muted-foreground">
                    Profit so far
                  </span>
                  <span className="block text-lg font-semibold tabular-nums">
                    {formatCurrency(business.profitTotal)}
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
      {hasNextPage ? (
        <div className="flex justify-center pt-4">
          <Button
            size="touch"
            className="text-base"
            disabled={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
            type="button"
            variant="outline"
          >
            {isFetchingNextPage ? "Loading..." : "Show more"}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
