import { useAuthContext } from "@/hooks/use-auth"
import { BootstrapScreen } from "@/components/app/bootstrap-screen"
import { Redirect, Stack } from "expo-router"

export default function AdminLayout() {
  const { initializing, role } = useAuthContext()

  if (initializing) return <BootstrapScreen />
  if (role !== "admin") return <Redirect href="/" />

  return <Stack screenOptions={{ headerShown: false }} />
}
