import { Icon } from "@/components/ui/icon"
import { ListCard } from "@/components/ui/list-card"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { useRouter } from "expo-router"
import { View } from "react-native"
import { AssistantMark } from "../components/assistant-ui"
import { HOME_ASK_MAX_LENGTH } from "../model/home-ask-line"

/**
 * Hands a search the member typed to the assistant (T31 member search):
 * "Ask the assistant" with the query, which opens Ask with it sent. Offline
 * it is not offered, like the home Ask line.
 */
export function AssistantAskRow({ question }: { question: string }) {
  const router = useRouter()
  const runtime = useMobileRuntime()
  const text = question.trim().slice(0, HOME_ASK_MAX_LENGTH)
  if (!text || runtime.state.connectivity === "offline") return null
  return (
    <ListCard>
      <Pressable
        accessibilityLabel={`Ask the assistant: ${text}`}
        accessibilityRole="button"
        className="min-h-[64px] flex-row items-center gap-[12px] px-[14px] py-[10px] active:bg-accent/60"
        haptic
        onPress={() =>
          router.push({ pathname: "/ask-assistant", params: { send: text } } as never)
        }
        testID="assistant-ask-row"
      >
        <AssistantMark size={36} />
        <View className="min-w-0 flex-1 gap-[2px]">
          <Text className="font-bold" variant="body">
            Ask the assistant
          </Text>
          <Text className="text-muted-foreground" numberOfLines={2} variant="small">
            “{text}”
          </Text>
        </View>
        <Icon className="size-sm text-muted-foreground" name="ArrowUp" />
      </Pressable>
    </ListCard>
  )
}
