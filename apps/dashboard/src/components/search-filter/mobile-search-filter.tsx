"use client"

import { useState } from "react"
import type { PageFilterData } from "@halaalvest/utils"
import { MobileFilterDrawer } from "./mobile-filter-drawer"
import { SearchFilterField } from "./search-filter-field"
import type { SearchFilterValues, SetSearchFilters } from "./types"

// Mounted only while open so dismissing always discards the snapshot.
export function MobileSearchFilter({
  filterList,
  filters,
  filterSchema,
  onClose,
  setFilters,
}: {
  filterList: PageFilterData[]
  filters: SearchFilterValues
  filterSchema?: Partial<Record<string, unknown>>
  onClose: () => void
  setFilters: SetSearchFilters
}) {
  const [draft, setDraft] = useState<SearchFilterValues>(() =>
    Object.fromEntries(
      filterList.map(({ value }) => [String(value), filters[String(value)]])
    )
  )
  return (
    <MobileFilterDrawer
      description="Choose filters, then apply to update this view."
      onApply={() =>
        setFilters(
          Object.fromEntries(
            filterList.map(({ value }) => [String(value), draft[String(value)]])
          ),
          { shallow: false }
        )
      }
      onClear={() =>
        setDraft(
          Object.fromEntries(
            filterList.map(({ value }) => [String(value), null])
          )
        )
      }
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      open
      title="Filters"
    >
      {filterList.map((filter) => {
        const key = String(filter.value)
        const parser = filterSchema?.[key] as
          | { parse?: (value: string) => unknown }
          | undefined
        const multiSelect =
          filter.type !== "date-range" &&
          (Array.isArray(filters[key]) || Array.isArray(parser?.parse?.("")))
        return (
          <SearchFilterField
            filter={filter}
            key={key}
            multiSelect={multiSelect}
            onChange={(value) =>
              setDraft((current) => ({ ...current, [key]: value }))
            }
            onOptionSelect={() => undefined}
            value={draft[key]}
          />
        )
      })}
    </MobileFilterDrawer>
  )
}
