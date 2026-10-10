"use client"

import { useRef } from "react"
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual"
import { LoaderCircle } from "lucide-react"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useScrollHeader } from "@/hooks/use-scroll-header"
import { ContributionsEmptyState } from "./empty-states"
import { ContributionMobileItem } from "./mobile-item"
import { useContributionsQuery } from "./use-contributions-query"

export function ContributionsMobileList() {
  const query = useContributionsQuery()
  const parentRef = useRef<HTMLDivElement>(null)
  const rowVirtualizer = useVirtualizer({
    count: query.rows.length,
    estimateSize: () => 196,
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
    return <ContributionsEmptyState filtered={query.hasFilters} />
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
              <ContributionMobileItem item={item} />
            </div>
          )
        })}
        {query.isFetchingNextPage ? (
          <div className="absolute inset-x-0 bottom-0 flex h-12 items-center justify-center text-muted-foreground">
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
            <span className="sr-only">Loading more contribution records</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
