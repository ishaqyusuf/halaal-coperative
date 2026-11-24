import { stackTransition } from "@/lib/screen-transition"
import { Stack } from "expo-router"
import { useReducedMotion } from "react-native-reanimated"

/**
 * Members have no bottom tabs (T31, ADR-20261124-member-home-is-the-hub):
 * home is the only top-level screen and Plans, Finance and Shares are pushed
 * from it with Back. The group keeps its historical `(tabs)` name so every
 * existing href (`/(member)/(tabs)/financing`), URL (`/financing`),
 * notification, shortcut and assistant link still resolves unchanged.
 * The account menu (`more`) rises from the bottom; `search` is pushed.
 */
export default function MemberHubLayout() {
  const reduceMotion = useReducedMotion()

  return (
    <Stack
      screenOptions={({ route }) => ({
        headerShown: false,
        ...stackTransition(route.name, reduceMotion),
      })}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="commitments" />
      <Stack.Screen name="financing" />
      <Stack.Screen name="shares" />
      <Stack.Screen name="more" />
      <Stack.Screen name="search" />
    </Stack>
  )
}
