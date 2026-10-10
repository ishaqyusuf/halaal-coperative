import { getNotificationEntityIdParam } from "@/features/notifications/public/notification-destination-param"
import { useLocalSearchParams } from "expo-router"
import { FinancingScreen } from "../screens/member-financing-screen"

export function MemberFinancingRouteController() {
  const { notificationEntityId } = useLocalSearchParams<{
    notificationEntityId?: string | string[]
  }>()

  return (
    <FinancingScreen
      initialEntityId={getNotificationEntityIdParam(notificationEntityId)}
    />
  )
}
