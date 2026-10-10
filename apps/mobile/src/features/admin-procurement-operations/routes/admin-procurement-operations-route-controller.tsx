import { getNotificationEntityIdParam } from "@/features/notifications/public/notification-destination-param"
import { useLocalSearchParams } from "expo-router"
import { AdminProcurementOperationsScreen } from "../screens/admin-procurement-operations-screen"

export function AdminProcurementOperationsRouteController() {
  const { notificationEntityId } = useLocalSearchParams<{
    notificationEntityId?: string | string[]
  }>()

  return (
    <AdminProcurementOperationsScreen
      initialEntityId={getNotificationEntityIdParam(notificationEntityId)}
    />
  )
}
