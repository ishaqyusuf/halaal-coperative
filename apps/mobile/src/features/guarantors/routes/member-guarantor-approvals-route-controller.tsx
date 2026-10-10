import { getMemberCooperativeServiceQaState } from "@/features/member-cooperative-services/public/member-cooperative-service-qa-state"
import { getNotificationEntityIdParam } from "@/features/notifications/public/notification-destination-param"
import { useLocalSearchParams } from "expo-router"
import { GuarantorApprovalsScreen } from "../screens/member-guarantor-approvals-screen"

export function MemberGuarantorApprovalsRouteController() {
  const { notificationEntityId, qaState } = useLocalSearchParams<{
    notificationEntityId?: string | string[]
    qaState?: string | string[]
  }>()

  return (
    <GuarantorApprovalsScreen
      initialEntityId={getNotificationEntityIdParam(notificationEntityId)}
      qaState={getMemberCooperativeServiceQaState(qaState)}
    />
  )
}
