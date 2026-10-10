import { getNotificationEntityIdParam } from "@/features/notifications/public/notification-destination-param"
import { useLocalSearchParams } from "expo-router"
import { AdminFoodPurchaseOperationsScreen } from "../screens/admin-food-purchase-operations-screen"

export function AdminFoodPurchaseOperationsRouteController() {
  const { notificationEntityId } = useLocalSearchParams<{
    notificationEntityId?: string | string[]
  }>()

  return (
    <AdminFoodPurchaseOperationsScreen
      initialEntityId={getNotificationEntityIdParam(notificationEntityId)}
    />
  )
}
