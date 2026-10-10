import { useLocalSearchParams } from "expo-router"
import { AdminMemberDetailScreen } from "../screens/admin-member-detail-screen"
import { getAdminLifecycleQaState } from "./admin-lifecycle-qa-state"

export function AdminMemberDetailRouteController() {
  const { memberId, qaState } = useLocalSearchParams<{
    memberId?: string
    qaState?: string | string[]
  }>()

  return (
    <AdminMemberDetailScreen
      memberId={memberId ?? ""}
      qaState={getAdminLifecycleQaState(qaState)}
    />
  )
}
