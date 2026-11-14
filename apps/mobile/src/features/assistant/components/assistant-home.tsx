import { Icon } from "@/components/ui/icon"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"
import type { AssistantConversationSummary } from "@halaalvest/assistant/contracts"
import { View } from "react-native"

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

/** Assistant home (EwaTrade A2a v2.2, Prompt rows): greeting, role prompts, Recent. */
export function AssistantHome({
  name,
  suggestions,
  chats,
  disabled,
  offline,
  onSuggestion,
  onChat,
  onAllChats,
}: {
  name?: string
  suggestions: AssistantSuggestion[]
  chats: AssistantConversationSummary[]
  disabled: boolean
  offline: boolean
  onSuggestion: (prompt: AssistantPrompt) => void
  onChat: (id: string) => void
  onAllChats: () => void
}) {
  const firstName = name?.trim().split(/\s+/)[0]
  const hour = Number(
    new Date().toLocaleTimeString("en-NG", {
      hour: "numeric",
      hour12: false,
      timeZone: "Africa/Lagos",
    })
  )
  return (
    <View className="pt-0.5">
      <Text
        accessibilityRole="header"
        className="mb-3.5 text-2xl font-extrabold leading-[30px] tracking-tight text-foreground"
      >
        {assistantGreeting(Number.isFinite(hour) ? hour : new Date().getHours())}
        {firstName ? `, ${firstName}` : ""}
      </Text>
      {offline ? (
        <View className="mb-3.5 gap-1 rounded-[18px] border border-warn/40 bg-warn/10 p-3">
          <Text className="text-base font-bold text-warn">You’re offline</Text>
          <Text className="text-base leading-[22px] text-foreground">
            Reconnect to ask or open a chat.
          </Text>
        </View>
      ) : null}
      <View
        className={cn(
          "overflow-hidden rounded-[18px] border border-border bg-card",
          disabled && "opacity-45"
        )}
      >
        {suggestions.map((suggestion) => {
          const look = capabilityLook[suggestion.capabilityId]
          const prompt = assistantPrompt(suggestion)
          return (
            <Row
              key={suggestion.capabilityId}
              icon={look?.icon ?? "Info"}
              title={suggestion.label}
              meta={look?.sub}
              trailing={<PromptGlyph send={prompt.send} />}
              disabled={disabled}
              onPress={() => onSuggestion(prompt)}
            />
          )
        })}
      </View>
      {chats.length ? (
        <>
          <View className="mb-2 mt-5 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-foreground">Recent</Text>
            <Pressable
              accessibilityRole="button"
              className="min-h-11 justify-center px-1"
              disabled={disabled}
              onPress={onAllChats}
            >
              <Text className="text-base font-bold text-brand">All chats</Text>
            </Pressable>
          </View>
          <View className="overflow-hidden rounded-[18px] border border-border bg-card">
            {chats.map((chat) => (
              <AssistantChatRow
                key={chat.id}
                chat={chat}
                disabled={disabled}
                onPress={() => onChat(chat.id)}
              />
            ))}
          </View>
        </>
      ) : null}
    </View>
  )
}
