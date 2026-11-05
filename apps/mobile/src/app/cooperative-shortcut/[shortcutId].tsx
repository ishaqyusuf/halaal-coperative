import { CooperativeShortcutRouteController } from "@/features/cooperative-shortcuts/routes/cooperative-shortcut-route-controller"
import { useLocalSearchParams } from "expo-router"

/** Neutral launcher-shortcut landing; the controller validates the id. */
export default function CooperativeShortcutRoute() {
  const { shortcutId } = useLocalSearchParams<{
    shortcutId?: string | string[]
  }>()

  return (
    <CooperativeShortcutRouteController
      shortcutId={typeof shortcutId === "string" ? shortcutId : undefined}
    />
  )
}
