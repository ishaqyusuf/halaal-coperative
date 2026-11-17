import { ScreenHeaderButton } from "@/components/app/screen-shell"
import { Icon } from "@/components/ui/icon"
import { Elevated } from "@/components/ui/list-card"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { useColors } from "@/hooks/use-color"
import { cn } from "@/lib/utils"
import type { AssistantConversationSummary } from "@halaalvest/assistant/contracts"
import { View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { AssistantMark } from "./assistant-ui"

type IconName =
  | "Landmark"
  | "Wallet"
  | "ReceiptText"
  | "Send"
  | "Search"
  | "History"
  | "ClipboardCheck"
  | "HandCoins"
  | "Info"
  | "Headphones"

/** Each registry capability's icon and short line (EwaTrade design 25). */
const capabilityLook: Record<string, { icon: IconName; sub: string; send: boolean }> = {
  M01: { icon: "Landmark", sub: "Requests, balance and next due", send: true },
  M02: { icon: "Wallet", sub: "Savings, shares and profit", send: true },
  M03: { icon: "ReceiptText", sub: "Submitted and approved", send: true },
  M04: { icon: "Send", sub: "Amount, date and reference", send: false },
  M05: { icon: "HandCoins", sub: "Financing, refunds and money owed", send: true },
  S01: { icon: "Search", sub: "By name or member number", send: false },
  S02: { icon: "History", sub: "Balances and recent receipts", send: false },
  S03: { icon: "ClipboardCheck", sub: "Waiting and needing correction", send: true },
  S04: { icon: "HandCoins", sub: "Member, amount and month", send: false },
  X01: { icon: "Info", sub: "Everything I can do", send: true },
  X02: { icon: "Headphones", sub: "Open a support request", send: true },
}

/** A request that needs details opens the composer; a question sends. */
const draftPrompt: Record<string, string> = {
  M04: "Here's proof I paid ",
  S01: "Find member ",
  S02: "Show history for ",
  S04: "Record a payment of ",
}

export type AssistantSuggestion = {
  capabilityId: string
  label: string
}

export type AssistantPrompt = {
  title: string
  prompt: string
  send: boolean
}

export function assistantPrompt(suggestion: AssistantSuggestion): AssistantPrompt {
  const look = capabilityLook[suggestion.capabilityId]
  const draft = draftPrompt[suggestion.capabilityId]
  return {
    title: suggestion.label,
    prompt: draft ?? suggestion.label,
    send: draft ? false : (look?.send ?? true),
  }
}

/** "Good morning" by the cooperative's local hour. */
export function assistantGreeting(hour: number) {
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function chatDay(iso: string) {
  const date = new Date(iso)
  const today = new Date()
  const days = Math.round(
    (new Date(today.toDateString()).getTime() -
      new Date(date.toDateString()).getTime()) /
      86_400_000
  )
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  return date.toLocaleDateString("en-NG", { day: "numeric", month: "short" })
}

function Row({
  icon,
  title,
  meta,
  trailing,
  disabled,
  onPress,
  accessibilityLabel,
}: {
  icon: IconName | "MessagesSquare"
  title: string
  meta?: string | null
  trailing?: React.ReactNode
  disabled?: boolean
  onPress?: () => void
  accessibilityLabel?: string
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className="min-h-[60px] flex-row items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0"
      disabled={disabled}
      haptic
      onPress={onPress}
    >
      <View className="size-10 items-center justify-center rounded-full bg-accent">
        <Icon name={icon} className="size-[18px] text-accent-foreground" />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-base font-semibold leading-[22px] text-foreground">
          {title}
        </Text>
        {meta ? (
          <Text className="text-sm leading-5 text-muted-foreground" numberOfLines={2}>
            {meta}
          </Text>
        ) : null}
      </View>
      {trailing}
    </Pressable>
  )
}

/** Questions send at once (arrow); requests fill the box (pencil). */
function PromptGlyph({ send }: { send: boolean }) {
  return (
    <View
      className={cn(
        "size-[30px] items-center justify-center rounded-full",
        send && "bg-muted"
      )}
    >
      <Icon
        className={cn("size-[16px]", send ? "text-foreground" : "text-muted-foreground")}
        name={send ? "ArrowUpRight" : "MessageSquareText"}
      />
    </View>
  )
}

export function AssistantChatRow({
  chat,
  onPress,
  disabled,
}: {
  chat: AssistantConversationSummary
  onPress: () => void
  disabled?: boolean
}) {
  return (
    <Row
      icon="MessagesSquare"
      title={chat.title || "New chat"}
      meta={[chatDay(chat.updatedAt), chat.lastMessagePreview]
        .filter(Boolean)
        .join(" · ")}
      disabled={disabled}
      onPress={onPress}
    />
  )
}

/** Assistant home (T25, 02 Brand hero): hero greeting, suggestion tiles, Recent. */
export function AssistantHome({
  name,
  cooperativeName,
  role,
  suggestions,
  chats,
  disabled,
  offline,
  onSuggestion,
  onChat,
  onAllChats,
  onClose,
}: {
  name?: string
  cooperativeName?: string
  role?: "member" | "staff"
  suggestions: AssistantSuggestion[]
  chats: AssistantConversationSummary[]
  disabled: boolean
  offline: boolean
  onSuggestion: (prompt: AssistantPrompt) => void
  onChat: (id: string) => void
  onAllChats: () => void
  onClose: () => void
}) {
  const insets = useSafeAreaInsets()
  const colors = useColors()
  const firstName = name?.trim().split(/\s+/)[0]
  const hour = Number(
    new Date().toLocaleTimeString("en-NG", {
      hour: "numeric",
      hour12: false,
      timeZone: "Africa/Lagos",
    })
  )
  return (
    <View className="gap-[16px]">
      <View
        style={{
          backgroundColor: colors.heroMid,
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
          experimental_backgroundImage: `linear-gradient(165deg, ${colors.heroStart} 0%, ${colors.heroMid} 55%, ${colors.heroEnd} 100%)`,
          marginHorizontal: -18,
          marginTop: -18,
          paddingBottom: 26,
          paddingHorizontal: 18,
          paddingTop: insets.top + 8,
        }}
      >
        <View className="flex-row items-center justify-between">
          <ScreenHeaderButton
            accessibilityLabel="Close assistant"
            icon="X"
            onPress={onClose}
            tone="inverse"
          />
          {offline ? null : (
            <ScreenHeaderButton
              accessibilityLabel="All chats"
              icon="History"
              onPress={onAllChats}
              tone="inverse"
            />
          )}
        </View>
        <View className="mb-[12px] mt-[14px]">
          <AssistantMark size={56} />
        </View>
        {cooperativeName ? (
          <Text className="text-hero-foreground/80" numberOfLines={1} variant="label">
            {cooperativeName}
          </Text>
        ) : null}
        <Text accessibilityRole="header" className="mt-[4px] text-hero-foreground" variant="screenTitle">
          {assistantGreeting(Number.isFinite(hour) ? hour : new Date().getHours())}
          {firstName ? `, ${firstName}` : ""}
        </Text>
        <Text className="mt-[4px] text-hero-foreground/80" variant="small">
          {role === "staff"
            ? "Ask about members, receipts or payments."
            : "Ask about your savings, financing or receipts."}
        </Text>
      </View>
      {offline ? (
        <View className="gap-1 rounded-[18px] bg-tint-warm p-3">
          <Text className="font-bold text-tint-warm-foreground" variant="body">
            You’re offline
          </Text>
          <Text className="text-tint-warm-foreground" variant="small">
            Reconnect to ask or open a chat.
          </Text>
        </View>
      ) : null}
      <Text className="text-muted-foreground" variant="label">
        Try asking
      </Text>
      <View className={cn("flex-row flex-wrap gap-[10px]", disabled && "opacity-45")}>
        {suggestions.slice(0, 6).map((suggestion) => {
          const look = capabilityLook[suggestion.capabilityId]
          const prompt = assistantPrompt(suggestion)
          return (
            <View className="basis-[47%] grow" key={suggestion.capabilityId}>
            <Elevated className="flex-1 rounded-[18px] bg-card" radius={18}>
              <Pressable
                accessibilityHint={prompt.send ? "Sends this question" : "Fills the message box"}
                accessibilityLabel={suggestion.label}
                accessibilityRole="button"
                accessibilityState={{ disabled }}
                className="min-h-[132px] gap-[4px] p-[14px] active:opacity-80"
                disabled={disabled}
                haptic
                onPress={() => onSuggestion(prompt)}
              >
                <View className="mb-[8px] size-[40px] items-center justify-center rounded-[12px] bg-accent">
                  <Icon className="size-[18px] text-accent-foreground" name={look?.icon ?? "Info"} />
                </View>
                <Text className="pr-[22px] font-bold" variant="body">
                  {suggestion.label}
                </Text>
                {look?.sub ? (
                  <Text className="text-muted-foreground" variant="caption">
                    {look.sub}
                  </Text>
                ) : null}
                <View className="absolute right-[12px] top-[12px]">
                  <PromptGlyph send={prompt.send} />
                </View>
              </Pressable>
            </Elevated>
            </View>
          )
        })}
      </View>
      {chats.length ? (
        <>
          <View className="mt-[4px] flex-row items-center justify-between">
            <Text variant="section">Recent</Text>
            <Pressable
              accessibilityRole="button"
              className="min-h-11 justify-center px-1"
              disabled={disabled}
              onPress={onAllChats}
            >
              <Text className="text-primary" variant="label">
                All chats
              </Text>
            </Pressable>
          </View>
          <Elevated className="overflow-hidden rounded-[20px] bg-card" radius={20}>
            {chats.map((chat) => (
              <AssistantChatRow
                key={chat.id}
                chat={chat}
                disabled={disabled}
                onPress={() => onChat(chat.id)}
              />
            ))}
          </Elevated>
        </>
      ) : null}
    </View>
  )
}
