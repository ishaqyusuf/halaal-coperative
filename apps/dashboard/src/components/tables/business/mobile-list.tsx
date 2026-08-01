"use client"

import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual"
import { LoaderCircle } from "lucide-react"
import { useRef } from "react"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useScrollHeader } from "@/hooks/use-scroll-header"
import { useBusinessStore } from "@/store/business"
import { BusinessBottomBar } from "./bottom-bar"
import { BusinessEmptyState, BusinessNoResults } from "./empty-states"
import { BusinessMobileItem } from "./mobile-item"
import { useBusinessQuery } from "./use-business-query"

export function BusinessMobileList({ isLocked }: { isLocked: boolean }) {
  const parentRef = useRef<HTMLDivElement>(null)
  const { rowSelection, setRowSelection } = useBusinessStore()
  const {
    businesses,
    fetchNextPage,
    hasActiveControls,
    hasNextPage,
    isFetchingNextPage,
  } = useBusinessQuery()
  const rowVirtualizer = useVirtualizer({
    count: businesses.length,
    estimateSize: () => 248,
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
    rowCount: businesses.length,
    rowVirtualizer,
    scrollRef: parentRef,
    threshold: 8,
  })

  if (!businesses.length && hasActiveControls) {
    return <BusinessNoResults />
  }

  if (!businesses.length) {
    return <BusinessEmptyState />
  }

  const selectedBusinesses = businesses.filter(
    (business) => rowSelection[business.id]
  )
  const virtualItems = rowVirtualizer.getVirtualItems()

  function setBusinessSelected(businessId: string, selected: boolean) {
    setRowSelection((current) => {
      const next = { ...current }

      if (selected) {
        next[businessId] = true
      } else {
        delete next[businessId]
      }

      return next
    })
  }

  return (
    <div className="relative">
      <div
        aria-busy={isFetchingNextPage}
        className="scrollbar-hide overflow-y-auto overscroll-contain border-t border-border"
        ref={parentRef}
        style={{
          height:
            "max(420px, calc(100dvh - 248px + var(--header-offset, 0px)))",
        }}
      >
        <div
          className="relative w-full"
          style={{
            height: `${rowVirtualizer.getTotalSize() + (isFetchingNextPage ? 48 : 0)}px`,
          }}
        >
          {virtualItems.map((virtualRow: VirtualItem) => {
            const business = businesses[virtualRow.index]
            if (!business) return null

            return (
              <div
                className="absolute top-0 left-0 w-full border-b border-border"
                data-index={virtualRow.index}
                key={business.id}
                ref={rowVirtualizer.measureElement}
                style={{ transform: `translateY(${virtualRow.start}px)` }}
              >
                <BusinessMobileItem
                  business={business}
                  isLocked={isLocked}
                  onSelectedChange={(selected) =>
                    setBusinessSelected(business.id, selected)
                  }
                  selected={Boolean(rowSelection[business.id])}
                />
              </div>
            )
          })}

          {isFetchingNextPage ? (
            <div className="absolute inset-x-0 bottom-0 flex h-12 items-center justify-center text-muted-foreground">
              <LoaderCircle
                aria-hidden="true"
                className="size-4 animate-spin"
              />
              <span className="sr-only">Loading more businesses</span>
            </div>
          ) : null}
        </div>
      </div>

      {selectedBusinesses.length > 0 ? (
        <BusinessBottomBar
          businesses={selectedBusinesses}
          onDeselect={() => setRowSelection({})}
        />
      ) : null}
    </div>
  )
}
