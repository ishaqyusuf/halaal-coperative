import { getMemberCooperativeServiceQaState } from "@/features/member-cooperative-services/public/member-cooperative-service-qa-state"
import { getNotificationEntityIdParam } from "@/features/notifications/public/notification-destination-param"
import { useAuthContext } from "@/hooks/use-auth"
import { useLocalSearchParams } from "expo-router"
import { GuarantorApprovalsScreen } from "../screens/member-guarantor-approvals-screen"

export function MemberGuarantorApprovalsRouteController() {
  const { profile } = useAuthContext()
  const { notificationEntityId, qaHistory, qaOutcome, qaState } =
    useLocalSearchParams<{
      notificationEntityId?: string | string[]
      qaState?: string | string[]
      qaHistory?: string
      qaOutcome?: string
    }>()

  return (
    <GuarantorApprovalsScreen
      key={
        profile
          ? `${profile.tenant.id}:${profile.user.id}:${profile.activeMembershipId}`
          : "guest"
      }
      qaHistory={__DEV__ && qaHistory === "1"}
      qaOutcome={
        __DEV__ && (qaOutcome === "error" || qaOutcome === "conflict")
          ? qaOutcome
          : null
      }
      initialEntityId={getNotificationEntityIdParam(notificationEntityId)}
      qaState={getMemberCooperativeServiceQaState(qaState)}
    />
  )
}
