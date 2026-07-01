"use client"

import { useCallback } from "react"
import { useSortParams } from "@/hooks/use-sort-params"

export function useSortQuery() {
  const { params, setParams } = useSortParams()
  const [sortColumn, sortValue] = params.sort || []

  const createSortQuery = useCallback(
    (name: string) => {
      if (sortValue === "asc") {
        setParams({ sort: [name, "desc"] })
      } else if (sortValue === "desc") {
        setParams({ sort: null })
      } else {
        setParams({ sort: [name, "asc"] })
      }
    },
    [sortValue, setParams]
  )

  return {
    sortColumn,
    sortValue,
    createSortQuery,
  }
}
