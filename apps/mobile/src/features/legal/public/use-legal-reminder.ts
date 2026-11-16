import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useFocusEffect } from "expo-router"
import { useCallback } from "react"
import { getLegalReminderStatus } from "../api/legal-api"

/** A More focus checks again at most every 5 minutes (mobile plan M8). */
export const LEGAL_REMINDER_STALE_MS = 5 * 60 * 1000

export function legalReminderQueryKey(accountKey: string | null) {
  return ["mobile", "legal", "reminder", accountKey] as const
}

/**
 * Whether to show the "documents ready for your review" note. It asks the
 * server one yes/no question instead of downloading the document bundle;
 * the legal route still loads the full bundle.
 */
export function useLegalReminder({
  accountKey,
  enabled,
}: {
  accountKey: string | null
  enabled: boolean
}) {
  const queryClient = useQueryClient()
  const queryKey = legalReminderQueryKey(accountKey)
  const query = useQuery({
    enabled: enabled && Boolean(accountKey),
    networkMode: "always",
    queryFn: getLegalReminderStatus,
    queryKey,
    retry: false,
    staleTime: LEGAL_REMINDER_STALE_MS,
  })

  useFocusEffect(
    useCallback(() => {
      if (!enabled || !accountKey) return
      void queryClient.refetchQueries({
        queryKey: legalReminderQueryKey(accountKey),
        stale: true,
        type: "active",
      })
    }, [accountKey, enabled, queryClient])
  )

  // A reminder check must never interrupt account access: errors hide it.
  return enabled && query.data?.needsReview === true
}
