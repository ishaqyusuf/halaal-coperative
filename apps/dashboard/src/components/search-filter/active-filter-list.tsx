"use client"

import { Button } from "@halaalvest/ui/components/button"
import type { PageFilterData } from "@halaalvest/utils"
import type { SearchFilterValues } from "./types"
import {
  getFilterName,
  getFilterValueLabel,
  hasFilterValue,
  isSearchKey,
} from "./search-filter-utils"

export function ActiveFilterList({
  filterList,
  filters,
  onClearAll,
  onRemove,
}: {
  filterList: PageFilterData[]
  filters: SearchFilterValues
  onClearAll: () => void
  onRemove: (patch: Record<string, null>) => void
}) {
  const activeEntries = Object.entries(filters).filter(([, value]) => hasFilterValue(value))

  if (activeEntries.length === 0) {
    return null
  }

  return (
    <ul className="flex min-w-0 flex-wrap items-center gap-2">
      {activeEntries.map(([key, value]) => {
        const name = getFilterName(filterList, key)
        const valueLabel = getFilterValueLabel(filterList, key, value)

        return (
          <li key={key}>
            <Button
              className="h-9 max-w-[min(18rem,80vw)] rounded-full px-3 text-xs font-normal"
              onClick={() => onRemove({ [key]: null })}
              size="sm"
              title="Remove filter"
              type="button"
              variant="outline"
            >
              <span className="truncate">
                {isSearchKey(key) ? "Search" : name}
                {valueLabel ? `: ${valueLabel}` : ""}
              </span>
            </Button>
          </li>
        )
      })}
      <li>
        <Button
          className="h-9 rounded-full px-3 text-xs"
          onClick={onClearAll}
          size="sm"
          type="button"
          variant="ghost"
        >
          Clear filters
        </Button>
      </li>
    </ul>
  )
}
