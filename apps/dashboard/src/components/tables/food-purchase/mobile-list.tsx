"use client"

import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual"
import { LoaderCircle } from "lucide-react"
import { useRef } from "react"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useScrollHeader } from "@/hooks/use-scroll-header"
import { FoodPurchaseEmptyState } from "./empty-states"
import { FoodPurchaseMobileItem } from "./mobile-item"
import { useFoodPurchaseQuery } from "./use-food-purchase-query"

export function FoodPurchaseMobileList({
  canReviewApplications,
}: {
  canReviewApplications: boolean
}) {
  const parentRef = useRef<HTMLDivElement>(null)
  const {
    applications,
    fetchNextPage,
    hasActiveControls,
    hasNextPage,
    isFetchingNextPage,
  } = useFoodPurchaseQuery()
  const rowVirtualizer = useVirtualizer({
    count: applications.length,
    estimateSize: () => 238,
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
    rowCount: applications.length,
    rowVirtualizer,
    scrollRef: parentRef,
    threshold: 8,
  })

  if (!applications.length) {
    return <FoodPurchaseEmptyState filtered={hasActiveControls} />
  }

  const virtualItems = rowVirtualizer.getVirtualItems()

  return (
    <div
      aria-busy={isFetchingNextPage}
      className="scrollbar-hide overflow-y-auto overscroll-contain border-t border-border"
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
        {virtualItems.map((virtualRow: VirtualItem) => {
          const application = applications[virtualRow.index]
          if (!application) return null

          return (
            <div
              className="absolute top-0 left-0 w-full border-b border-border"
              data-index={virtualRow.index}
              key={application.id}
              ref={rowVirtualizer.measureElement}
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              <FoodPurchaseMobileItem
                application={application}
                canReviewApplications={canReviewApplications}
              />
            </div>
          )
        })}
        {isFetchingNextPage ? (
          <div className="absolute inset-x-0 bottom-0 flex h-12 items-center justify-center text-muted-foreground">
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
            <span className="sr-only">
              Loading more Foodstuff Purchase applications
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
