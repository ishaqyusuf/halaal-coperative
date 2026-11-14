"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useTRPC } from "@/trpc/client"

/**
 * After a business, profit or season change: move the sheet on, then reload
 * every business read (list, totals, sheets) once.
 */
export function useBusinessRefresh() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const trpc = useTRPC()

  return async (next: () => Promise<unknown> | unknown) => {
    await next()
    await queryClient.invalidateQueries({ queryKey: trpc.business.pathKey() })
    router.refresh()
  }
}
