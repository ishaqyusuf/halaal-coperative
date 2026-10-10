import { getNotificationEntityIdParam } from "@/features/notifications/public/notification-destination-param"
import { useLocalSearchParams } from "expo-router"
import { AdminFinancingOperationsScreen } from "../screens/admin-financing-operations-screen"

export function AdminFinancingOperationsRouteController() {
  const { notificationEntityId } = useLocalSearchParams<{
    notificationEntityId?: string | string[]
  }>()

  return (
    <AdminFinancingOperationsScreen
      initialEntityId={getNotificationEntityIdParam(notificationEntityId)}
    />
  )
}
