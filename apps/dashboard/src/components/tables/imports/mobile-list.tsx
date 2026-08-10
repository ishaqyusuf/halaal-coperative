"use client"

import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual"
import { LoaderCircle } from "lucide-react"
import { useRef } from "react"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useScrollHeader } from "@/hooks/use-scroll-header"
import type { ImportBatchRow } from "./data-table"
import { ImportMobileItem } from "./mobile-item"

export function ImportMobileList({
  batches,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  onOpenApply,
  onOpenDetails,
}: {
  batches: ImportBatchRow[]
  fetchNextPage: () => Promise<unknown>
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onOpenApply: (batch: ImportBatchRow) => void
  onOpenDetails: (batch: ImportBatchRow) => void
}) {
  const parentRef = useRef<HTMLDivElement>(null)
  const rowVirtualizer = useVirtualizer({
    count: batches.length,
    estimateSize: () => 214,
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
    rowCount: batches.length,
    rowVirtualizer,
    scrollRef: parentRef,
    threshold: 8,
  })

  const virtualItems = rowVirtualizer.getVirtualItems()

  return (
    <div
      aria-busy={isFetchingNextPage}
      className="scrollbar-hide overflow-y-auto overscroll-contain border-t border-border"
      ref={parentRef}
      style={{
        height: "max(420px, calc(100dvh - 300px + var(--header-offset, 0px)))",
      }}
    >
      <div
        className="relative w-full"
        style={{
          height: `${rowVirtualizer.getTotalSize() + (isFetchingNextPage ? 48 : 0)}px`,
        }}
      >
        {virtualItems.map((virtualRow: VirtualItem) => {
          const batch = batches[virtualRow.index]
          if (!batch) return null

          return (
            <div
              className="absolute top-0 left-0 w-full border-b border-border"
              data-index={virtualRow.index}
              key={batch.id}
              ref={rowVirtualizer.measureElement}
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              <ImportMobileItem
                batch={batch}
                onOpenApply={onOpenApply}
                onOpenDetails={onOpenDetails}
              />
            </div>
          )
        })}

        {isFetchingNextPage ? (
          <div className="absolute inset-x-0 bottom-0 flex h-12 items-center justify-center text-muted-foreground">
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            <span className="sr-only">Loading more import batches</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
