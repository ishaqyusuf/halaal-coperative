"use client"

import { Badge } from "@halaalvest/ui/components/badge"
import { formatCurrency } from "@halaalvest/utils"
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual"
import { LoaderCircle } from "lucide-react"
import { useRef } from "react"
import {
  monthlyRecordStatusLabel,
  monthlyRecordStatusVariant,
} from "@/components/monthly-records/monthly-record-status"
import { MonthlyRecordRowActions } from "@/components/open-monthly-record-sheet"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import type { MonthlyRecordMemberTableRow } from "./data-table"
import { MonthlyRecordsEmptyState, MonthlyRecordsNoResults } from "./empty-states"
import { useMonthlyRecordsQuery } from "./use-monthly-records-query"

function MonthlyRecordMobileItem({ row }: { row: MonthlyRecordMemberTableRow }) {
  return (
    <div className="flex flex-col gap-3 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{row.memberName}</p>
          <p className="truncate text-muted-foreground">
            {[row.memberNumber, row.workplaceName].filter(Boolean).join(" · ")}
          </p>
        </div>
        <Badge variant={monthlyRecordStatusVariant(row.status)}>
          {monthlyRecordStatusLabel(row.status)}
        </Badge>
      </div>
      <dl className="grid grid-cols-2 gap-3">
        <div>
          <dt className="text-muted-foreground">Due</dt>
          <dd className="font-medium text-foreground tabular-nums">
            {formatCurrency(row.totalPayableAmount)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Paid</dt>
          <dd className="font-medium text-foreground tabular-nums">
            {row.status === "applied" ? formatCurrency(row.totalPaidAmount) : "—"}
          </dd>
        </div>
      </dl>
      <MonthlyRecordRowActions fullWidth row={row} />
    </div>
  )
}

export function MonthlyRecordsMobileList({
  month,
  monthlyRecordId,
  periodLabel,
  year,
}: {
  month?: number
  monthlyRecordId?: string | null
  periodLabel?: string
  year?: number
}) {
  const query = useMonthlyRecordsQuery(monthlyRecordId)
  const parentRef = useRef<HTMLDivElement>(null)
  const rowVirtualizer = useVirtualizer({
    count: query.rows.length,
    estimateSize: () => 200,
    getScrollElement: () => parentRef.current,
    overscan: 6,
  })

  useInfiniteScroll<HTMLDivElement>({
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    rowCount: query.rows.length,
    rowVirtualizer,
    scrollRef: parentRef,
    threshold: 8,
  })

  if (!query.rows.length) {
    return query.hasFilters ? (
      <MonthlyRecordsNoResults />
    ) : (
      <MonthlyRecordsEmptyState
        month={month}
        periodLabel={monthlyRecordId ? periodLabel : undefined}
        year={year}
      />
    )
  }

  return (
    <div
      aria-busy={query.isFetchingNextPage}
      className="scrollbar-hide overflow-y-auto overscroll-y-auto border-t border-border"
      ref={parentRef}
      style={{ height: "max(480px, calc(100dvh - 220px))" }}
    >
      <div
        className="relative w-full"
        style={{
          height: `${rowVirtualizer.getTotalSize() + (query.isFetchingNextPage ? 48 : 0)}px`,
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow: VirtualItem) => {
          const row = query.rows[virtualRow.index]
          if (!row) return null

          return (
            <div
              className="absolute top-0 left-0 w-full border-b border-border"
              data-index={virtualRow.index}
              key={row.id}
              ref={rowVirtualizer.measureElement}
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              <MonthlyRecordMobileItem row={row} />
            </div>
          )
        })}
        {query.isFetchingNextPage ? (
          <div className="absolute inset-x-0 bottom-0 flex h-12 items-center justify-center text-muted-foreground">
            <LoaderCircle aria-hidden className="size-5 animate-spin" />
            <span className="sr-only">Loading more members</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
