import { useAuthContext } from "@/hooks/use-auth"
import { BootstrapScreen } from "@/components/app/bootstrap-screen"
import { stackTransition } from "@/lib/screen-transition"
import { Redirect, Stack } from "expo-router"
import { useReducedMotion } from "react-native-reanimated"

export default function MemberLayout() {
  const { initializing, role } = useAuthContext()
  const reduceMotion = useReducedMotion()

  if (initializing) return <BootstrapScreen />
  if (role !== "member") return <Redirect href="/" />

  return (
    <Stack
      screenOptions={({ route }) => ({
        headerShown: false,
        ...stackTransition(route.name, reduceMotion),
      })}
    />
  )
}
