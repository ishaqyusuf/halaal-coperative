import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Elevated } from "@/components/ui/list-card"
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
  cooperativeName,
}: {
  cooperativeName?: string
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
  const badge: { icon: string; surface: string; text: string } =
    state === "offline"
      ? { icon: "WifiOff", surface: "bg-tint-warm", text: "text-tint-warm-foreground" }
      : state === "signed-out" || state === "no-access"
        ? { icon: "Lock", surface: "bg-tint-sky", text: "text-tint-sky-foreground" }
        : state === "error"
          ? { icon: "CircleAlert", surface: "bg-tint-danger", text: "text-tint-danger-foreground" }
          : { icon: "Link2Off", surface: "bg-surface-raised", text: "text-foreground-soft" }
  return (
    // 03 Card lanes (T25): the chat header, then one status row card.
    <View className="bg-background" style={{ flex: 1, paddingTop: insets.top }}>
      <AssistantHeader subtitle={cooperativeName} title="Assistant" />
      <ScrollView contentContainerStyle={{ gap: 14, padding: 18 }}>
        <Elevated className="rounded-[20px] bg-card" radius={20}>
          <View className="flex-row items-start gap-[12px] p-[14px]">
            <View className={`size-[40px] items-center justify-center rounded-[12px] ${busy ? "bg-accent" : badge.surface}`}>
              {busy ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Icon className={`size-[18px] ${badge.text}`} name={badge.icon} />
              )}
            </View>
            <View className="min-w-0 flex-1 gap-[2px]">
              <Text accessibilityRole="header" className="font-bold" variant="body">
                {text.title}
              </Text>
              <Text className="text-muted-foreground" variant="small">
                {text.body ?? "Opening it never confirms or changes anything."}
              </Text>
            </View>
          </View>
        </Elevated>
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
          <Button onPress={onOpenAssistant} variant="secondary">
            <Text>Open assistant</Text>
          </Button>
        ) : null}
      </ScrollView>
    </View>
  )
}
