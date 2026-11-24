import { stackTransition } from "@/lib/screen-transition"
import { Stack } from "expo-router"
import { useReducedMotion } from "react-native-reanimated"

export default function AuthLayout() {
  const reduceMotion = useReducedMotion()

  return (
    <Stack
      screenOptions={({ route }) => ({
        headerShown: false,
        ...stackTransition(route.name, reduceMotion),
      })}
    />
  )
}
