import { useLocalSearchParams } from "expo-router"
import { AdminMembersScreen } from "../screens/admin-members-screen"
import { getAdminLifecycleQaState } from "./admin-lifecycle-qa-state"

export function AdminMembersRouteController() {
  const { qaState } = useLocalSearchParams<{
    qaState?: string | string[]
  }>()

  return <AdminMembersScreen qaState={getAdminLifecycleQaState(qaState)} />
}
