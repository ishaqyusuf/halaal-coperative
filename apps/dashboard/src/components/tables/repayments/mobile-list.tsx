"use client"

import { type ReactNode, useRef } from "react"
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual"
import { LoaderCircle } from "lucide-react"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useScrollHeader } from "@/hooks/use-scroll-header"
import { RepaymentsEmptyState } from "./empty-states"
import {
  RepaymentHistoryMobileItem,
  RepaymentScheduleMobileItem,
} from "./mobile-item"
import type { RepaymentHistoryRow, RepaymentScheduleRow } from "./types"
import {
  useRepaymentHistoryQuery,
  useRepaymentScheduleQuery,
} from "./use-repayments-query"

type MobileListQuery<TItem> = {
  fetchNextPage: () => void
  hasFilters: boolean
  hasNextPage: boolean
  isFetchingNextPage: boolean
  rows: TItem[]
}

function RepaymentMobileList<TItem extends { id: string }>({
  emptyCopy,
  query,
  renderItem,
}: {
  emptyCopy: { description: string; filteredTitle: string; title: string }
  query: MobileListQuery<TItem>
  renderItem: (item: TItem) => ReactNode
}) {
  const parentRef = useRef<HTMLDivElement>(null)
  const rowVirtualizer = useVirtualizer({
    count: query.rows.length,
    estimateSize: () => 242,
    getScrollElement: () => parentRef.current,
    overscan: 6,
  })

  useScrollHeader(parentRef, {
    extraOffset: 24,
    lockBodyScroll: false,
    revealOnScrollUp: true,
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
    return <RepaymentsEmptyState {...emptyCopy} filtered={query.hasFilters} />
  }

  return (
    <div
      aria-busy={query.isFetchingNextPage}
      className="scrollbar-hide overflow-y-auto overscroll-y-auto border-t border-border"
      ref={parentRef}
      style={{
        height: "max(420px, calc(100dvh - 248px + var(--header-offset, 0px)))",
      }}
    >
      <div
        className="relative w-full"
        style={{
          height: `${rowVirtualizer.getTotalSize() + (query.isFetchingNextPage ? 48 : 0)}px`,
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow: VirtualItem) => {
          const item = query.rows[virtualRow.index]
          if (!item) return null

          return (
            <div
              className="absolute top-0 left-0 w-full border-b border-border"
              data-index={virtualRow.index}
              key={item.id}
              ref={rowVirtualizer.measureElement}
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              {renderItem(item)}
            </div>
          )
        })}
        {query.isFetchingNextPage ? (
          <div className="absolute inset-x-0 bottom-0 flex h-12 items-center justify-center text-muted-foreground">
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
            <span className="sr-only">Loading more repayment records</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function RepaymentScheduleMobileList({
  canPostRepayment,
  view,
}: {
  canPostRepayment: boolean
  view: "collections" | "schedule"
}) {
  const query = useRepaymentScheduleQuery(view)

  return (
    <RepaymentMobileList<RepaymentScheduleRow>
      emptyCopy={{
        description:
          view === "collections"
            ? "Overdue repayment accounts will appear here for follow-up."
            : "Scheduled installments will appear after an approved loan is disbursed.",
        filteredTitle:
          view === "collections"
            ? "No matching collection cases"
            : "No matching schedule items",
        title:
          view === "collections"
            ? "No collection cases yet"
            : "No repayment schedule yet",
      }}
      query={query}
      renderItem={(item) => (
        <RepaymentScheduleMobileItem
          canPostRepayment={canPostRepayment}
          item={item}
        />
      )}
    />
  )
}

export function RepaymentHistoryMobileList() {
  const query = useRepaymentHistoryQuery()

  return (
    <RepaymentMobileList<RepaymentHistoryRow>
      emptyCopy={{
        description: "Posted repayment evidence will appear here.",
        filteredTitle: "No matching repayment history",
        title: "No repayments posted yet",
      }}
      query={query}
      renderItem={(item) => <RepaymentHistoryMobileItem item={item} />}
    />
  )
}
