import { appQueryKey, useInvalidateAppQueries } from "@/hooks/use-app-query"
import { getMobilePersistenceScope } from "@/runtime/persistence-scope"
import { useCallback, useState } from "react"
import type { ShareProfitBook } from "./admin-share-profit-governance-types"

/** Exact query keys for shares and profit, scoped to the session. */
export function shareProfitKeys() {
  const scope = getMobilePersistenceScope()?.key
  return {
    book: (book: ShareProfitBook) =>
      appQueryKey("admin-share-profit-book", scope, book),
    period: (periodId: string) =>
      appQueryKey("admin-share-profit-period", scope, periodId),
    share: (shareId: string) =>
      appQueryKey("admin-share-profit-share", scope, shareId),
    summary: appQueryKey("admin-share-profit-summary", scope),
  }
}

/** After a decision: refresh the summary, the book it changed and the record. */
export function useRefreshShareProfit() {
  const invalidate = useInvalidateAppQueries()
  return useCallback(
    (input: { book: ShareProfitBook; periodId?: string; shareId?: string }) => {
      const keys = shareProfitKeys()
      return invalidate(
        keys.summary,
        keys.book(input.book),
        ...(input.periodId ? [keys.period(input.periodId)] : []),
        ...(input.shareId ? [keys.share(input.shareId)] : [])
      )
    },
    [invalidate]
  )
}

/** Spinner state for user pulls only (background refetches stay quiet). */
export function usePullRefresh(refresh: () => Promise<unknown>) {
  const [pulling, setPulling] = useState(false)
  const onRefresh = useCallback(() => {
    setPulling(true)
    void refresh().finally(() => setPulling(false))
  }, [refresh])
  return { onRefresh, refreshing: pulling }
}
