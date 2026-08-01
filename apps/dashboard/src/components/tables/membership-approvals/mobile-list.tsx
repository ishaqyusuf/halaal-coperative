"use client"

import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual"
import { LoaderCircle } from "lucide-react"
import { useRef } from "react"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useScrollHeader } from "@/hooks/use-scroll-header"
import {
  MembershipApprovalsEmptyState,
  MembershipApprovalsNoResults,
} from "./empty-states"
import { MembershipApprovalMobileItem } from "./mobile-item"
import { useMembershipApprovalsQuery } from "./use-membership-approvals-query"

export function MembershipApprovalsMobileList() {
  const parentRef = useRef<HTMLDivElement>(null)
  const {
    fetchNextPage,
    hasActiveControls,
    hasNextPage,
    isFetchingNextPage,
    requests,
  } = useMembershipApprovalsQuery()
  const rowVirtualizer = useVirtualizer({
    count: requests.length,
    estimateSize: () => 208,
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
    rowCount: requests.length,
    rowVirtualizer,
    scrollRef: parentRef,
    threshold: 8,
  })

  if (!requests.length && hasActiveControls) {
    return <MembershipApprovalsNoResults />
  }

  if (!requests.length) {
    return <MembershipApprovalsEmptyState />
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
          const request = requests[virtualRow.index]
          if (!request) return null

          return (
            <div
              className="absolute top-0 left-0 w-full border-b border-border"
              data-index={virtualRow.index}
              key={request.id}
              ref={rowVirtualizer.measureElement}
              style={{
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <MembershipApprovalMobileItem request={request} />
            </div>
          )
        })}

        {isFetchingNextPage ? (
          <div className="absolute inset-x-0 bottom-0 flex h-12 items-center justify-center text-muted-foreground">
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            <span className="sr-only">Loading more membership requests</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
