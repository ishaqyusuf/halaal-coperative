import { OverlayStatusBar } from "@/components/app/screen-status-bar"
import { BottomSearchFooter } from "@/components/search/bottom-search-footer"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Elevated } from "@/components/ui/list-card"
import { Pressable } from "@/components/ui/pressable"
import { ListSkeleton } from "@/components/ui/skeleton"
import { StatusBanner } from "@/components/ui/status-banner"
import { Text } from "@/components/ui/text"
import { useColors } from "@/hooks/use-color"
import type { AssistantConversationSummary } from "@halaalvest/assistant/contracts"
import { useState } from "react"
import { ActivityIndicator, FlatList, View } from "react-native"
import Animated, { FadeIn, FadeOut } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { AssistantChatRow } from "./assistant-home"
import { assistantDay } from "./assistant-ui"

type Row =
  | { kind: "day"; key: string; label: string }
  | { chat: AssistantConversationSummary; key: string; kind: "chat"; position: "first" | "last" | "middle" | "only" }

/** Chats grouped by day, newest first, as flat list rows. */
export function groupChats(chats: readonly AssistantConversationSummary[], now = new Date()) {
  const rows: Row[] = []
  let current: { label: string; items: AssistantConversationSummary[] } | null = null
  const flush = () => {
    if (!current) return
    rows.push({ key: `day:${current.label}`, kind: "day", label: current.label })
    current.items.forEach((chat, index) =>
      rows.push({
        chat,
        key: chat.id,
        kind: "chat",
        position:
          current!.items.length === 1
            ? "only"
            : index === 0
              ? "first"
              : index === current!.items.length - 1
                ? "last"
                : "middle",
      })
    )
  }
  for (const chat of chats) {
    const label = assistantDay(new Date(chat.updatedAt), now) ?? "Earlier"
    if (!current || current.label !== label) {
      flush()
      current = { items: [], label }
    }
    current.items.push(chat)
  }
  flush()
  return rows
}

/**
 * 02 All chats (T25): a full-screen view over the assistant with chats
 * grouped by day, paging on scroll, a search pill past 10 chats (filters the
 * loaded chats) and a docked New chat button.
 */
export function AssistantAllChats({
  chats,
  disabled,
  error,
  fetchingNext,
  loading,
  onChoose,
  onClose,
  onNewChat,
  onNextPage,
  onRetry,
}: {
  chats: readonly AssistantConversationSummary[]
  disabled: boolean
  error: boolean
  fetchingNext: boolean
  loading: boolean
  onChoose: (id: string) => void
  onClose: () => void
  onNewChat: () => void
  onNextPage: () => void
  onRetry: () => void
}) {
  const insets = useSafeAreaInsets()
  const colors = useColors()
  const [search, setSearch] = useState("")
  const term = search.trim().toLowerCase()
  const shown = term
    ? chats.filter((chat) =>
        `${chat.title ?? ""} ${chat.lastMessagePreview ?? ""}`.toLowerCase().includes(term)
      )
    : chats
  const rows = groupChats(shown)
  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(160)}
      style={{ bottom: 0, left: 0, position: "absolute", right: 0, top: 0, zIndex: 10 }}
    >
      <View className="flex-1 bg-background" testID="assistant-all-chats">
        <OverlayStatusBar tone="background" />
        <View style={{ paddingTop: insets.top + 8 }}>
        <View className="flex-row items-center gap-[10px] px-[12px] pb-[10px]">
          <Pressable
            accessibilityLabel="Close all chats"
            accessibilityRole="button"
            className="size-[44px] items-center justify-center rounded-full bg-card"
            onPress={onClose}
          >
            <Icon className="size-[20px] text-foreground" name="X" />
          </Pressable>
          <Text accessibilityRole="header" className="flex-1 text-center" variant="section">
            All chats
          </Text>
          <View className="size-[44px] items-center justify-center">
            <Text className="text-muted-foreground" tabular variant="label">
              {chats.length || ""}
            </Text>
          </View>
        </View>
        </View>
        <FlatList
          contentContainerStyle={{ paddingBottom: 160, paddingHorizontal: 18 }}
          data={rows}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(row) => row.key}
          ListEmptyComponent={
            loading ? (
              <ListSkeleton rows={4} />
            ) : error ? (
              <StatusBanner kind="error" onRetry={onRetry} title="Chats could not load" />
            ) : (
              <View className="items-center gap-[10px] py-[48px]">
                <View className="size-[48px] items-center justify-center rounded-[14px] bg-accent">
                  <Icon className="size-[22px] text-accent-foreground" name="MessagesSquare" />
                </View>
                <Text variant="section">{term ? "No matches" : "No chats yet"}</Text>
                <Text className="text-muted-foreground" variant="small">
                  {term ? `No chat matches “${search.trim()}”.` : "Your saved chats appear here."}
                </Text>
              </View>
            )
          }
          ListFooterComponent={
            fetchingNext ? (
              <View className="min-h-[56px] flex-row items-center justify-center gap-[10px]">
                <ActivityIndicator color={colors.mutedForeground} />
                <Text className="text-muted-foreground" variant="small">
                  Loading more
                </Text>
              </View>
            ) : null
          }
          onEndReached={term ? undefined : onNextPage}
          onEndReachedThreshold={0.4}
          renderItem={({ item }) =>
            item.kind === "day" ? (
              <Text className="pb-[8px] pt-[16px] uppercase tracking-[0.7px] text-muted-foreground" variant="caption">
                {item.label}
              </Text>
            ) : (
              <Elevated
                className={
                  item.position === "only"
                    ? "overflow-hidden rounded-[20px] bg-card"
                    : item.position === "first"
                      ? "overflow-hidden rounded-t-[20px] bg-card"
                      : item.position === "last"
                        ? "overflow-hidden rounded-b-[20px] bg-card"
                        : "overflow-hidden bg-card"
                }
                radius={item.position === "middle" ? 0 : 20}
              >
                <AssistantChatRow
                  chat={item.chat}
                  disabled={disabled}
                  onPress={() => onChoose(item.chat.id)}
                />
              </Elevated>
            )
          }
          showsVerticalScrollIndicator={false}
        />
        <BottomSearchFooter
          accessibilityLabel="Search chats"
          alwaysShowSearch={Boolean(search)}
          bottomOffset={68}
          localSearch
          onChangeText={setSearch}
          placeholder="Search chats"
          searchVisible
          totalCount={chats.length}
          value={search}
        />
        <View
          style={{
            backgroundColor: colors.background,
            bottom: 0,
            left: 0,
            paddingBottom: Math.max(insets.bottom, 12),
            paddingHorizontal: 18,
            paddingTop: 10,
            position: "absolute",
            right: 0,
          }}
        >
          <Button disabled={disabled} onPress={onNewChat} testID="assistant-new-chat">
            <Icon className="size-base text-primary-foreground" name="MessageSquarePlus" />
            <Text>New chat</Text>
          </Button>
        </View>
      </View>
    </Animated.View>
  )
}
