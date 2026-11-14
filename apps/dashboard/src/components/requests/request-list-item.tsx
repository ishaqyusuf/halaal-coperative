"use client"

import { ChevronRight } from "lucide-react"
import type { ReactNode } from "react"

/**
 * One request on a phone: tap anywhere to open it. Everything you can do with
 * a request is inside its sheet, so the row needs no menu.
 */
export function RequestListItem({
  amount,
  badge,
  meta,
  onOpen,
  subtitle,
  title,
}: {
  amount: string
  badge: ReactNode
  meta?: string | null
  onOpen: () => void
  subtitle?: string | null
  title: string
}) {
  return (
    <button
      className="flex min-h-[72px] w-full items-center gap-3 py-4 text-left focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
      onClick={onOpen}
      type="button"
    >
      <span className="grid min-w-0 flex-1 gap-1">
        <span className="truncate text-base font-semibold text-foreground">
          {title}
        </span>
        {subtitle ? (
          <span className="truncate text-base text-muted-foreground">
            {subtitle}
          </span>
        ) : null}
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
          {badge}
          <span className="text-base font-medium text-foreground tabular-nums">
            {amount}
          </span>
        </span>
        {meta ? (
          <span className="text-base text-muted-foreground">{meta}</span>
        ) : null}
      </span>
      <ChevronRight
        aria-hidden="true"
        className="size-5 shrink-0 text-muted-foreground"
      />
    </button>
  )
}
