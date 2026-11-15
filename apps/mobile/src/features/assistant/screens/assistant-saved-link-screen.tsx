import { Button } from "@/components/ui/button"
import { Text } from "@/components/ui/text"
import { ActivityIndicator, ScrollView, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useColors } from "@/hooks/use-color"
import { AssistantHeader } from "../components/assistant-ui"

export type SavedLinkState =
  | "waiting"
  | "opening"
  | "invalid"
  | "signed-out"
  | "no-access"
  | "offline"
  | "unavailable"
  | "error"

const copy = (
  thing: "answer" | "draft"
): Record<SavedLinkState, { title: string; body?: string }> => ({
  waiting: { title: `Opening your ${thing}…` },
  opening: { title: `Opening your ${thing}…` },
  invalid: {
    title: `This ${thing} isn't available`,
    body: "The link is incomplete. Ask the assistant again.",
  },
  "signed-out": {
    title: `Sign in to see this ${thing}`,
    body: "Use the account that saved it, then open the link again.",
  },
  "no-access": {
    title: `This ${thing} isn't available`,
    body: "App access is needed to use the assistant.",
  },
  offline: {
    title: "You're offline",
    body: `Reconnect to open this ${thing}.`,
  },
  unavailable: {
    title: `This ${thing} isn't available`,
    body: `It may have been removed, or it belongs to another account or cooperative. Nothing was changed.`,
  },
  error: {
    title: `Couldn't open this ${thing}`,
    body: "Check your connection, then try again.",
  },
})

/**
 * Landing for a saved-answer or draft link (ported from EwaTrade's
 * `response-link-screen`). It only shows where the link stands; opening a
 * link never confirms or changes anything.
 */
export function AssistantSavedLinkScreen({
  kind,
  state,
  onRetry,
  onSignIn,
  onOpenAssistant,
}: {
  kind: "message" | "proposal"
  state: SavedLinkState
  onRetry: () => void
  onSignIn: () => void
  onOpenAssistant: () => void
}) {
  const insets = useSafeAreaInsets()
  const colors = useColors()
  const text = copy(kind === "message" ? "answer" : "draft")[state]
  const busy = state === "waiting" || state === "opening"
  return (
    <View className="flex-1 bg-card" style={{ paddingTop: insets.top }}>
      <AssistantHeader title="Assistant" />
      <ScrollView
        contentContainerStyle={{
          padding: 24,
          gap: 16,
          flexGrow: 1,
          justifyContent: "center",
        }}
      >
        {busy ? <ActivityIndicator color={colors.mutedForeground} /> : null}
        <Text
          accessibilityRole="header"
          className="text-2xl font-bold text-foreground"
        >
          {text.title}
        </Text>
        {text.body ? (
          <Text className="text-base leading-[22px] text-muted-foreground">
            {text.body}
          </Text>
        ) : null}
        {state === "signed-out" ? (
          <Button onPress={onSignIn}>
            <Text>Sign in</Text>
          </Button>
        ) : null}
        {state === "offline" || state === "error" ? (
          <Button onPress={onRetry}>
            <Text>Try again</Text>
          </Button>
        ) : null}
        {state === "unavailable" || state === "invalid" || state === "error" ? (
          <Button variant="outline" onPress={onOpenAssistant}>
            <Text>Open assistant</Text>
          </Button>
        ) : null}
      </ScrollView>
    </View>
  )
}
