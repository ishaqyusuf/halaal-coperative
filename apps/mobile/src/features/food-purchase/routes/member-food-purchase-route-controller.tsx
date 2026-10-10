import { MemberFoodPurchaseScreen } from "../screens/member-food-purchase-screen"
import { getMemberCooperativeServiceQaState } from "@/features/member-cooperative-services/public/member-cooperative-service-qa-state"
import { getNotificationEntityIdParam } from "@/features/notifications/public/notification-destination-param"
import { useLocalSearchParams } from "expo-router"

export function MemberFoodPurchaseRouteController() {
  const { notificationEntityId, qaState } = useLocalSearchParams<{
    notificationEntityId?: string | string[]
    qaState?: string | string[]
  }>()

  return (
    <MemberFoodPurchaseScreen
      initialEntityId={getNotificationEntityIdParam(notificationEntityId)}
      qaState={getMemberCooperativeServiceQaState(qaState)}
    />
  )
}
