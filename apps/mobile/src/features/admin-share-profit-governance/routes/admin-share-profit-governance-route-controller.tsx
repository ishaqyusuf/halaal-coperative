import { useLocalSearchParams } from "expo-router"
import type { ShareProfitQaState } from "../model/admin-share-profit-governance-types"
import { AdminShareProfitGovernanceScreen } from "../screens/admin-share-profit-governance-screen"

function getQaState(value: string | string[] | undefined) {
  if (!__DEV__ || typeof value !== "string") return null
  return ["denied", "empty", "error", "monthly", "offline", "stale"].includes(
    value
  )
    ? (value as ShareProfitQaState)
    : null
}

export function AdminShareProfitGovernanceRouteController() {
  const { qaState } = useLocalSearchParams<{
    qaState?: string | string[]
  }>()

  return <AdminShareProfitGovernanceScreen qaState={getQaState(qaState)} />
}
