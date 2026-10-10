import { getNotificationEntityIdParam } from "@/features/notifications/public/notification-destination-param"
import { useLocalSearchParams } from "expo-router"
import { SupportScreen } from "../screens/member-support-screen"

export function MemberSupportRouteController() {
  const { notificationEntityId } = useLocalSearchParams<{
    notificationEntityId?: string | string[]
  }>()

  return (
    <SupportScreen
      initialEntityId={getNotificationEntityIdParam(notificationEntityId)}
    />
  )
}
