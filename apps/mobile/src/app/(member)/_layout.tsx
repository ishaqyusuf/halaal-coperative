import { useAuthContext } from "@/hooks/use-auth"
import { BootstrapScreen } from "@/components/app/bootstrap-screen"
import { Redirect, Stack } from "expo-router"

export default function MemberLayout() {
  const { initializing, role } = useAuthContext()

  if (initializing) return <BootstrapScreen />
  if (role !== "member") return <Redirect href="/" />

  return <Stack screenOptions={{ headerShown: false }} />
}
