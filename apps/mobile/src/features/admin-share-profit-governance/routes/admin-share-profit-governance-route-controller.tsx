import { useLocalSearchParams } from "expo-router"
import type { ShareProfitQaState } from "../model/admin-share-profit-governance-types"
import { AdminShareProfitGovernanceScreen } from "../screens/admin-share-profit-governance-screen"
import { ProfitPeriodScreen } from "../screens/profit-period-screen"
import { ShareRequestScreen } from "../screens/share-request-screen"

function getQaState(value: string | string[] | undefined) {
  if (!__DEV__ || typeof value !== "string") return null
  return ["denied", "empty", "error", "monthly", "offline", "stale"].includes(
    value
  )
    ? (value as ShareProfitQaState)
    : null
}

function id(value: string | string[] | undefined) {
  const first = Array.isArray(value) ? value[0] : value
  return first?.trim() ? first.trim().slice(0, 80) : null
}

/**
 * `/(admin)/share-profit-governance` shows the books; pushed instances carry
 * `?shareId=` (share request), `?periodId=` (profit period) or
 * `?periodId=&entryId=` (profit entry).
 */
export function AdminShareProfitGovernanceRouteController() {
  const params = useLocalSearchParams<{
    entryId?: string | string[]
    periodId?: string | string[]
    qaState?: string | string[]
    shareId?: string | string[]
  }>()
  const shareId = id(params.shareId)
  const periodId = id(params.periodId)
  if (shareId) return <ShareRequestScreen key={shareId} shareId={shareId} />
  if (periodId)
    return (
      <ProfitPeriodScreen
        entryId={id(params.entryId)}
        key={`${periodId}:${id(params.entryId) ?? ""}`}
        periodId={periodId}
      />
    )
  return <AdminShareProfitGovernanceScreen qaState={getQaState(params.qaState)} />
}
