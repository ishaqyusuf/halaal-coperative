"use client"

import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual"
import { LoaderCircle } from "lucide-react"
import { useRef } from "react"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useScrollHeader } from "@/hooks/use-scroll-header"
import { useMembersStore } from "@/store/members"
import { MembersBottomBar } from "./bottom-bar"
import { MembersEmptyState, MembersNoResults } from "./empty-states"
import { MemberMobileItem } from "./mobile-item"
import { useMembersDirectoryQuery } from "./use-members-directory-query"

export function MembersMobileList({
  canManageMembers,
}: {
  canManageMembers: boolean
}) {
  const parentRef = useRef<HTMLDivElement>(null)
  const { rowSelection, setRowSelection } = useMembersStore()
  const {
    fetchNextPage,
    hasDirectoryControls,
    hasNextPage,
    isFetchingNextPage,
    members,
  } = useMembersDirectoryQuery()
  const rowVirtualizer = useVirtualizer({
    count: members.length,
    estimateSize: () => 232,
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
    rowCount: members.length,
    rowVirtualizer,
    scrollRef: parentRef,
    threshold: 8,
  })

  if (!members.length && hasDirectoryControls) {
    return <MembersNoResults />
  }

  if (!members.length) {
    return <MembersEmptyState canManageMembers={canManageMembers} />
  }

  const selectedMembers = members.filter((member) => rowSelection[member.id])
  const virtualItems = rowVirtualizer.getVirtualItems()

  function setMemberSelected(memberId: string, selected: boolean) {
    setRowSelection((current) => {
      const next = { ...current }

      if (selected) {
        next[memberId] = true
      } else {
        delete next[memberId]
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
            const member = members[virtualRow.index]
            if (!member) return null

            return (
              <div
                className="absolute top-0 left-0 w-full border-b border-border"
                data-index={virtualRow.index}
                key={member.id}
                ref={rowVirtualizer.measureElement}
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <MemberMobileItem
                  canManageMembers={canManageMembers}
                  member={member}
                  onSelectedChange={(selected) =>
                    setMemberSelected(member.id, selected)
                  }
                  selected={Boolean(rowSelection[member.id])}
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
              <span className="sr-only">Loading more members</span>
            </div>
          ) : null}
        </div>
      </div>

      {selectedMembers.length > 0 ? (
        <MembersBottomBar
          members={selectedMembers}
          onDeselect={() => setRowSelection({})}
        />
      ) : null}
    </div>
  )
}
