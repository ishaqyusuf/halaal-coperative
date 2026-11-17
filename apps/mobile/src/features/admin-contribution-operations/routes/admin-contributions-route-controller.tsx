import { useLocalSearchParams } from "expo-router"
import { AdminContributionOperationsScreen } from "../screens/admin-contribution-operations-screen"
import { ContributionBatchScreen } from "../screens/contribution-batch-screen"
import { ContributionMemberScreen } from "../screens/contribution-member-screen"

function firstParam(value: string | string[] | undefined) {
  const first = Array.isArray(value) ? value[0] : value
  return first?.trim() ? first.trim().slice(0, 80) : null
}

/**
 * `/(admin)/contributions` shows the lanes; pushed instances carry
 * `?memberId=` (member contributions) or `?batchId=` (collection batch).
 */
export function AdminContributionsRouteController() {
  const params = useLocalSearchParams<{ batchId?: string; memberId?: string }>()
  const memberId = firstParam(params.memberId)
  const batchId = firstParam(params.batchId)
  if (memberId) return <ContributionMemberScreen key={memberId} memberId={memberId} />
  if (batchId) return <ContributionBatchScreen batchId={batchId} key={batchId} />
  return <AdminContributionOperationsScreen />
}
