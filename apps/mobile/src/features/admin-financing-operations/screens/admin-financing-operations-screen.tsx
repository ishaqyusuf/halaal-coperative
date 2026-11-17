import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import { useAppQuery } from "@/hooks/use-app-query"
import { useAuthContext } from "@/hooks/use-auth"
import { useIsOnline } from "@/lib/online-status"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import { useRouter } from "expo-router"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  getFinancingItem,
  getFinancingSummary,
} from "../api/admin-financing-operations-api"
import {
  FinancingCycleSheet,
  FinancingDisburseSheet,
  FinancingReviewSheet,
} from "../components/financing-action-sheets"
import {
  FinancingDetailSheet,
  FinancingExceptionsSheet,
} from "../components/financing-detail-sheet"
import { FinancingLanes } from "../components/financing-lanes"
import type {
  FinancingItem,
  FinancingLane,
} from "../model/admin-financing-operations-types"
import { withCapacityBlockers } from "../model/financing-presentation"
import {
  financingKeys,
  useRefreshFinancing,
} from "../model/financing-queries"

type Action =
  | { item: FinancingItem; kind: "review" }
  | { item: FinancingItem; kind: "disburse" }
  | { kind: "cycle" }

/**
 * T20 Admin › Financing operations. Reads: the summary (cycle, counts) once
 * per visit plus one cursor page of the visible lane; a notification opens
 * its record with one item read instead of reading every lane.
 */
export function AdminFinancingOperationsScreen({
  initialEntityId = null,
}: {
  initialEntityId?: string | null
}) {
  const router = useRouter()
  const { profile } = useAuthContext()
  const online = useIsOnline()
  const refresh = useRefreshFinancing()
  const enabled = canUseMobileFeatureData(profile, "admin")
  const [lane, setLane] = useState<FinancingLane>("review")
  const [detail, setDetail] = useState<FinancingItem | null>(null)
  const [action, setAction] = useState<Action | null>(null)
  const [exceptions, setExceptions] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const summary = useAppQuery({
    enabled,
    networkMode: "always",
    queryFn: getFinancingSummary,
    queryKey: financingKeys().summary,
  })
  const data = summary.data
  const currencyCode = data?.currencyCode ?? "NGN"
  const stale = isMobileReadCacheStale(data?.cache)
  const offline = !online
  const blocked = offline || stale
  const blockedReason = offline
    ? "Connect to the internet to act on this."
    : stale
      ? "Refresh before acting on a saved copy."
      : null

  const deepLink = useAppQuery({
    enabled: enabled && Boolean(initialEntityId),
    networkMode: "always",
    queryFn: () => getFinancingItem(initialEntityId!),
    queryKey: financingKeys().item(initialEntityId ?? "none"),
    refetchOnScreenFocus: false,
  })
  const handled = useRef<string | null>(null)
  useEffect(() => {
    if (!initialEntityId || handled.current === initialEntityId) return
    if (deepLink.data) {
      handled.current = initialEntityId
      setLane(deepLink.data.lane)
      setDetail(deepLink.data.item)
    } else if (deepLink.isError) {
      handled.current = initialEntityId
      setNotice(
        "That financing record is no longer in this queue. It may have been decided already."
      )
    }
  }, [deepLink.data, deepLink.isError, initialEntityId])

  const refetchSummary = summary.refetch
  const refreshSummary = useCallback(() => refetchSummary(), [refetchSummary])
  const open = useCallback(
    (item: FinancingItem) => setDetail(withCapacityBlockers(item, data?.cycle, currencyCode)),
    [currencyCode, data?.cycle]
  )
  const done = useCallback(
    (entityId?: string) => {
      setDetail(null)
      void refresh(entityId)
    },
    [refresh]
  )

  return (
    <>
      <FinancingLanes
        enabled={enabled}
        lane={lane}
        notice={notice}
        offline={offline}
        onBack={() =>
          router.canGoBack() ? router.back() : router.replace("/(admin)/(tabs)/finance")
        }
        onCycle={() => setAction({ kind: "cycle" })}
        onDismissNotice={() => setNotice(null)}
        onExceptions={() => setExceptions(true)}
        onLaneChange={setLane}
        onOpen={open}
        onRefreshSummary={refreshSummary}
        stale={stale}
        summary={data}
        summaryFailed={summary.isError && !data}
      />
      <FinancingDetailSheet
        blockedReason={
          blockedReason ?? (data && !data.capabilities.review ? "Reviewing needs the finance role." : null)
        }
        item={action ? null : detail}
        onClose={() => setDetail(null)}
        onDisburse={(item) => setAction({ item, kind: "disburse" })}
        onReview={(item) => setAction({ item, kind: "review" })}
        summary={data}
      />
      <FinancingExceptionsSheet
        onClose={() => setExceptions(false)}
        summary={data}
        visible={exceptions}
      />
      {action?.kind === "review" ? (
        <FinancingReviewSheet
          blocked={blocked}
          item={action.item}
          onClose={() => setAction(null)}
          onDone={() => done(action.item.id)}
          summary={data}
        />
      ) : null}
      {action?.kind === "disburse" ? (
        <FinancingDisburseSheet
          blocked={blocked}
          item={action.item}
          onClose={() => setAction(null)}
          onDone={() => done(action.item.loanId ?? action.item.id)}
          summary={data}
        />
      ) : null}
      {action?.kind === "cycle" && data ? (
        <FinancingCycleSheet
          blocked={blocked}
          onClose={() => setAction(null)}
          onDone={() => done()}
          summary={data}
        />
      ) : null}
    </>
  )
}
