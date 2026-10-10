"use client"

import { createContext, useContext, useId, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { Button } from "@halaalvest/ui/components/button"

export const MobileFilterGroupsContext = createContext<{
  expanded: string | null
  setExpanded: (id: string | null) => void
} | null>(null)

export function MobileFilterGroup({
  children,
  title,
  summary,
}: {
  children: ReactNode
  title: string
  summary?: string | null
}) {
  const id = useId()
  const groups = useContext(MobileFilterGroupsContext)
  const expanded = groups?.expanded === id

  return (
    <section className="min-w-0 border-b border-border">
      <h3>
        <Button
          aria-controls={`${id}-content`}
          aria-expanded={expanded}
          className="h-auto min-h-14 w-full justify-between gap-3 px-0 py-3 text-left"
          id={`${id}-heading`}
          onClick={() => groups?.setExpanded(expanded ? null : id)}
          type="button"
          variant="ghost"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">{title}</span>
            <span className="block truncate text-xs font-normal text-muted-foreground">
              {summary || "Any"}
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`size-4 shrink-0 ${expanded ? "rotate-180" : ""}`}
          />
        </Button>
      </h3>
      {expanded ? (
        <div
          aria-labelledby={`${id}-heading`}
          className="min-w-0 pb-4"
          id={`${id}-content`}
          role="region"
        >
          {children}
        </div>
      ) : null}
    </section>
  )
}

export function filterOptionSummary(
  value: string | null | undefined,
  options: ReadonlyArray<{ id: string; name: string }>
) {
  return (
    options.find((option) => option.id === value)?.name ??
    (value && value !== "all" ? value : "Any")
  )
}
