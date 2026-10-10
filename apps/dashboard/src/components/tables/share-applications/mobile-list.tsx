"use client"

import { useRef } from "react"
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual"
import { LoaderCircle } from "lucide-react"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useScrollHeader } from "@/hooks/use-scroll-header"
import { ShareApplicationsEmptyState } from "./empty-states"
import { ShareApplicationMobileItem } from "./mobile-item"
import { useShareApplicationsQuery } from "./use-share-applications-query"

export function ShareApplicationsMobileList({
  canReview,
}: {
  canReview: boolean
}) {
  const parentRef = useRef<HTMLDivElement>(null)
  const {
    applications,
    fetchNextPage,
    hasActiveControls,
    hasNextPage,
    isFetchingNextPage,
  } = useShareApplicationsQuery()
  const rowVirtualizer = useVirtualizer({
    count: applications.length,
    estimateSize: () => 224,
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
    return <ShareApplicationsEmptyState filtered={hasActiveControls} />
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
              <ShareApplicationMobileItem
                application={application}
                canReview={canReview}
              />
            </div>
          )
        })}
        {isFetchingNextPage ? (
          <div className="absolute inset-x-0 bottom-0 flex h-12 items-center justify-center text-muted-foreground">
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
            <span className="sr-only">Loading more share applications</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
