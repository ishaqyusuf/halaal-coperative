import { EmptyState } from "@/components/app/empty-state"
import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import { useAppQuery } from "@/hooks/use-app-query"
import { useAuthContext } from "@/hooks/use-auth"
import { useIsOnline } from "@/lib/online-status"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import { captureMobileError } from "@/lib/sentry"
import { useRouter } from "expo-router"
import { useCallback, useEffect, useState } from "react"
import { View } from "react-native"
import { getShareProfitSummary } from "../api/admin-share-profit-governance-api"
import { ShareProfitBooks } from "../components/share-profit-books"
import { LedgerNav } from "../components/share-profit-ui"
import type {
  ProfitPeriod,
  ShareApplication,
  ShareProfitBook,
  ShareProfitQaState,
} from "../model/admin-share-profit-governance-types"
import { shareProfitKeys } from "../model/share-profit-queries"

/**
 * T22 Admin › Shares and profit books. Reads: the summary (both books'
 * stats) once per visit plus one cursor page of the visible book. Records
 * open as pushed instances of this route (`?shareId=`, `?periodId=`,
 * `?periodId=&entryId=`).
 */
export function AdminShareProfitGovernanceScreen({
  qaState = null,
}: {
  qaState?: ShareProfitQaState | null
}) {
  const router = useRouter()
  const { profile } = useAuthContext()
  const online = useIsOnline()
  const enabled =
    canUseMobileFeatureData(profile, "admin") && qaState !== "denied" && qaState !== "error"
  const [book, setBook] = useState<ShareProfitBook>("shares")
  const summary = useAppQuery({
    enabled,
    networkMode: "always",
    queryFn: getShareProfitSummary,
    queryKey: shareProfitKeys().summary,
  })
  useEffect(() => {
    if (summary.error) captureMobileError(summary.error, "mobile.share_profit_governance")
  }, [summary.error])
  const refetchSummary = summary.refetch
  const refreshSummary = useCallback(() => refetchSummary(), [refetchSummary])
  const openShare = useCallback(
    (application: ShareApplication) =>
      router.push({ pathname: "/(admin)/share-profit-governance", params: { shareId: application.id } }),
    [router]
  )
  const openPeriod = useCallback(
    (period: ProfitPeriod) =>
      router.push({ pathname: "/(admin)/share-profit-governance", params: { periodId: period.id } }),
    [router]
  )

  if (qaState === "denied" || summary.error?.message?.includes("access is required")) {
    return (
      <View className="flex-1 bg-background" testID="admin-share-profit-governance-screen">
        <LedgerNav title="Shares and profit" />
        <EmptyState
          description="Your role doesn’t include share and profit records. Ask a cooperative admin if you need them."
          icon="ShieldX"
          title="You can’t view shares and profit"
          tone="error"
        />
      </View>
    )
  }
  if (qaState === "error") {
    return (
      <View className="flex-1 bg-background" testID="admin-share-profit-governance-screen">
        <LedgerNav title="Shares and profit" />
        <EmptyState
          description="Check your connection and try again. Nothing was changed."
          icon="CircleAlert"
          title="Couldn’t load shares and profit"
          tone="error"
        />
      </View>
    )
  }

  return (
    <ShareProfitBooks
      book={book}
      enabled={enabled}
      offline={!online || qaState === "offline"}
      onBookChange={setBook}
      onOpenPeriod={openPeriod}
      onOpenShare={openShare}
      onRefreshSummary={refreshSummary}
      qaState={qaState}
      stale={qaState === "stale" || isMobileReadCacheStale(summary.data?.cache)}
      summary={summary.data}
      summaryFailed={summary.isError && !summary.data}
    />
  )
}
