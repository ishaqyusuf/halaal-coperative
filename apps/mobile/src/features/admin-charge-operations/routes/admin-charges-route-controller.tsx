import {
  isMobileDevFixtureSession,
  isMobileQaClientBuild,
} from "@/dev/mobile-dev-session"
import { useLocalSearchParams } from "expo-router"
import { getAdminChargeOperationsQaState } from "../model/admin-charge-response-loss"
import { AdminChargeOperationsScreen } from "../screens/admin-charge-operations-screen"

export function AdminChargesRouteController() {
  const { qaState, preview } = useLocalSearchParams<{
    qaState?: string | string[]
    preview?: string
  }>()
  const fixture =
    isMobileDevFixtureSession() &&
    (preview === "empty" || preview === "error" || preview === "offline")
      ? preview
      : undefined

  return (
    <AdminChargeOperationsScreen
      key={fixture ?? "workspace"}
      preview={fixture}
      qaState={getAdminChargeOperationsQaState(qaState, isMobileQaClientBuild)}
    />
  )
}
