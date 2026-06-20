"use client"

import { Button } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"

export function MemberFilterList({
  filters,
  onRemove,
  onClear,
}: {
  filters: Array<{ key: string; label: string }>
  onRemove: (key: string) => void
  onClear: () => void
}) {
  if (!filters.length) {
    return null
  }

  return (
    <ul className="flex flex-wrap items-center gap-2">
      {filters.map((filter) => (
        <li key={filter.key}>
          <button
            type="button"
            className={cn(
              "group inline-flex h-8 items-center gap-1.5 rounded-md bg-secondary px-2.5 text-xs font-normal text-[#787878] transition hover:bg-secondary/90 hover:text-foreground",
            )}
            onClick={() => onRemove(filter.key)}
          >
            <span className="inline-flex w-0 scale-0 items-center justify-center overflow-hidden text-muted-foreground transition-all duration-150 group-hover:w-3.5 group-hover:scale-100 group-hover:text-foreground">
              <svg
                aria-hidden="true"
                className="size-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </span>
            <span>{filter.label}</span>
          </button>
        </li>
      ))}
      <li>
        <Button type="button" size="sm" variant="ghost" className="h-8 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground" onClick={onClear}>
          Clear filters
        </Button>
      </li>
    </ul>
  )
}
