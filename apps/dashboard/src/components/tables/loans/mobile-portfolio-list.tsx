"use client"

import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual"
import { LoaderCircle } from "lucide-react"
import { useRef } from "react"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useScrollHeader } from "@/hooks/use-scroll-header"
import { LoanPortfolioMobileItem } from "./mobile-item"
import { useLoanPortfolioQuery } from "./use-loans-query"

export function LoanPortfolioMobileList({
  availablePool,
  canReview,
  memberId,
}: {
  availablePool: number
  canReview: boolean
  memberId?: string
}) {
  const parentRef = useRef<HTMLDivElement>(null)
  const {
    fetchNextPage,
    hasActiveControls,
    hasNextPage,
    isFetchingNextPage,
    loans,
  } = useLoanPortfolioQuery(memberId)
  const rowVirtualizer = useVirtualizer({
    count: loans.length,
    estimateSize: () => 216,
    getScrollElement: () => parentRef.current,
    overscan: 6,
  })
  useScrollHeader(parentRef, {
    extraOffset: 24,
    lockBodyScroll: false,
    revealOnScrollUp: true,
  })
  useInfiniteScroll<HTMLDivElement>({
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    rowCount: loans.length,
    rowVirtualizer,
    scrollRef: parentRef,
    threshold: 8,
  })
  if (!loans.length) {
    return (
      <div className="flex min-h-48 items-center justify-center border-y border-border px-4 text-center">
        <div>
          <p className="text-sm font-medium text-foreground">
            {hasActiveControls ? "No matching loans" : "No loans yet"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasActiveControls
              ? "Adjust or clear the current portfolio filters."
              : "Approved loans will appear here once they enter the portfolio."}
          </p>
        </div>
      </div>
    )
  }
  return (
    <div
      aria-busy={isFetchingNextPage}
      className="scrollbar-hide overflow-y-auto overscroll-y-auto border-t border-border"
      ref={parentRef}
      style={{
        height: "max(420px, calc(100dvh - 248px + var(--header-offset, 0px)))",
      }}
    >
      <div
        className="relative w-full"
        style={{
          height: `${rowVirtualizer.getTotalSize() + (isFetchingNextPage ? 48 : 0)}px`,
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow: VirtualItem) => {
          const loan = loans[virtualRow.index]
          return loan ? (
            <div
              className="absolute top-0 left-0 w-full border-b border-border"
              data-index={virtualRow.index}
              key={loan.id}
              ref={rowVirtualizer.measureElement}
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              <LoanPortfolioMobileItem
                availablePool={availablePool}
                canReview={canReview}
                loan={loan}
              />
            </div>
          ) : null
        })}
        {isFetchingNextPage ? (
          <div className="absolute inset-x-0 bottom-0 flex h-12 items-center justify-center text-muted-foreground">
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
            <span className="sr-only">Loading more loans</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
