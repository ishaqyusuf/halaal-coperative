"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useTRPC } from "@/trpc/client"

/**
 * Support actions revalidate the page and its staff summary in their Next.js
 * response. Invalidate the client queries too so loaded pages and case
 * conversations reflect the write.
 */
export function useSupportRefresh() {
  const queryClient = useQueryClient()
  const trpc = useTRPC()

  return async ({
    onClose,
    supportCaseId,
  }: {
    onClose?: () => Promise<void> | void
    supportCaseId?: string
  } = {}) => {
    if (onClose) await onClose()

    await Promise.all([
      queryClient.invalidateQueries(trpc.support.list.infiniteQueryFilter()),
      supportCaseId
        ? queryClient.invalidateQueries({
            queryKey: trpc.support.get.queryKey({ supportCaseId }),
          })
        : undefined,
    ])
  }
}
