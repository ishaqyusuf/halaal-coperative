"use client"

import { Button } from "@halaal-vest/ui/components/button"
import { TrendPill } from "@/components/dashboard/primitives"

export function MemberFilterList({
  filters,
  onClear,
}: {
  filters: Array<{ key: string; label: string }>
  onClear: () => void
}) {
  if (!filters.length) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((filter) => (
        <TrendPill key={filter.key}>{filter.label}</TrendPill>
      ))}
      <Button type="button" size="xs" variant="outline" className="rounded-full" onClick={onClear}>
        Clear filters
      </Button>
    </div>
  )
}
