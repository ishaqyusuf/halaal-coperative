"use client"

import { Button } from "@halaalvest/ui/components/button"
import { useSuspenseInfiniteQuery } from "@tanstack/react-query"
import { ChevronRight } from "lucide-react"
import { useDeferredValue } from "react"
import { useActivityEntryParams } from "@/hooks/use-activity-entry-params"
import { useAuditFilterParams } from "@/hooks/use-audit-filter-params"
import { getActivityListInput } from "@/lib/reports/activity-list-input"
import { useTRPC } from "@/trpc/client"
import { formatDateAndTime } from "@/utils/format"

/**
 * The activity log as a plain list: what happened, who, when. A row opens
 * the entry's sheet. Older entries load with "Show more" (no polling).
 */
export function ActivityList() {
  const trpc = useTRPC()
  const { filters, hasFilters, setFilters } = useAuditFilterParams()
  const { setParams } = useActivityEntryParams()
  // Keep the current rows on screen while a new search or filter loads.
  const input = useDeferredValue(getActivityListInput(filters))
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(
      trpc.reports.auditEvents.infiniteQueryOptions(input, {
        getNextPageParam: ({ meta }) => meta?.cursor,
      })
    )
  const rows = data.pages.flatMap((page) => page.data)
  const total = data.pages[0]?.meta.total ?? rows.length

  if (!rows.length) {
    const filtered = hasFilters || Boolean(filters.search)

    return (
      <div className="grid justify-items-start gap-3 border-y border-border py-8">
        <p className="text-lg font-semibold">
          {filtered ? "Nothing matches" : "No activity yet"}
        </p>
        {filtered ? (
          <Button
            size="touch"
            className="text-base"
            onClick={() =>
              void setFilters({ area: null, dateRange: null, search: null })
            }
            type="button"
            variant="outline"
          >
            Clear search and filters
          </Button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      <p className="text-base text-muted-foreground">
        {total === 1 ? "1 entry" : `${total.toLocaleString("en-NG")} entries`}
        {total > rows.length
          ? `, showing the newest ${rows.length.toLocaleString("en-NG")}`
          : ""}
      </p>
      <ul className="divide-y divide-border border-y border-border">
        {rows.map((row) => (
          <li key={row.id}>
            <button
              className="flex min-h-14 w-full items-center gap-3 px-1 py-3 text-left hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:px-3"
              data-activity-row={row.id}
              onClick={() => void setParams({ activityId: row.id })}
              type="button"
            >
              <span className="grid min-w-0 flex-1 gap-0.5 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] md:items-center md:gap-4">
                <span className="min-w-0">
                  <span className="block text-base font-semibold break-words text-foreground">
                    {row.actionLabel}
                  </span>
                  <span className="hidden text-base break-words text-muted-foreground md:block">
                    {row.entityLabel}
                  </span>
                </span>
                <span className="text-base break-words text-muted-foreground md:text-foreground">
                  <span className="md:hidden">By </span>
                  {row.actorLabel}
                </span>
                <span className="text-base text-muted-foreground tabular-nums">
                  {formatDateAndTime(row.occurredAt)}
                </span>
              </span>
              <ChevronRight
                aria-hidden="true"
                className="size-5 shrink-0 text-muted-foreground"
              />
            </button>
          </li>
        ))}
      </ul>
      {hasNextPage ? (
        <Button
          className="h-12 w-full text-base sm:w-auto sm:justify-self-start"
          disabled={isFetchingNextPage}
          onClick={() => void fetchNextPage()}
          type="button"
          variant="outline"
        >
          {isFetchingNextPage ? "Loading…" : "Show more"}
        </Button>
      ) : null}
    </div>
  )
}
