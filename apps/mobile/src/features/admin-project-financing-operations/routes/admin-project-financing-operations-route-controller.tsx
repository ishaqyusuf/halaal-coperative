import { getNotificationEntityIdParam } from "@/features/notifications/public/notification-destination-param"
import { useLocalSearchParams } from "expo-router"
import { AdminProjectFinancingOperationsScreen } from "../screens/admin-project-financing-operations-screen"

export function AdminProjectFinancingOperationsRouteController() {
  const { notificationEntityId } = useLocalSearchParams<{
    notificationEntityId?: string | string[]
  }>()

  return (
    <AdminProjectFinancingOperationsScreen
      initialEntityId={getNotificationEntityIdParam(notificationEntityId)}
    />
  )
}
