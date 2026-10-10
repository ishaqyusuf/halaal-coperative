"use client"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useDeferredValue, useMemo } from "react"
import { useChargeFilterParams } from "@/hooks/use-charge-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"
import { getChargeLibraryListInput } from "@/lib/charges/charge-library-list-input"
import { useTRPC } from "@/trpc/client"

export function useChargeLibraryQuery() {
  const trpc = useTRPC()
  const { filter } = useChargeFilterParams()
  const { params } = useSortParams()
  const deferredSearch = useDeferredValue(filter.q)
  const queryInput = useMemo(
    () => getChargeLibraryListInput(filter, params.sort, deferredSearch),
    [deferredSearch, filter, params.sort]
  )
  const { data } = useSuspenseQuery(
    trpc.charges.chargeLibrary.queryOptions(queryInput)
  )

  return {
    hasActiveControls: Boolean(
      filter.frequency ||
        filter.q ||
        filter.status ||
        filter.valueType ||
        params.sort
    ),
    rows: data.data,
  }
}
