"use client"

import { useSuspenseQuery } from "@tanstack/react-query"
import { SummaryCard } from "@/components/summary-card"
import { useNotificationsFilterParams } from "@/hooks/use-notifications-filter-params"
import { emailStatusWords } from "@/lib/notifications/email-labels"
import { useTRPC } from "@/trpc/client"

/** Sent, waiting and not delivered totals; tapping one filters the list. */
export function NotificationSummary() {
  const trpc = useTRPC()
  const { data } = useSuspenseQuery(trpc.notifications.summary.queryOptions())
  const { filters, setFilters } = useNotificationsFilterParams()

  const toggle = (status: "failed" | "queued" | "sent") =>
    setFilters({ status: filters.status === status ? null : status })

  return (
    <section
      aria-label="Email totals"
      className="grid grid-cols-3 gap-2 sm:gap-3"
    >
      <SummaryCard
        compact
        detail="Show only sent emails"
        label={emailStatusWords.sent}
        onClick={() => toggle("sent")}
        selected={filters.status === "sent"}
        tone="good"
        value={data.sent.toLocaleString("en-NG")}
      />
      <SummaryCard
        compact
        detail="Show emails not sent yet"
        label={emailStatusWords.queued}
        onClick={() => toggle("queued")}
        selected={filters.status === "queued"}
        value={data.queued.toLocaleString("en-NG")}
      />
      <SummaryCard
        compact
        detail="Show emails that did not arrive"
        label={emailStatusWords.failed}
        onClick={() => toggle("failed")}
        selected={filters.status === "failed"}
        tone={data.failed > 0 ? "attention" : "default"}
        value={data.failed.toLocaleString("en-NG")}
      />
    </section>
  )
}
