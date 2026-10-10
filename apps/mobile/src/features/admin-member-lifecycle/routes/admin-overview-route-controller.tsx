import { useLocalSearchParams } from "expo-router"
import { AdminOverviewScreen } from "../screens/admin-overview-screen"
import { getAdminLifecycleQaState } from "./admin-lifecycle-qa-state"

export function AdminOverviewRouteController() {
  const { qaState } = useLocalSearchParams<{
    qaState?: string | string[]
  }>()

  return <AdminOverviewScreen qaState={getAdminLifecycleQaState(qaState)} />
}
