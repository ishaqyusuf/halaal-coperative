"use client"

import { Button } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import { useSuspenseInfiniteQuery } from "@tanstack/react-query"
import { useDeferredValue, useMemo } from "react"
import {
  getNotificationDeliveryInput,
  useNotificationsFilterParams,
} from "@/hooks/use-notifications-filter-params"
import {
  type EmailDeliveryStatus,
  emailStatusWords,
  getEmailLabel,
} from "@/lib/notifications/email-labels"
import { useTRPC } from "@/trpc/client"
import { formatDayMonthYear } from "@/utils/format"

const statusClassName: Record<EmailDeliveryStatus, string> = {
  failed:
    "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-100",
  queued:
    "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100",
  sent: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100",
}

/** Newest emails first, as one readable list on every screen size. */
export function NotificationList({
  showRecipient,
}: {
  showRecipient: boolean
}) {
  const trpc = useTRPC()
  const { filters, hasFilters, setFilters } = useNotificationsFilterParams()
  const search = useDeferredValue(filters.search)
  const input = useMemo(
    () => getNotificationDeliveryInput({ search, status: filters.status }),
    [filters.status, search]
  )
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(
      trpc.notifications.deliveryHistory.infiniteQueryOptions(input, {
        getNextPageParam: ({ meta }) => meta?.cursor,
      })
    )
  const rows = data.pages.flatMap((page) => page.data)

  if (rows.length === 0) {
    return (
      <div className="rounded-(--ui-radius-surface) border border-border bg-card p-6 text-center">
        <p className="text-lg font-medium text-foreground">
          {hasFilters || filters.search ? "No emails match" : "No emails yet"}
        </p>
        <p className="mt-1 text-base text-muted-foreground">
          {hasFilters || filters.search
            ? "Try another search or show all emails."
            : "Emails about payments, loans and requests will show here."}
        </p>
        {hasFilters || filters.search ? (
          <Button
            className="mt-4"
            onClick={() =>
              setFilters({ search: null, status: null, type: null })
            }
            variant="outline"
          >
            Show all emails
          </Button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="divide-y divide-border rounded-(--ui-radius-surface) border border-border bg-card">
        {rows.map((row) => (
          <li
            className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
            key={row.id}
          >
            <div className="min-w-0">
              <p className="text-base font-medium text-foreground">
                {getEmailLabel(row.notificationType)}
              </p>
              <p className="mt-0.5 text-base break-words text-muted-foreground">
                {showRecipient ? `To ${row.recipient} · ` : null}
                {formatDayMonthYear(row.occurredAt)}
              </p>
            </div>
            <span
              className={cn(
                "inline-flex h-8 w-fit shrink-0 items-center rounded-full border px-3 text-sm font-medium",
                statusClassName[row.status]
              )}
            >
              {emailStatusWords[row.status]}
            </span>
          </li>
        ))}
      </ul>
      {hasNextPage ? (
        <Button
          className="self-center"
          disabled={isFetchingNextPage}
          onClick={() => fetchNextPage()}
          variant="outline"
        >
          {isFetchingNextPage ? "Loading…" : "Show more"}
        </Button>
      ) : null}
    </div>
  )
}

export function NotificationListSkeleton() {
  return (
    <ul
      aria-label="Loading emails"
      className="divide-y divide-border rounded-(--ui-radius-surface) border border-border bg-card"
    >
      {Array.from({ length: 5 }, (_, index) => (
        <li className="flex animate-pulse flex-col gap-2 px-5 py-4" key={index}>
          <span className="h-5 w-48 rounded bg-muted" />
          <span className="h-5 w-64 rounded bg-muted" />
        </li>
      ))}
    </ul>
  )
}
