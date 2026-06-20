"use client"

import { SearchFilterProvider } from "@/hooks/use-search-filter"
import { SearchFilterPanel } from "./search-filter-panel"
import type { SearchFilterProps } from "./types"

export function SearchFilter({
  filterSchema,
  filters,
  initialFilterList,
  placeholder = "Search...",
  setFilters,
}: SearchFilterProps) {
  return (
    <SearchFilterProvider filterSchema={filterSchema} filters={filters} setFilters={setFilters}>
      <SearchFilterPanel
        filterList={initialFilterList ?? []}
        filters={filters}
        placeholder={placeholder}
      />
    </SearchFilterProvider>
  )
}
