import { Icon } from "@/components/ui/icon"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { assistantSuggestions } from "@halaalvest/assistant/suggestions"
import { cn } from "@/lib/utils"
import { useRouter } from "expo-router"
import { ScrollView, View } from "react-native"

/**
 * Home's way into the assistant (ported from EwaTrade's Home Ask bar): a bar
 * that opens Ask with the keyboard up, and role-shaped questions from the
 * capability registry that open Ask with the question sent. Hidden offline.
 */
export function HomeAskBar({
  floating = false,
  role,
}: {
  /** Raised bar without a border, for a bar that overlaps the hero's edge. */
  floating?: boolean
  role: "member" | "staff"
}) {
  const router = useRouter()
  const runtime = useMobileRuntime()
  const largeText = useLargeTextLayout()
  if (runtime.state.connectivity === "offline") return null
  const questions = assistantSuggestions(
    role === "member" ? "member" : "finance_officer",
    "native",
    3
  ).map((suggestion) => suggestion.label)
  // Typed routes learn `/ask-assistant` when Metro regenerates them.
  const open = (params: { focus: "1" } | { send: string }) =>
    router.push({ pathname: "/ask-assistant", params } as never)
  const chips = questions.map((question) => (
    <View className="rounded-full bg-card" key={question}>
      <Pressable
        accessibilityLabel={`Ask: ${question}`}
        accessibilityRole="button"
        className="min-h-[38px] justify-center rounded-full border border-border px-3.5 py-1.5"
        haptic
        onPress={() => open({ send: question.slice(0, 160) })}
      >
        <Text
          className="text-sm font-bold leading-[22px] text-foreground"
          numberOfLines={largeText ? undefined : 1}
        >
          {question}
        </Text>
      </Pressable>
    </View>
  ))
  return (
    <View className="mt-4" testID="home-ask-bar">
      <View
        className={cn(
          "rounded-full bg-card",
          floating ? "shadow-lg" : "shadow-sm"
        )}
      >
        <Pressable
          accessibilityLabel="Ask the assistant"
          accessibilityRole="button"
          className={cn(
            "min-h-[52px] flex-row items-center gap-2.5 rounded-full border py-2 pl-2.5 pr-4",
            floating ? "border-transparent dark:border-border" : "border-border"
          )}
          haptic
          onPress={() => open({ focus: "1" })}
          testID="home-ask-bar-open"
        >
          <View className="size-8 items-center justify-center rounded-full bg-brand-warm">
            <Icon className="size-[17px] text-hero-mark-foreground" name="WandSparkles" />
          </View>
          <Text
            className="min-w-0 flex-1 text-base leading-6 text-muted-foreground"
            numberOfLines={largeText ? undefined : 1}
          >
            {role === "member"
              ? "Ask about your savings, financing or receipts…"
              : "Ask about members, receipts or payments…"}
          </Text>
        </Pressable>
      </View>
      {chips.length ? (
        largeText ? (
          <View className="mt-2.5 flex-row flex-wrap gap-2">{chips}</View>
        ) : (
          <ScrollView
            className="-mx-5 mt-2.5 grow-0"
            contentContainerClassName="gap-2 px-5 pb-1"
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {chips}
          </ScrollView>
        )
      ) : null}
    </View>
  )
}
