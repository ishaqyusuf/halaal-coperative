import { FloatingBottomSheet } from "@/components/floating-bottom-sheet"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"
import type {
  AssistantLink,
  AssistantMessage,
  AssistantProposal,
} from "@halaalvest/assistant/contracts"
import { useRouter } from "expo-router"
import { useEffect, useRef, useState } from "react"
import { FlatList, type NativeScrollEvent, type TextInput, View } from "react-native"
import { KeyboardAvoidingView } from "react-native-keyboard-controller"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { AssistantApi } from "../api/assistant-api"
import { shareAssistantLink } from "../api/assistant-share"
import {
  type AnswerActions,
  AssistantAnswerCard,
  ProposalCard,
  ResultCard,
} from "../components/assistant-cards"
import { AssistantChatRow, AssistantHome } from "../components/assistant-home"
import { AssistantProposalEditor } from "../components/assistant-proposal-editor"
import {
  AssistantBubble,
  AssistantComposer,
  AssistantDayMarker,
  AssistantHeader,
  AssistantThinking,
} from "../components/assistant-ui"
import { assistantNativeRoute } from "../model/assistant-link-route"
import { assistantStageLabel } from "../model/assistant-stream"
import { proposalTitle } from "../model/proposal-model"
import { useGeneralAssistant } from "../model/use-general-assistant"

type ScreenProps = {
  api: AssistantApi | null
  scope: string
  name?: string
  cooperativeName?: string
  offline: boolean
  locked: boolean
  noAccess: string | null
  starter: { draft?: string; focus: boolean; send?: string }
  /** From a resolved saved-answer or draft link: open here, run nothing. */
  target?: { conversationId: string; messageId?: string; proposalId?: string }
}

const nearEnd = (n: NativeScrollEvent) =>
  n.contentSize.height - n.layoutMeasurement.height - n.contentOffset.y < 100

function Banner({ title, message }: { title: string; message: string }) {
  return (
    <View className="gap-1 rounded-[18px] border border-warn/40 bg-warn/10 p-3">
      <Text className="text-base font-bold text-warn">{title}</Text>
      <Text className="text-base leading-[22px] text-foreground">{message}</Text>
    </View>
  )
}

/** Ask Assistant (ported from EwaTrade's `ask-assistant-live`). */
export function AskAssistantScreen(props: ScreenProps) {
  if (!props.api || props.noAccess) return <AskAssistantUnavailable {...props} />
  return <AskAssistantLive {...props} api={props.api} />
}

function AskAssistantUnavailable({ noAccess, cooperativeName }: ScreenProps) {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  return (
    <View className="bg-card" style={{ flex: 1, paddingTop: insets.top }}>
      <AssistantHeader title="Assistant" subtitle={cooperativeName} />
      <View className="gap-3 p-[18px]">
        <Banner
          title="Assistant unavailable"
          message={noAccess ?? "The assistant isn't available right now."}
        />
        <Button variant="outline" onPress={() => router.replace("/")}>
          <Text>Go home</Text>
        </Button>
      </View>
    </View>
  )
}

function AskAssistantLive({
  api,
  scope,
  name,
  cooperativeName,
  offline,
  locked,
  starter,
  target,
}: ScreenProps & { api: AssistantApi }) {
  const blocked = offline || locked
  const vm = useGeneralAssistant({
    api,
    scope,
    blocked,
    initialConversationId: target?.conversationId ?? null,
  })
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const list = useRef<FlatList<AssistantMessage>>(null)
  const input = useRef<TextInput>(null)
  // A link opens at its answer or draft, not at the end of the chat.
  const atBottom = useRef(!target)
  const [chatsOpen, setChatsOpen] = useState(false)
  const [editing, setEditing] = useState<AssistantProposal | null>(null)
  const [saveFailed, setSaveFailed] = useState<string | null>(null)
  const [linkNotice, setLinkNotice] = useState<string | null>(null)
  const role = vm.bootstrap.data?.role
  const enabled = vm.bootstrap.isSuccess
  const disabled = blocked || vm.busy || vm.state.isError || !enabled

  // A starter from Home: a question sends at once; a draft or focus opens
  // the composer with the keyboard up. Runs once, after the assistant loads.
  const started = useRef(false)
  useEffect(() => {
    if (started.current || !enabled || blocked) return
    started.current = true
    if (starter.send) void vm.send(starter.send)
    else if (starter.draft) vm.setDraft(starter.draft)
    if (!starter.send && (starter.draft || starter.focus))
      requestAnimationFrame(() => input.current?.focus())
  }, [enabled, blocked, starter, vm])

  // Offline or locked closes the editor so nothing is saved from it.
  useEffect(() => {
    if (blocked) setEditing(null)
  }, [blocked])

  const share = async (kind: "message" | "proposal", id: string) => {
    setLinkNotice(null)
    if (!(await shareAssistantLink({ kind, id })))
      setLinkNotice("Couldn't open sharing. Try again.")
  }

  const openLink = (link: AssistantLink) => {
    if (!role || blocked) return
    const route = assistantNativeRoute(link.href, role)
    if (route?.kind === "native") {
      setLinkNotice(null)
      router.push(route.href as never)
    } else
      setLinkNotice(
        `“${link.label}” opens on the Halaalvest website. Sign in there to see it.`
      )
  }
  const actions: AnswerActions = {
    disabled,
    onChoice: (label, value) => void vm.send(label, { proposalId: null, value }),
    onSuggest: (text) => {
      vm.setDraft(text)
      input.current?.focus()
    },
    onAsk: (text) => void vm.send(text),
    onOpenLink: openLink,
  }

  const messages = vm.messages
  const proposals = new Map(
    (vm.data?.proposals ?? []).map((proposal) => [proposal.id, proposal])
  )
  // Each proposal shows once, under the latest message that references it.
  const placed = new Map<string, string>()
  for (const message of messages)
    for (const part of message.parts)
      if (part.type === "proposal") placed.set(part.proposalId, message.id)
  const shownResults = new Set(
    messages.flatMap((message) =>
      message.parts.flatMap((part) =>
        part.type === "result" ? [part.result.proposalId] : []
      )
    )
  )
  // The message a link points at: the answer itself, or the message that
  // shows the linked draft. A draft no message shows is pinned at the top.
  const focusId = target
    ? (target.messageId ??
      (target.proposalId ? placed.get(target.proposalId) : undefined))
    : undefined
  const pinnedProposal =
    target?.proposalId &&
    !placed.has(target.proposalId) &&
    proposals.has(target.proposalId)
      ? target.proposalId
      : null
  const focused = useRef(false)
  useEffect(() => {
    if (focused.current || !focusId || target?.conversationId !== vm.conversationId)
      return
    const index = messages.findIndex((message) => message.id === focusId)
    if (index < 0) return
    focused.current = true
    requestAnimationFrame(() =>
      list.current?.scrollToIndex({ index, animated: false, viewPosition: 0.1 })
    )
  }, [focusId, messages, target?.conversationId, vm.conversationId])
  const chats = vm.conversations.data?.items ?? []
  const home =
    !messages.length &&
    !vm.busy &&
    !vm.failedText &&
    enabled &&
    !(vm.state.isPending && vm.conversationId)
  const firstName = name?.trim().split(/\s+/)[0]
  const pausedReason = offline
    ? "Reconnect to review and confirm this draft."
    : locked
      ? "Unlock the app to review and confirm this draft."
      : undefined

  const proposalCard = (proposalId: string) => {
    const proposal = proposals.get(proposalId)
    if (!proposal) return null
    const result = shownResults.has(proposalId) ? null : vm.results[proposalId]
    // Saved, or still settling for this exact revision: show the outcome,
    // not another Confirm.
    if (
      result &&
      (proposal.status === "confirmed" ||
        (result.outcome === "checking" && result.revision === proposal.revision))
    )
      return <ResultCard key={proposalId} result={result} actions={actions} />
    return (
      <ProposalCard
        key={proposalId}
        proposal={proposal}
        disabled={disabled}
        working={vm.working.has(proposalId)}
        offlineReason={pausedReason}
        onConfirm={() => void vm.confirm(proposal)}
        onCancel={() => void vm.cancel(proposal)}
        onEdit={() => {
          setSaveFailed(null)
          setEditing(proposal)
        }}
        onShare={() => void share("proposal", proposal.id)}
        highlighted={target?.proposalId === proposalId}
        // No private upload on native: the Receipts screen takes the proof.
        onAddProof={
          proposal.fields.kind === "receipt-submission" && role === "member"
            ? () => router.push("/(member)/receipts" as never)
            : undefined
        }
      />
    )
  }

  return (
    // The chat is white (card colour), like the reply surface in ChatGPT.
    // flex comes from style: with an inline style here, a "flex-1" class was
    // dropped and the screen measured only its top inset (composer off screen).
    <View className="bg-card" style={{ flex: 1, paddingTop: insets.top }}>
      {/* keyboard-controller's view isn't mapped by NativeWind. */}
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <AssistantHeader
          title="Assistant"
          subtitle={[
            vm.bootstrap.data?.cooperativeName ?? cooperativeName,
            firstName && role
              ? `${firstName} (${role === "staff" ? "Staff" : "Member"})`
              : undefined,
          ]
            .filter(Boolean)
            .join(" · ")}
          icons={
            enabled && !offline
              ? [
                  {
                    icon: "History",
                    label: "All chats",
                    onPress: () => setChatsOpen(true),
                  },
                  ...(home
                    ? []
                    : [
                        {
                          icon: "MessageSquarePlus" as const,
                          label: "New chat",
                          onPress: vm.clearThread,
                        },
                      ]),
                ]
              : undefined
          }
          disabled={blocked || vm.busy}
        />
        <FlatList
          ref={list}
          className="flex-1"
          data={messages}
          keyExtractor={(item) => item.id}
          onScrollToIndexFailed={({ index, averageItemLength }) => {
            list.current?.scrollToOffset({
              offset: averageItemLength * index,
              animated: false,
            })
            setTimeout(
              () =>
                list.current?.scrollToIndex({
                  index,
                  animated: false,
                  viewPosition: 0.1,
                }),
              120
            )
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerClassName="gap-3.5 p-[18px] pb-[30px]"
          onScrollEndDrag={(event) => {
            atBottom.current = nearEnd(event.nativeEvent)
          }}
          onMomentumScrollEnd={(event) => {
            atBottom.current = nearEnd(event.nativeEvent)
          }}
          // The home reads from the top; only a thread follows its end.
          onContentSizeChange={() => {
            if (atBottom.current && !home)
              requestAnimationFrame(() =>
                list.current?.scrollToEnd({ animated: false })
              )
          }}
          ListHeaderComponent={
            <View className="gap-3 pb-3">
              {offline && !home ? (
                <Banner
                  title="You’re offline"
                  message="Saved answers stay here. Reconnect to ask or confirm."
                />
              ) : null}
              {locked ? (
                <Banner
                  title="App locked"
                  message="Unlock the app to keep using the assistant."
                />
              ) : null}
              {vm.bootstrap.isPending ||
              (vm.state.isPending && vm.conversationId) ? (
                <Skeleton className="h-24 rounded-[18px]" />
              ) : null}
              {vm.bootstrap.isError ? (
                <>
                  <Banner
                    title="Assistant unavailable"
                    message="The assistant could not load. Reconnect and try again."
                  />
                  <Button
                    variant="outline"
                    disabled={offline}
                    onPress={() => void vm.bootstrap.refetch()}
                  >
                    <Text>Try again</Text>
                  </Button>
                </>
              ) : null}
              {vm.state.isError ? (
                <>
                  <Banner
                    title="Chat could not load"
                    message="Try again to load saved answers and current drafts."
                  />
                  <Button
                    variant="outline"
                    disabled={offline}
                    onPress={() => void vm.state.refetch()}
                  >
                    <Text>Try again</Text>
                  </Button>
                </>
              ) : null}
              {pinnedProposal ? proposalCard(pinnedProposal) : null}
              {home ? (
                <AssistantHome
                  name={name}
                  suggestions={vm.bootstrap.data?.suggestions ?? []}
                  chats={chats
                    .filter((chat) => chat.id !== vm.conversationId)
                    .slice(0, 3)}
                  disabled={disabled}
                  offline={offline}
                  onSuggestion={(prompt) => {
                    if (prompt.send) void vm.send(prompt.prompt)
                    else {
                      vm.setDraft(prompt.prompt)
                      input.current?.focus()
                    }
                  }}
                  onChat={(id) => {
                    atBottom.current = true
                    vm.choose(id)
                  }}
                  onAllChats={() => setChatsOpen(true)}
                />
              ) : null}
            </View>
          }
          renderItem={({ item, index }) => {
            const text = item.parts
              .flatMap((part) => (part.type === "text" ? [part.text] : []))
              .join("\n\n")
            return (
              <View className="gap-3">
                <AssistantDayMarker
                  previous={messages[index - 1]?.createdAt}
                  current={item.createdAt}
                />
                {item.role === "user" ? (
                  <AssistantBubble user text={text} />
                ) : (
                  <View
                    accessibilityLabel={
                      item.id === target?.messageId
                        ? "Saved answer from your link"
                        : undefined
                    }
                    className={
                      item.id === target?.messageId
                        ? "-mx-2 min-w-0 gap-4 rounded-[18px] border border-brand-warm p-2"
                        : "min-w-0 gap-4"
                    }
                  >
                    {item.parts.map((part, partIndex) => {
                      const key = `${item.id}:${partIndex}`
                      if (part.type === "text")
                        return <AssistantBubble key={key} text={part.text} />
                      if (part.type === "answer")
                        return (
                          <AssistantAnswerCard
                            key={key}
                            answer={part.answer}
                            actions={actions}
                          />
                        )
                      if (part.type === "result")
                        return (
                          <ResultCard key={key} result={part.result} actions={actions} />
                        )
                      if (placed.get(part.proposalId) === item.id)
                        return <View key={key}>{proposalCard(part.proposalId)}</View>
                      const earlier = proposals.get(part.proposalId)
                      return earlier ? (
                        <Text key={key} className="text-sm text-muted-foreground">
                          {proposalTitle[earlier.fields.kind]} · updated below
                        </Text>
                      ) : null
                    })}
                    {item.parts.some((part) => part.type === "answer") ? (
                      <Button
                        accessibilityLabel="Share a link to this answer"
                        className="min-h-11 self-start px-2"
                        size="sm"
                        variant="ghost"
                        onPress={() => void share("message", item.id)}
                      >
                        <Icon
                          name="Share"
                          className="size-[16px] text-muted-foreground"
                        />
                        <Text className="text-muted-foreground">Share link</Text>
                      </Button>
                    ) : null}
                  </View>
                )}
              </View>
            )
          }}
          ListFooterComponent={
            <View className="gap-4 pt-3">
              {vm.pendingText || vm.failedText ? (
                <AssistantBubble
                  user
                  pending
                  text={vm.pendingText ?? vm.failedText ?? ""}
                />
              ) : null}
              {vm.busy ? (
                <AssistantThinking
                  label={vm.stage ? assistantStageLabel[vm.stage] : undefined}
                />
              ) : null}
              {vm.notice ? (
                <Banner title="Check your chat" message={vm.notice} />
              ) : null}
              {vm.failed && !vm.busy ? (
                <Button
                  variant="outline"
                  disabled={blocked}
                  onPress={vm.retry}
                >
                  <Text>Try again</Text>
                </Button>
              ) : null}
              {linkNotice ? (
                <Banner title="Open on the website" message={linkNotice} />
              ) : null}
            </View>
          }
        />
        <AssistantComposer
          inputRef={input}
          value={vm.draft}
          onChange={vm.setDraft}
          onSend={() => {
            atBottom.current = true
            void vm.send()
          }}
          busy={vm.busy}
          disabled={disabled}
          reason={
            offline
              ? "Saved answers are available offline. Reconnect to ask."
              : undefined
          }
        />
      </KeyboardAvoidingView>
      <FloatingBottomSheet
        visible={chatsOpen}
        onClose={() => setChatsOpen(false)}
        title="All chats"
        scrollable
      >
        <View className="gap-3 pb-4">
          <Button
            disabled={blocked || vm.busy}
            onPress={() => {
              setChatsOpen(false)
              vm.clearThread()
            }}
          >
            <Text>New chat</Text>
          </Button>
          {vm.conversations.isError ? (
            <Banner
              title="Chats could not load"
              message="Reconnect and try again."
            />
          ) : chats.length ? (
            <View className="overflow-hidden rounded-[18px] border border-border bg-card">
              {chats.map((chat) => (
                <AssistantChatRow
                  key={chat.id}
                  chat={chat}
                  disabled={blocked || vm.busy}
                  onPress={() => {
                    setChatsOpen(false)
                    atBottom.current = true
                    vm.choose(chat.id)
                  }}
                />
              ))}
            </View>
          ) : (
            <Text className="text-base text-muted-foreground">
              Your saved chats appear here.
            </Text>
          )}
        </View>
      </FloatingBottomSheet>
      <AssistantProposalEditor
        proposal={editing}
        disabled={disabled}
        failed={saveFailed}
        onClose={() => {
          setEditing(null)
          setSaveFailed(null)
        }}
        onSave={async (fields) => {
          if (!editing) return
          setSaveFailed(null)
          if (await vm.save(editing, fields)) setEditing(null)
          else
            setSaveFailed(
              "Your changes are still here. Check the chat, then save again."
            )
        }}
      />
    </View>
  )
}
