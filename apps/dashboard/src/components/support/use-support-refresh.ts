"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useTRPC } from "@/trpc/client"

/**
 * After a support change: refresh only the support list, the open case and
 * the server summary. Pass `onClose` to close the sheet first, so the URL
 * settles before the page refreshes.
 */
export function useSupportRefresh() {
  const queryClient = useQueryClient()
  const router = useRouter()
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
    router.refresh()
  }
}
