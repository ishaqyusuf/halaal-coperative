"use client"

import type { PageFilterData } from "@halaalvest/utils"

export type SearchFilterValue = string | string[] | null | undefined

export type SearchFilterValues = Record<string, SearchFilterValue>

export type SetSearchFilters = (
  values: Record<string, unknown> | null,
  options?: Record<string, unknown>,
) => Promise<unknown> | void

export type SearchFilterProps = {
  filterSchema?: Partial<Record<string, unknown>>
  filters: SearchFilterValues
  initialFilterList?: PageFilterData[]
  placeholder?: string
  setFilters: SetSearchFilters
}
