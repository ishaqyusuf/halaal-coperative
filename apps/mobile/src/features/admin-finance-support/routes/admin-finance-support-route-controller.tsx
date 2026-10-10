import { getNotificationEntityIdParam } from "@/features/notifications/public/notification-destination-param"
import { useLocalSearchParams } from "expo-router"
import { AdminFinanceSupportScreen } from "../screens/admin-finance-support-screen"

export function AdminFinanceSupportRouteController() {
  const { notificationEntityId } = useLocalSearchParams<{
    notificationEntityId?: string | string[]
  }>()

  return (
    <AdminFinanceSupportScreen
      initialEntityId={getNotificationEntityIdParam(notificationEntityId)}
    />
  )
}
