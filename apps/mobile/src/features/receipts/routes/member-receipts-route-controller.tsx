import { getNotificationEntityIdParam } from "@/features/notifications/public/notification-destination-param"
import { useLocalSearchParams } from "expo-router"
import { ReceiptsScreen } from "../screens/member-receipts-screen"

export function MemberReceiptsRouteController() {
  const { notificationEntityId } = useLocalSearchParams<{
    notificationEntityId?: string | string[]
  }>()

  return (
    <ReceiptsScreen
      initialEntityId={getNotificationEntityIdParam(notificationEntityId)}
    />
  )
}
