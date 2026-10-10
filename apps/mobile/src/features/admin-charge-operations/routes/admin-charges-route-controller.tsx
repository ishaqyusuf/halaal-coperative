import { isMobileQaClientBuild } from "@/dev/mobile-dev-session"
import { useLocalSearchParams } from "expo-router"
import { getAdminChargeOperationsQaState } from "../model/admin-charge-response-loss"
import { AdminChargeOperationsScreen } from "../screens/admin-charge-operations-screen"

export function AdminChargesRouteController() {
  const { qaState } = useLocalSearchParams<{
    qaState?: string | string[]
  }>()

  return (
    <AdminChargeOperationsScreen
      qaState={getAdminChargeOperationsQaState(qaState, isMobileQaClientBuild)}
    />
  )
}
