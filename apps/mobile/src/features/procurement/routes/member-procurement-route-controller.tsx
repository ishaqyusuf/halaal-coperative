import { MemberProcurementScreen } from "../screens/member-procurement-screen"
import { getMemberCooperativeServiceQaState } from "@/features/member-cooperative-services/public/member-cooperative-service-qa-state"
import { getNotificationEntityIdParam } from "@/features/notifications/public/notification-destination-param"
import { createMobileMemberProcurementRequest } from "../api/member-procurement-api"
import type { MobileProcurementRequestCreateInput } from "../model/member-procurement-types"
import { runOfflineSafeProcurementRecovery } from "../model/member-procurement-offline-policy"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { useLocalSearchParams } from "expo-router"
import { useCallback } from "react"

export function MemberProcurementRouteController() {
  const { retry, runOnlineOperation, state } = useMobileRuntime()
  const { notificationEntityId, qaState } = useLocalSearchParams<{
    notificationEntityId?: string | string[]
    qaState?: string | string[]
  }>()
  const resolvedQaState = getMemberCooperativeServiceQaState(qaState)
  const isQaOffline = resolvedQaState === "offline"
  const isOffline = isQaOffline || state.connectivity === "offline"
  const handleCheckConnection = useCallback(
    () =>
      runOfflineSafeProcurementRecovery({
        isQaOffline,
        retry,
      }),
    [isQaOffline, retry]
  )
  const handleCreateRequest = useCallback(
    (input: MobileProcurementRequestCreateInput) =>
      runOnlineOperation("financial-command", () =>
        createMobileMemberProcurementRequest(input)
      ),
    [runOnlineOperation]
  )

  return (
    <MemberProcurementScreen
      initialEntityId={getNotificationEntityIdParam(notificationEntityId)}
      isOffline={isOffline}
      onCheckConnection={handleCheckConnection}
      onCreateRequest={handleCreateRequest}
      qaState={resolvedQaState}
    />
  )
}
