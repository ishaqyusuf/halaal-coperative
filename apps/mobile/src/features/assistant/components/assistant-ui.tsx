import { Icon } from "@/components/ui/icon"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { useColors } from "@/hooks/use-color"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { cn } from "@/lib/utils"
import { useRouter } from "expo-router"
import { type ReactNode, useRef, useState } from "react"
import {
  ActivityIndicator,
  LayoutAnimation,
  Text as NativeText,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native"
import { useKeyboardState } from "react-native-keyboard-controller"
import { useReducedMotion } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { AssistantText } from "./assistant-text"

/** Ported from EwaTrade's mobile assistant (`assistant-ui.tsx`). */
export const ASSISTANT_MESSAGE_MAX = 4000

// The composer eases between one row and stacked instead of jumping.
const stackMotion = {
  duration: 200,
  create: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
  update: { type: LayoutAnimation.Types.easeInEaseOut },
}

function easeStack(reduceMotion: boolean) {
  if (!reduceMotion) LayoutAnimation.configureNext(stackMotion)
}

type HeaderIcon = {
  icon: "History" | "MessageSquarePlus"
  label: string
  onPress: () => void
}

export function AssistantHeader({
  title,
  subtitle,
  disabled,
  icons,
}: {
  title: string
  subtitle?: string
  disabled?: boolean
  /** Icon buttons on the right. */
  icons?: HeaderIcon[]
}) {
  const router = useRouter()
  return (
    <View className="border-b border-border bg-card px-[18px] pb-3 pt-2">
      <View className="flex-row items-center gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close assistant"
          className="size-11 items-center justify-center rounded-full"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/")
          }
        >
          <Icon name="X" className="size-[20px] text-foreground" />
        </Pressable>
        <View className="min-w-0 flex-1">
          <Text
            accessibilityRole="header"
            className="text-lg font-bold leading-[26px] text-foreground"
          >
            {title}
          </Text>
          {subtitle ? (
            // One line: a wrapped line here was measured one line tall and
            // clipped at large text.
            <Text
              className="text-base leading-[22px] text-muted-foreground"
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {icons?.map((item) => (
          <Pressable
            key={item.label}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityState={{ disabled }}
            className="size-11 items-center justify-center rounded-full"
            disabled={disabled}
            onPress={item.onPress}
          >
            <Icon
              name={item.icon}
              className={cn(
                "size-[20px]",
                disabled ? "text-muted-foreground" : "text-foreground"
              )}
            />
          </Pressable>
        ))}
      </View>
    </View>
  )
}

/**
 * One chat turn: the person's words in a muted bubble on the right; the
 * assistant's reply as open text across the thread, with any cards under it.
 */
export function AssistantBubble({
  text,
  user = false,
  pending = false,
  children,
}: {
  text: string
  user?: boolean
  /** Sent, waiting for the reply (or not yet delivered). */
  pending?: boolean
  children?: ReactNode
}) {
  if (user)
    return (
      <View className="items-end gap-2">
        <View
          className={cn(
            "max-w-[82%] rounded-[18px] rounded-br-[6px] border border-border bg-muted px-3.5 py-2.5",
            pending && "opacity-70"
          )}
        >
          <AssistantText text={text} />
        </View>
        {children}
      </View>
    )
  return (
    <View className="min-w-0 gap-3">
      {text ? <AssistantText text={text} /> : null}
      {children}
    </View>
  )
}

/**
 * One rounded pill: text · send. Holding a second line or a line break it
 * opens into a card — text, then the button. The text field keeps its place
 * so focus survives. (EwaTrade's voice and attachments are not in the first
 * release.)
 */
export function AssistantComposer({
  value,
  placeholder = "Ask anything",
  onChange,
  onSend,
  busy,
  disabled,
  reason,
  inputRef,
}: {
  inputRef?: { current: TextInput | null }
  value: string
  placeholder?: string
  onChange: (value: string) => void
  onSend: () => void
  busy: boolean
  disabled: boolean
  reason?: string
}) {
  const insets = useSafeAreaInsets()
  const keyboardVisible = useKeyboardState((state) => state.isVisible)
  const colors = useColors()
  const reduceMotion = useReducedMotion()
  // One line of scaled text plus padding, so 200% text isn't clipped.
  const { fontScale } = useWindowDimensions()
  const lineHeight = Math.ceil(22 * fontScale)
  // The text length at which one line overflowed the pill; shorter again,
  // the box returns to a pill.
  const [wrapAt, setWrapAt] = useState<number | null>(null)
  const oneLine = useRef(Number.POSITIVE_INFINITY)
  if (wrapAt !== null && (!value || value.length < wrapAt)) setWrapAt(null)
  const stacked = wrapAt !== null || value.includes("\n")
  const tooLong = value.length > ASSISTANT_MESSAGE_MAX
  const sendDisabled = disabled || busy || !value.trim() || tooLong
  const send = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Send message"
      accessibilityState={{ disabled: sendDisabled }}
      className={cn(
        "size-11 items-center justify-center rounded-full bg-foreground",
        sendDisabled && "opacity-40"
      )}
      disabled={sendDisabled}
      haptic
      onPress={onSend}
    >
      <Icon name="Send" className="size-[19px] text-background" />
    </Pressable>
  )
  return (
    <View className="gap-2 border-t border-border bg-card px-3 pt-1.5">
      {reason ? (
        <Text
          accessibilityLiveRegion="polite"
          className="text-base leading-[22px] text-muted-foreground"
        >
          {reason}
        </Text>
      ) : null}
      {tooLong ? (
        <Text
          accessibilityLiveRegion="polite"
          className="text-base leading-[22px] text-destructive"
        >
          Shorten the message to 4,000 characters before sending.
        </Text>
      ) : null}
      <View
        className={cn(
          "gap-1.5 border border-border bg-card",
          stacked ? "rounded-[28px] p-2" : "rounded-full p-[5px]"
        )}
      >
        <View
          className={cn(
            stacked ? "flex-col items-stretch gap-0.5" : "flex-row items-center gap-1"
          )}
        >
          <View className={stacked ? undefined : "flex-1"}>
            <TextInput
              ref={inputRef}
              accessibilityLabel="Message the assistant"
              accessibilityHint={value ? undefined : placeholder}
              className={cn(
                "text-base",
                stacked ? "px-2.5 pb-1.5 pt-2" : "px-1.5 py-[9px]"
              )}
              editable={!disabled && !busy}
              maxLength={ASSISTANT_MESSAGE_MAX + 1}
              multiline
              value={value}
              onChangeText={(next) => {
                // Each added or removed line eases the box's height.
                easeStack(reduceMotion)
                if (wrapAt !== null && next.length < wrapAt) setWrapAt(null)
                onChange(next)
              }}
              onContentSizeChange={(event) => {
                if (stacked || wrapAt !== null) return
                const height = event.nativeEvent.contentSize.height
                oneLine.current = Math.min(oneLine.current, height)
                if (value && height > oneLine.current + lineHeight / 2) {
                  easeStack(reduceMotion)
                  setWrapAt(value.length)
                }
              }}
              selectionColor={colors.brand}
              style={{
                color: colors.foreground,
                lineHeight: 22,
                maxHeight: 160,
                minHeight: Math.max(stacked ? 44 : 40, lineHeight + 18),
              }}
            />
            {value ? null : (
              // The field's own placeholder wraps on a multiline input; this
              // one stays on one line and ends with "…".
              <NativeText
                accessibilityElementsHidden
                className={cn(
                  "absolute text-base leading-[22px] text-muted-foreground",
                  stacked ? "left-2.5 right-2.5 top-2" : "left-1.5 right-1.5 top-[9px]"
                )}
                importantForAccessibility="no-hide-descendants"
                numberOfLines={1}
                pointerEvents="none"
              >
                {placeholder}
              </NativeText>
            )}
          </View>
          {stacked ? (
            <View className="flex-row items-center justify-end">{send}</View>
          ) : (
            send
          )}
        </View>
      </View>
      {/* The keyboard already covers the system bar, so the safe-area gap
          only applies while it is closed. */}
      <View
        style={{ height: keyboardVisible ? 8 : Math.max(insets.bottom, 8) }}
      />
    </View>
  )
}

export function AssistantThinking({ label = "Thinking…" }: { label?: string }) {
  const colors = useColors()
  return (
    // Replies sit open at the thread's edge, so this lines up with them.
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      className="flex-row items-center gap-2"
    >
      <ActivityIndicator color={colors.mutedForeground} />
      <Text className="text-base leading-[22px] text-muted-foreground">
        {label}
      </Text>
    </View>
  )
}

/** "Today", "Yesterday" or "Mon 6 Oct", for the thread's day markers. */
export function assistantDay(date: Date | undefined, now = new Date()) {
  const day = date ?? now
  const days = Math.round(
    (new Date(now.toDateString()).getTime() -
      new Date(day.toDateString()).getTime()) /
      86_400_000
  )
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  return day.toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}

/** Day marker above the first message of each day. */
export function AssistantDayMarker({
  previous,
  current,
}: {
  previous?: string
  current: string
}) {
  const day = assistantDay(new Date(current))
  if (previous && assistantDay(new Date(previous)) === day) return null
  return (
    <View className="mb-1 items-center">
      <View className="rounded-full bg-muted px-2.5 py-0.5">
        <Text className="text-sm font-extrabold leading-5 text-muted-foreground">
          {day}
        </Text>
      </View>
    </View>
  )
}

/** "as of 6:25 PM" today, else "as of 9 Oct, 6:25 PM" (cooperative time). */
export function assistantAsOf(iso: string, now = new Date()) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const options = { timeZone: "Africa/Lagos" } as const
  const time = date.toLocaleTimeString("en-NG", {
    ...options,
    hour: "numeric",
    minute: "2-digit",
  })
  const day = (value: Date) =>
    value.toLocaleDateString("en-NG", { ...options, day: "numeric", month: "short" })
  return day(date) === day(now) ? `as of ${time}` : `as of ${day(date)}, ${time}`
}

/** Large text stacks two-up rows; kept here so cards share one rule. */
export function useAssistantStacked() {
  return useLargeTextLayout()
}
