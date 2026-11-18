import { AppSheet } from "@/components/app/app-sheet"
import { DevQuickFill } from "@/components/app/dev-quick-fill"
import { EmptyState } from "@/components/app/empty-state"
import { ScreenStatusBar } from "@/components/app/screen-status-bar"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Elevated } from "@/components/ui/list-card"
import { Pressable } from "@/components/ui/pressable"
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton"
import { StatusBanner } from "@/components/ui/status-banner"
import { StatusPill } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { mobileDevQuickFill } from "@/dev/mobile-dev-quick-fill"
import { useColors } from "@/hooks/use-color"
import { cn } from "@/lib/utils"
import { useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native"
import {
  KeyboardAvoidingView,
  useKeyboardState,
} from "react-native-keyboard-controller"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  authorName,
  caseStatus,
  formatSupportDate,
  formatSupportValue,
  groupSupportMessages,
  moneyReviewLabel,
  supportCategories,
  supportDayLabel,
  supportTime,
} from "../model/member-support-presentation"
import type {
  MobileSupportCase,
  MobileSupportMessage,
} from "../model/member-support-types"
import {
  SupportAvatar,
  SupportNavButton,
} from "../screens/member-support-screen"

export type PendingSupportReply = {
  message: MobileSupportMessage
  state: "sending" | "failed"
}

const emptyMessages: MobileSupportMessage[] = []

function MessageGroup({
  messages,
  cooperative,
  timezone,
  pending,
  closed,
  canRetry,
  onRetry,
}: {
  messages: MobileSupportMessage[]
  cooperative: string
  timezone: string
  pending: PendingSupportReply | null
  closed: boolean
  canRetry: boolean
  onRetry: () => void
}) {
  const colors = useColors()
  const { width } = useWindowDimensions()
  const textWidth = Math.floor((width - 28) * 0.78) - 26
  const first = messages[0]
  const latest = messages[messages.length - 1]
  const own = first.authorType === "member"
  const name = authorName(first, cooperative)
  const pendingState = pending?.message.id === latest.id ? pending.state : null

  return (
    <View
      className={cn(
        "mt-[8px] flex-row items-end gap-[8px]",
        own && "justify-end"
      )}
    >
      {!own ? <SupportAvatar name={name} small /> : null}
      <View
        className={cn("w-[78%] gap-[3px]", own ? "items-end" : "items-start")}
      >
        {!own ? (
          <Text
            className="mb-[2px] ml-[12px] text-muted-foreground"
            variant="caption"
          >
            {name}
            {name !== cooperative ? ` · ${cooperative}` : ""}
          </Text>
        ) : null}
        {messages.map((message, index) => {
          const state =
            pending?.message.id === message.id ? pending.state : null
          const body = (
            <View
              className={cn(
                "max-w-full rounded-[20px] px-[13px] py-[9px]",
                own
                  ? cn(
                      "rounded-br-[6px] bg-primary",
                      index > 0 && "rounded-tr-[6px]",
                      state === "failed" &&
                        "border border-destructive bg-background",
                      state === "sending" && "opacity-75"
                    )
                  : cn(
                      "dark:bg-surface-raised rounded-bl-[6px] bg-card",
                      index > 0 && "rounded-tl-[6px]"
                    )
              )}
            >
              <Text
                lineBreakStrategyIOS="standard"
                style={{
                  color:
                    own && state !== "failed"
                      ? colors.primaryForeground
                      : colors.foreground,
                  fontSize: 16,
                  fontWeight: "500",
                  lineHeight: 22,
                  maxWidth: textWidth,
                }}
              >
                {message.message}
              </Text>
              {message.attachmentUrl ? (
                <Text
                  className={
                    own ? "text-primary-foreground" : "text-muted-foreground"
                  }
                  variant="caption"
                >
                  Attachment saved on this case
                </Text>
              ) : null}
            </View>
          )
          return own ? (
            <View key={message.id}>{body}</View>
          ) : (
            <Elevated key={message.id} radius={20}>
              {body}
            </Elevated>
          )
        })}
        {pendingState === "failed" ? (
          canRetry ? (
            <Pressable
              className="min-h-[44px] justify-center px-[6px]"
              onPress={onRetry}
            >
              <Text className="text-destructive" variant="caption">
                Not sent · Tap to retry
              </Text>
            </Pressable>
          ) : (
            <Text className="mx-[6px] text-destructive" variant="caption">
              {closed ? "Not sent · This case was closed" : "Not sent"}
            </Text>
          )
        ) : (
          <Text
            accessibilityLiveRegion="polite"
            className="mx-[6px] mt-[2px] text-muted-foreground"
            variant="caption"
          >
            {pendingState === "sending"
              ? "Sending…"
              : `${supportTime(latest.createdAt, timezone)}${own ? " · Sent" : ""}`}
          </Text>
        )}
      </View>
    </View>
  )
}

function CaseDetails({
  item,
  timezone,
  visible,
  close,
}: {
  item: MobileSupportCase
  timezone: string
  visible: boolean
  close: () => void
}) {
  const status = caseStatus(item.status)
  const date =
    item.createdAt ?? item.recentMessages[0]?.createdAt ?? item.lastActivityAt
  return (
    <AppSheet onClose={close} title="Case details" visible={visible}>
      <View className="gap-[9px]">
        <DetailRow label="Status">
          <StatusPill label={status.label} tone={status.tone} />
        </DetailRow>
        <DetailRow label="Category">
          {supportCategories[item.category].label}
        </DetailRow>
        <DetailRow label="Opened">
          {formatSupportDate(
            date,
            { day: "numeric", month: "short", year: "numeric" },
            timezone
          )}
        </DetailRow>
        <DetailRow label="Messages">{String(item.messageCount)}</DetailRow>
        {["high", "urgent"].includes(item.priority) ? (
          <DetailRow label="Priority">
            {formatSupportValue(item.priority)}
          </DetailRow>
        ) : null}
        {item.linkedRecordType && item.linkedRecordId ? (
          <DetailRow
            label={`Linked ${item.linkedRecordType.replaceAll("_", " ")}`}
          >
            {item.linkedRecordId}
          </DetailRow>
        ) : null}
        {item.moneyImpactRequested || item.requiresFinancialAdjustment ? (
          <>
            <DetailRow label="Money-impact review">
              {moneyReviewLabel(item)}
            </DetailRow>
            <Text className="text-muted-foreground" variant="small">
              Support records this for review. Any balance change goes through a
              separate finance approval.
            </Text>
            {item.financialAdjustmentApprovalNotes ? (
              <Text variant="small">
                {item.financialAdjustmentApprovalNotes}
              </Text>
            ) : null}
          </>
        ) : null}
        {item.resolutionSummary ? (
          <DetailRow label={item.status === "closed" ? "Closed" : "Resolution"}>
            {item.resolutionSummary}
          </DetailRow>
        ) : null}
      </View>
    </AppSheet>
  )
}

function DetailRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <View className="min-h-[30px] flex-row items-start gap-[12px] border-b border-border pb-[8px]">
      <Text className="w-[105px] text-muted-foreground" variant="label">
        {label}
      </Text>
      <View className="flex-1">
        {typeof children === "string" ? (
          <Text variant="body">{children}</Text>
        ) : (
          children
        )}
      </View>
    </View>
  )
}

export function MemberSupportThread({
  item,
  preview,
  cooperative,
  cooperativeShort,
  timezone,
  online,
  loading,
  error,
  refreshing,
  canCreate,
  draft,
  pending,
  back,
  create,
  refresh,
  editReply,
  send,
}: {
  item?: MobileSupportCase
  preview?: MobileSupportCase
  cooperative: string
  cooperativeShort: string
  timezone: string
  online: boolean
  loading: boolean
  error: boolean
  refreshing: boolean
  canCreate: boolean
  draft: string
  pending: PendingSupportReply | null
  back: () => void
  create: () => void
  refresh: () => void
  editReply: (message: string) => void
  send: () => void
}) {
  const colors = useColors()
  const insets = useSafeAreaInsets()
  const keyboardVisible = useKeyboardState((state) => state.isVisible)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const [inputHeight, setInputHeight] = useState(44)
  const scroll = useRef<ScrollView>(null)
  const followLatest = useRef(true)
  const visibleCase = item ?? preview
  const status = visibleCase ? caseStatus(visibleCase.status) : null
  const thread = item ?? (!online || error ? preview : undefined)
  const closed = thread?.status === "closed"
  const sending = pending?.state === "sending"
  const messageText = pending ? "" : draft
  const canSend = Boolean(
    item && !closed && online && !sending && draft.trim().length >= 2
  )
  const review =
    thread?.moneyImpactRequested || thread?.requiresFinancialAdjustment
  const messages = thread?.recentMessages ?? emptyMessages
  const days = useMemo(
    () =>
      groupSupportMessages(
        pending ? [...messages, pending.message] : messages,
        timezone
      ),
    [messages, pending, timezone]
  )
  const openedAt =
    thread?.createdAt ?? messages[0]?.createdAt ?? thread?.lastActivityAt
  const sender = messages.findLast((message) => message.authorType === "staff")
  const follow = (animated: boolean) => {
    followLatest.current = true
    scroll.current?.scrollToEnd({ animated })
  }

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      <ScreenStatusBar tone="surface" />
      <View style={{ backgroundColor: colors.card, paddingTop: insets.top }}>
        <View className="min-h-[60px] flex-row items-center gap-[8px] border-b border-border px-[18px]">
          <SupportNavButton icon="ChevronLeft" label="Go back" onPress={back} />
          <View className="min-w-0 flex-1 items-center gap-[1px]">
            <Text
              accessibilityRole="header"
              className="text-[17px]"
              numberOfLines={1}
              variant="section"
            >
              {visibleCase?.subject ?? "Case"}
            </Text>
            {status && visibleCase ? (
              <View className="flex-row items-center gap-[6px]">
                <View className={cn("size-[7px] rounded-full", status.dot)} />
                <Text
                  className="text-center text-muted-foreground"
                  variant="caption"
                >
                  {status.label} ·{" "}
                  {supportCategories[visibleCase.category].label}
                </Text>
              </View>
            ) : null}
          </View>
          {thread ? (
            <SupportNavButton
              icon="Info"
              label="Case details"
              onPress={() => setDetailsOpen(true)}
            />
          ) : (
            <View className="size-[40px]" />
          )}
        </View>
        {thread && (review || thread.linkedRecordType) ? (
          <Pressable
            className="bg-tint-warm min-h-[44px] flex-row items-center gap-[10px] px-[18px]"
            onPress={() => setDetailsOpen(true)}
          >
            <Icon
              className="text-tint-warm-foreground size-[18px]"
              name={review ? "Scale" : "FileText"}
            />
            <Text className="text-tint-warm-foreground flex-1" variant="small">
              {review
                ? `Money-impact review · ${moneyReviewLabel(thread)}`
                : `Linked ${thread.linkedRecordType?.replaceAll("_", " ")} · ${thread.linkedRecordId}`}
            </Text>
            <Icon
              className="text-tint-warm-foreground size-[18px]"
              name="ChevronRight"
            />
          </Pressable>
        ) : null}
      </View>
      <ScrollView
        contentContainerClassName="gap-[4px] px-[14px] pt-[12px] pb-[16px]"
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => {
          if (followLatest.current) follow(false)
        }}
        onLayout={() => {
          if (followLatest.current) follow(false)
        }}
        onScroll={(event) => {
          const { contentOffset, contentSize, layoutMeasurement } =
            event.nativeEvent
          followLatest.current =
            contentSize.height - layoutMeasurement.height - contentOffset.y < 72
        }}
        ref={scroll}
        refreshControl={
          online ? (
            <RefreshControl
              onRefresh={refresh}
              refreshing={refreshing}
              tintColor={colors.mutedForeground}
            />
          ) : undefined
        }
        scrollEventThrottle={32}
      >
        {!online && thread ? (
          <StatusBanner
            description={
              item
                ? "Showing your saved conversation. You can send replies when you reconnect."
                : "Showing recent messages. Reconnect to see the full conversation."
            }
            kind="offline"
            title="You’re offline"
          />
        ) : null}
        {online && error && thread ? (
          <StatusBanner
            description="Your saved messages are still available."
            kind="error"
            onRetry={refresh}
            title="Couldn’t refresh"
          />
        ) : null}
        {thread ? (
          <>
            <Text
              className="mb-[10px] text-center text-muted-foreground"
              variant="caption"
            >
              Case opened{" "}
              {openedAt
                ? formatSupportDate(
                    openedAt,
                    { day: "numeric", month: "short" },
                    timezone
                  )
                : ""}{" "}
              · {supportCategories[thread.category].label}
              {"\n"}
              {cooperative} replies here
            </Text>
            {days.map((day) => (
              <View key={day.key}>
                <View className="bg-surface-raised mt-[14px] mb-[8px] self-center rounded-full px-[10px] py-[4px]">
                  <Text className="text-muted-foreground" variant="caption">
                    {supportDayLabel(day.date, timezone)}
                  </Text>
                </View>
                {day.groups.map((group) => (
                  <MessageGroup
                    canRetry={canSend}
                    closed={closed}
                    cooperative={cooperativeShort}
                    key={group[0].id}
                    messages={group}
                    onRetry={send}
                    pending={pending}
                    timezone={timezone}
                  />
                ))}
              </View>
            ))}
            {!messages.length && thread.detail ? (
              <Text
                className="px-[14px] text-center text-muted-foreground"
                variant="body"
              >
                {thread.detail}
              </Text>
            ) : null}
            {thread.resolutionSummary &&
            (closed || thread.status === "resolved") ? (
              <View className="bg-tint-success mt-[14px] flex-row items-start gap-[12px] rounded-[20px] px-[16px] py-[14px]">
                <Icon
                  className="text-tint-success-foreground size-[20px]"
                  name="CircleCheck"
                />
                <View className="flex-1 gap-[3px]">
                  <Text
                    className="text-tint-success-foreground"
                    variant="label"
                  >
                    {closed ? "Case closed" : "Marked resolved"}
                  </Text>
                  <Text
                    className="text-tint-success-foreground"
                    variant="small"
                  >
                    {thread.resolutionSummary}
                  </Text>
                </View>
              </View>
            ) : null}
            {thread.messageCount === 1 && !closed ? (
              <Text
                className="mt-[14px] text-center text-muted-foreground"
                variant="caption"
              >
                You’ll get a notification when {cooperativeShort} replies.
              </Text>
            ) : null}
          </>
        ) : loading && online ? (
          <SkeletonGroup>
            <Skeleton className="mt-[16px] h-[64px] w-2/3 self-end rounded-[20px]" />
            <Skeleton className="mt-[16px] h-[64px] w-3/4 rounded-[20px]" />
            <Skeleton className="mt-[16px] h-[44px] w-1/2 self-end rounded-[20px]" />
          </SkeletonGroup>
        ) : (
          <EmptyState
            action={
              online ? { label: "Try again", onPress: refresh } : undefined
            }
            description={
              online
                ? "Check your connection, then try again."
                : "Connect to open this case."
            }
            icon="WifiOff"
            title={online ? "This case didn’t load" : "You’re offline"}
            tone={online ? "error" : "warning"}
          />
        )}
      </ScrollView>
      {thread ? (
        <View
          style={{
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            paddingBottom: keyboardVisible ? 8 : Math.max(insets.bottom, 12),
            paddingHorizontal: 12,
            paddingTop: 8,
          }}
        >
          {closed ? (
            <View className="gap-[10px]">
              <View className="flex-row items-center gap-[12px]">
                <Icon
                  className="size-[22px] text-muted-foreground"
                  name="LockKeyhole"
                />
                <View className="flex-1">
                  <Text variant="section">This case is closed</Text>
                  <Text className="text-muted-foreground" variant="small">
                    {canCreate
                      ? "Replies are off. Start a new case if you still need help."
                      : "Replies are off for this case."}
                  </Text>
                </View>
              </View>
              {canCreate ? (
                <Button onPress={create} size="sm" variant="secondary">
                  <Icon className="size-[20px] text-primary" name="Plus" />
                  <Text>New support case</Text>
                </Button>
              ) : null}
            </View>
          ) : (
            <View className="gap-[6px]">
              {thread.status === "waiting_on_member" && !draft && !pending ? (
                <View className="flex-row items-center gap-[7px] px-[4px]">
                  <Icon
                    className="text-tint-warm-foreground size-[15px]"
                    name="Clock"
                  />
                  <Text className="text-tint-warm-foreground" variant="caption">
                    {sender?.authorName?.split(" ")[0] ?? cooperativeShort} is
                    waiting for your reply
                  </Text>
                </View>
              ) : null}
              <View className="flex-row items-end gap-[8px]">
                <View
                  className={cn(
                    "dark:bg-surface-raised min-w-0 flex-1 overflow-hidden rounded-[22px] border bg-background",
                    focused ? "border-primary" : "border-border"
                  )}
                >
                  <TextInput
                    accessibilityLabel="Reply"
                    editable={Boolean(item && online && !sending)}
                    maxLength={2000}
                    multiline
                    onBlur={() => setFocused(false)}
                    onChangeText={editReply}
                    onContentSizeChange={(event) =>
                      setInputHeight(
                        Math.max(
                          44,
                          Math.min(132, event.nativeEvent.contentSize.height)
                        )
                      )
                    }
                    onFocus={() => {
                      setFocused(true)
                      follow(true)
                    }}
                    placeholder={
                      online ? `Message ${cooperativeShort}` : "You’re offline"
                    }
                    placeholderTextColor={colors.mutedForeground}
                    style={{
                      color: colors.foreground,
                      fontSize: 16,
                      fontWeight: "500",
                      height: inputHeight,
                      lineHeight: 22,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      textAlignVertical: "center",
                    }}
                    value={messageText}
                  />
                </View>
                <Pressable
                  accessibilityLabel="Send reply"
                  className={cn(
                    "size-[44px] items-center justify-center rounded-full",
                    canSend && !pending ? "bg-primary" : "bg-surface-raised"
                  )}
                  disabled={!canSend || Boolean(pending)}
                  onPress={() => {
                    follow(true)
                    send()
                  }}
                >
                  {sending ? (
                    <ActivityIndicator
                      color={colors.mutedForeground}
                      size="small"
                    />
                  ) : (
                    <Icon
                      className={cn(
                        "size-[20px]",
                        canSend && !pending
                          ? "text-primary-foreground"
                          : "text-muted-foreground"
                      )}
                      name="ArrowUp"
                    />
                  )}
                </Pressable>
              </View>
              {item && online && !draft && !pending ? (
                <View className="absolute right-[52px] bottom-0 z-10">
                  <DevQuickFill
                    label="Quick fill reply"
                    onPress={() => editReply(mobileDevQuickFill.support.reply)}
                    placement="footer"
                    portal={false}
                  />
                </View>
              ) : null}
              {messageText.length >= 1800 ? (
                <Text
                  className="mr-[6px] self-end text-muted-foreground"
                  variant="caption"
                >
                  {messageText.length} / 2000
                </Text>
              ) : null}
            </View>
          )}
        </View>
      ) : null}
      {thread ? (
        <CaseDetails
          close={() => setDetailsOpen(false)}
          item={thread}
          timezone={timezone}
          visible={detailsOpen}
        />
      ) : null}
    </KeyboardAvoidingView>
  )
}
