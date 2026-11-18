import { useAuthContext } from "@/hooks/use-auth"
import { getNotificationEntityIdParam } from "@/features/notifications/public/notification-destination-param"
import { useLocalSearchParams } from "expo-router"
import { ReceiptsScreen } from "../screens/member-receipts-screen"

export function MemberReceiptsRouteController() {
  const { profile } = useAuthContext()
  const { notificationEntityId } = useLocalSearchParams<{
    notificationEntityId?: string | string[]
  }>()

  return (
    <ReceiptsScreen
      key={
        profile
          ? `${profile.user.id}:${profile.tenant.id}:${profile.activeMembershipId}`
          : undefined
      }
      initialEntityId={getNotificationEntityIdParam(notificationEntityId)}
    />
  )
}
