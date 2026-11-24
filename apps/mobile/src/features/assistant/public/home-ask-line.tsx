import { Icon } from "@/components/ui/icon"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { assistantSuggestions } from "@halaalvest/assistant/suggestions"
import { useIsFocused } from "@react-navigation/native"
import { useRouter } from "expo-router"
import { useEffect, useMemo, useState } from "react"
import { AccessibilityInfo, AppState, View } from "react-native"
import { useReducedMotion } from "react-native-reanimated"
import { AssistantMark } from "../components/assistant-ui"
import {
  buildHomeAskQuestions,
  type HomeAskTypewriter,
  HOME_ASK_MAX_LENGTH,
  stepHomeAskTypewriter,
} from "../model/home-ask-line"

/** Reduce Motion and screen readers: swap whole questions this often. */
const SWAP_MS = 4200

function useScreenReaderEnabled() {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    let alive = true
    void AccessibilityInfo.isScreenReaderEnabled().then((value) => {
      if (alive) setEnabled(value)
    })
    const sub = AccessibilityInfo.addEventListener("screenReaderChanged", setEnabled)
    return () => {
      alive = false
      sub.remove()
    }
  }, [])
  return enabled
}

function useAppActive() {
  const [active, setActive] = useState(AppState.currentState === "active")
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => setActive(state === "active"))
    return () => sub.remove()
  }, [])
  return active
}

/**
 * Member home's way into the assistant (T31, workshop 31-home-ask ·
 * 04 Quiet line): one flat line where a question types itself, holds and
 * rotates (a financing question first when home shows money owed, then the
 * registry suggestions). Tapping the line opens Ask with the keyboard up;
 * the send square asks the question on screen. Offline it is a muted note.
 * Reduce Motion swaps whole questions; with a screen reader the first
 * question stays put so its label never changes under focus.
 */
export function HomeAskLine({ financingOutstanding }: { financingOutstanding: number }) {
  const router = useRouter()
  const runtime = useMobileRuntime()
  const largeText = useLargeTextLayout()
  const reduceMotion = useReducedMotion()
  const screenReader = useScreenReaderEnabled()
  const focused = useIsFocused()
  const appActive = useAppActive()
  const offline = runtime.state.connectivity === "offline"
  const questions = useMemo(
    () =>
      buildHomeAskQuestions({
        financingOutstanding,
        suggestions: assistantSuggestions("member", "native", 3).map((item) => item.label),
      }),
    [financingOutstanding]
  )
  const [frame, setFrame] = useState<HomeAskTypewriter>({ chars: 0, index: 0, phase: "type" })
  const still = reduceMotion || screenReader
  const running = focused && appActive && !offline && !screenReader && questions.length > 0

  useEffect(() => {
    if (!running) return
    let timer: ReturnType<typeof setTimeout>
    let current = frame
    const tick = () => {
      if (reduceMotion) {
        current = { chars: 0, index: (current.index + 1) % questions.length, phase: "hold" }
        setFrame(current)
        timer = setTimeout(tick, SWAP_MS)
        return
      }
      const next = stepHomeAskTypewriter(current, questions)
      current = next.state
      setFrame(current)
      timer = setTimeout(tick, next.delay)
    }
    timer = setTimeout(tick, reduceMotion ? SWAP_MS : 400)
    return () => clearTimeout(timer)
    // `frame` seeds the loop once per run; the loop owns it after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, reduceMotion, running])

  if (offline) {
    return (
      <View
        accessibilityLabel="Reconnect to ask the assistant"
        accessible
        className="min-h-[52px] flex-row items-center gap-[10px] rounded-[14px] bg-muted px-[14px] py-[10px]"
        testID="home-ask-line-offline"
      >
        <Icon className="size-[18px] text-muted-foreground" name="WifiOff" />
        <Text className="min-w-0 flex-1 text-muted-foreground" variant="small">
          Reconnect to ask the assistant
        </Text>
      </View>
    )
  }

  const question = questions[frame.index % Math.max(1, questions.length)] ?? ""
  const shown = still ? question : question.slice(0, frame.chars)
  const open = (params: { focus: "1" } | { send: string }) =>
    router.push({ pathname: "/ask-assistant", params } as never)

  return (
    <View
      className="min-h-[52px] flex-row items-center gap-[6px] rounded-[14px] border border-border bg-card p-[5px]"
      testID="home-ask-line"
    >
      <Pressable
        accessibilityHint="Opens the assistant with the keyboard up"
        accessibilityLabel="Ask the assistant"
        accessibilityRole="button"
        className="min-h-[40px] min-w-0 flex-1 flex-row items-center gap-[10px] rounded-[10px] pl-[5px]"
        haptic
        onPress={() => open({ focus: "1" })}
        testID="home-ask-line-open"
      >
        <AssistantMark size={32} />
        <Text
          className="min-w-0 flex-1 font-semibold text-foreground"
          numberOfLines={largeText ? undefined : 1}
          variant="body"
        >
          {shown}
          {still ? null : <Text className="text-primary">|</Text>}
        </Text>
      </Pressable>
      {question ? (
        <Pressable
          accessibilityLabel={`Ask: ${question}`}
          accessibilityRole="button"
          className="size-[40px] items-center justify-center rounded-[9px] bg-primary"
          haptic
          hitSlop={2}
          onPress={() => open({ send: question.slice(0, HOME_ASK_MAX_LENGTH) })}
          testID="home-ask-line-send"
        >
          <Icon className="size-[19px] text-primary-foreground" name="ArrowUp" />
        </Pressable>
      ) : null}
    </View>
  )
}
