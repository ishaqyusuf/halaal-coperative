"use client"

import { useQueryClient, type QueryFilters } from "@tanstack/react-query"
import { useRouter } from "next/navigation"

/**
 * After a request changes: close the sheet first (so the URL settles), then
 * refresh only the exact list/detail queries and the server summary.
 */
export function useRequestRefresh() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return async (onClose: () => Promise<void>, filters: QueryFilters[]) => {
    await onClose()
    await Promise.all(
      filters.map((filter) => queryClient.invalidateQueries(filter))
    )
    router.refresh()
  }
}
