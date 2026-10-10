import { useLocalSearchParams } from "expo-router"
import { getNotificationEntityIdParam } from "@/features/notifications/public/notification-destination-param"
import type { ProjectFinancingOperationsQaState } from "../model/admin-project-financing-operations-types"
import { AdminProjectFinancingOperationsScreen } from "../screens/admin-project-financing-operations-screen"

function getQaState(value: string | string[] | undefined) {
  if (!__DEV__ || typeof value !== "string") return null
  return ["denied", "empty", "error", "offline", "stale"].includes(value)
    ? (value as ProjectFinancingOperationsQaState)
    : null
}

export function AdminProjectFinancingOperationsRouteController() {
  const { notificationEntityId, qaState: qaStateParam } = useLocalSearchParams<{
    notificationEntityId?: string | string[]
    qaState?: string | string[]
  }>()

  return (
    <AdminProjectFinancingOperationsScreen
      initialEntityId={getNotificationEntityIdParam(notificationEntityId)}
      qaState={getQaState(qaStateParam)}
    />
  )
}
