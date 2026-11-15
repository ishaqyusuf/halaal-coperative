"use client"

import {
  type AssistantMessage,
  type AssistantProposal,
  type AssistantStreamStage,
  assistantHrefs,
} from "@halaalvest/assistant/contracts"
import { Button } from "@halaalvest/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@halaalvest/ui/components/dialog"
import { cn } from "@halaalvest/ui/lib/utils"
import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Fragment, type ReactNode, useEffect, useRef, useState } from "react"
import { AssistantComposer } from "./assistant-composer"
import { AssistantCopyLink } from "./assistant-copy-link"
import { AssistantText } from "./assistant-text"
import { type AnswerActions, GeneralAnswerCard } from "./general-answer-card"
import { ActionResultCard, GeneralProposalCard } from "./general-proposal-card"
import { GeneralProposalEditor } from "./general-proposal-editor"
import { proposalTitle } from "./proposal-model"
import type { GeneralAssistantVM } from "./use-general-assistant"

export type { GeneralAssistantVM }

/** Standard dialog frame for the assistant: padded, rounded, normal text. */
export const GENERAL_DIALOG =
  "flex max-h-[85svh] max-w-lg flex-col gap-4 overflow-y-auto rounded-lg p-6 text-foreground shadow-lg"

/** Shared state flags for the page and widget layouts. */
export function generalChatFlags(vm: GeneralAssistantVM) {
  const enabled = vm.bootstrap.isSuccess
  const navigationDisabled = !enabled || vm.busy
  return {
    enabled,
    navigationDisabled,
    disabled: navigationDisabled || vm.state.isError,
  }
}

export function generalChatTitle(vm: GeneralAssistantVM) {
  if (!vm.conversationId) return "New chat"
  return (
    vm.data?.conversation.title ??
    vm.conversations.data?.items.find((row) => row.id === vm.conversationId)
      ?.title ??
    "New chat"
  )
}

/** Proposals still waiting for this person in the open chat. */
export function openProposals(vm: GeneralAssistantVM) {
  return (vm.data?.proposals ?? []).filter(
    (proposal) =>
      (proposal.status === "review" || proposal.status === "collecting") &&
      new Date(proposal.expiresAt).getTime() > Date.now()
  )
}

/**
 * Each proposal shows once, under the latest message that references it, so
 * a draft revised over several turns stays one live card.
 */
function placeProposals(messages: AssistantMessage[]) {
  const last = new Map<string, string>()
  for (const message of messages)
    for (const part of message.parts)
      if (part.type === "proposal") last.set(part.proposalId, message.id)
  return last
}

/** What the reply in flight is doing, from the stream's status events. */
export const assistantStageLabel: Record<AssistantStreamStage, string> = {
  received: "Sending…",
  thinking: "Thinking…",
  reading: "Reading your records…",
  drafting: "Preparing a draft…",
}

const welcomeCopy = (role: "member" | "staff" | undefined) =>
  role === "staff"
    ? "Find a member, check their history, see receipts waiting for review, or record a payment. Nothing changes until you confirm."
    : "Ask about your financing, savings, shares and receipts, or send a receipt or payment request. Nothing changes until you confirm."

/** Messages, cards and drafts of the open chat. */
export function GeneralThread({
  vm,
  compact = false,
  contentClassName,
  focusMessageId = null,
}: {
  vm: GeneralAssistantVM
  compact?: boolean
  /** Width of the message column, e.g. a centred reading width on the page. */
  contentClassName?: string
  /** A saved-answer link's message: scrolled to and highlighted once. */
  focusMessageId?: string | null
}) {
  const [editing, setEditing] = useState<AssistantProposal | null>(null)
  const { enabled, disabled } = generalChatFlags(vm)
  const scroller = useRef<HTMLDivElement | null>(null)
  const focused = useRef<string | null>(null)
  const [highlight, setHighlight] = useState<string | null>(null)
  const focusReady =
    !!focusMessageId &&
    vm.messages.some((message) => message.id === focusMessageId)
  const proposals = new Map(
    (vm.data?.proposals ?? []).map((proposal) => [proposal.id, proposal])
  )
  const placed = placeProposals(vm.messages)
  // Results already in the thread are not repeated on their proposal card.
  const shownResults = new Set(
    vm.messages.flatMap((message) =>
      message.parts.flatMap((part) =>
        part.type === "result" ? [part.result.proposalId] : []
      )
    )
  )
  const actions: AnswerActions = {
    disabled,
    onChoice: (label, value) =>
      void vm.send(label, { proposalId: null, value }),
    onSuggest: (text) => vm.setDraft(text),
    onAsk: (text) => void vm.send(text),
  }

  // Keep the newest message in view as the thread grows, unless a linked
  // answer is still waiting to be shown.
  const length = vm.messages.length
  useEffect(() => {
    const element = scroller.current
    if (!element) return
    if (focusMessageId && focused.current !== focusMessageId) return
    element.scrollTo({ top: element.scrollHeight, behavior: "smooth" })
  }, [length, vm.pendingText, vm.conversationId, vm.stage])

  // A saved-answer link opens on that exact message, once. The message is
  // already committed when this runs (no animation frame, which a
  // background tab would hold back).
  useEffect(() => {
    if (!focusMessageId || !focusReady || focused.current === focusMessageId)
      return
    const element = document.getElementById(`general-message-${focusMessageId}`)
    if (!element) return
    focused.current = focusMessageId
    element.scrollIntoView({ block: "start", behavior: "instant" })
    element.focus({ preventScroll: true })
    setHighlight(focusMessageId)
  }, [focusMessageId, focusReady])
  useEffect(() => {
    if (!highlight) return
    const timer = setTimeout(() => setHighlight(null), 2400)
    return () => clearTimeout(timer)
  }, [highlight])

  const proposalCard = (proposalId: string) => {
    const proposal = proposals.get(proposalId)
    if (!proposal) return null
    return (
      <div key={proposalId} id={`general-proposal-${proposalId}`}>
        <GeneralProposalCard
          proposal={proposal}
          result={
            shownResults.has(proposalId) ? null : vm.results[proposalId]
          }
          disabled={disabled}
          working={vm.working.has(proposalId)}
          receiptProofUploads={vm.receiptProofUploads}
          onConfirm={() => void vm.confirm(proposal)}
          onCancel={() => void vm.cancel(proposal)}
          onEdit={() => setEditing(proposal)}
          onProofUploaded={(file) => void vm.attachProof(proposal, file)}
        />
      </div>
    )
  }

  return (
    <>
      <div
        ref={scroller}
        role="log"
        aria-live="polite"
        className="relative min-h-0 min-w-0 flex-1 overflow-y-auto"
      >
        <div
          className={cn(
            "flex flex-col gap-5 py-6",
            compact ? "px-4" : "px-4 sm:px-6",
            contentClassName
          )}
        >
          {compact && !enabled ? (
            <div className="space-y-3 text-sm">
              <output className="block">
                {vm.bootstrap.isPending
                  ? "Connecting to your assistant…"
                  : "Couldn't connect to your assistant."}
              </output>
              {!vm.bootstrap.isPending ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void vm.bootstrap.refetch()}
                >
                  Retry connection
                </Button>
              ) : null}
            </div>
          ) : null}
          {enabled && vm.conversationId && vm.state.isPending ? (
            <output className="text-sm">Loading this chat…</output>
          ) : null}
          {vm.state.isError ? (
            <div role="alert" className="flex items-center gap-3 text-sm">
              <p>
                This chat could not load. Try again or open another saved chat.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void vm.state.refetch()}
              >
                Try again
              </Button>
            </div>
          ) : null}
          {enabled && !vm.messages.length && !vm.busy && !vm.state.isPending ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted-foreground">
                {welcomeCopy(vm.bootstrap.data?.role)}
              </p>
              <GeneralSuggestions vm={vm} />
            </div>
          ) : null}
          {vm.messages.map((message) => {
            const text = message.parts
              .flatMap((part) => (part.type === "text" ? [part.text] : []))
              .join("\n\n")
            const highlighted = highlight === message.id
            if (message.role === "user")
              return (
                <div
                  key={message.id}
                  id={`general-message-${message.id}`}
                  tabIndex={-1}
                  className={cn(
                    "flex scroll-mt-6 flex-col items-end gap-1.5 rounded-lg outline-none transition-shadow duration-700",
                    highlighted && "ring-4 ring-primary/30"
                  )}
                >
                  {text ? (
                    <p
                      className={cn(
                        "max-w-[85%] min-w-0 rounded-xl border bg-muted/50 px-4 py-2.5 whitespace-pre-wrap text-foreground [overflow-wrap:anywhere]",
                        compact ? "text-sm" : "text-[15px] leading-relaxed"
                      )}
                    >
                      {text}
                    </p>
                  ) : null}
                </div>
              )
            return (
              <div
                key={message.id}
                id={`general-message-${message.id}`}
                tabIndex={-1}
                aria-current={focusMessageId === message.id ? "true" : undefined}
                className={cn(
                  "flex min-w-0 scroll-mt-6 flex-col gap-2 rounded-lg text-foreground outline-none transition-shadow duration-700",
                  highlighted && "ring-4 ring-primary/30 ring-offset-4 ring-offset-background"
                )}
              >
                {message.parts.map((part, index) => (
                  <Fragment key={`${message.id}:${index}`}>
                    {part.type === "text" ? (
                      <AssistantText
                        text={part.text}
                        className={
                          compact
                            ? "text-sm leading-relaxed"
                            : "text-[15px] leading-7"
                        }
                      />
                    ) : part.type === "answer" ? (
                      <GeneralAnswerCard answer={part.answer} actions={actions} />
                    ) : part.type === "proposal" ? (
                      placed.get(part.proposalId) === message.id ? (
                        proposalCard(part.proposalId)
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {proposals.get(part.proposalId)
                            ? `${proposalTitle[proposals.get(part.proposalId)!.fields.kind]} · updated below`
                            : null}
                        </p>
                      )
                    ) : part.type === "result" ? (
                      <ActionResultCard result={part.result} />
                    ) : null}
                  </Fragment>
                ))}
                <ReplyFooter text={text} messageId={message.id} />
              </div>
            )
          })}
          {vm.pendingText || vm.failedText ? (
            // The message on its way (or the one that didn't go through).
            <div className="flex flex-col items-end gap-1.5">
              <p
                className={cn(
                  "max-w-[85%] min-w-0 rounded-xl border bg-muted/50 px-4 py-2.5 whitespace-pre-wrap text-foreground opacity-70 [overflow-wrap:anywhere]",
                  compact ? "text-sm" : "text-[15px] leading-relaxed"
                )}
              >
                {vm.pendingText ?? vm.failedText}
              </p>
            </div>
          ) : null}
          {vm.busy ? (
            <p
              className="animate-pulse text-xs text-muted-foreground"
              data-stage={vm.stage ?? "received"}
            >
              {assistantStageLabel[vm.stage ?? "received"]}
            </p>
          ) : null}
          {vm.notice ? (
            <p role="alert" className="text-sm text-destructive">
              {vm.notice}
            </p>
          ) : null}
          {vm.failed && !vm.busy ? (
            <Button
              size="sm"
              variant="outline"
              className="self-start"
              onClick={vm.retry}
            >
              Try again
            </Button>
          ) : null}
        </div>
      </div>
      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open && !(editing && vm.working.has(editing.id))) setEditing(null)
        }}
      >
        {editing ? (
          <DialogContent className={GENERAL_DIALOG}>
            <DialogHeader className="pr-8">
              <DialogTitle className="text-lg leading-none font-semibold">
                Edit draft
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Save changes, then review the updated card before confirming.
              </DialogDescription>
            </DialogHeader>
            <GeneralProposalEditor
              key={`${editing.id}:${editing.revision}`}
              proposal={editing}
              disabled={disabled}
              onCancel={() => setEditing(null)}
              onSave={async (fields) => {
                if (await vm.save(editing, fields)) setEditing(null)
              }}
            />
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  )
}

/** The chat box bound to the open chat. */
export function GeneralComposer({
  vm,
  footer,
}: {
  vm: GeneralAssistantVM
  footer?: ReactNode
}) {
  const { enabled } = generalChatFlags(vm)
  return (
    <AssistantComposer
      value={vm.draft}
      onChange={vm.setDraft}
      onSend={() => void vm.send()}
      busy={vm.busy}
      disabled={!enabled || vm.state.isError}
      placeholder="Ask anything"
      label="Ask a question or say what to send"
      footer={footer}
    />
  )
}

/**
 * Who wrote the reply, a copy button for its text, and a link to this exact
 * saved answer (`assistantHrefs.message`), under each finished reply.
 */
function ReplyFooter({ text, messageId }: { text: string; messageId: string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])
  return (
    <div className="-mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
      <span>Halaalvest assistant</span>
      {text ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={copied ? "Copied" : "Copy reply"}
          title={copied ? "Copied" : "Copy reply"}
          onClick={() =>
            void navigator.clipboard
              ?.writeText(text)
              .then(() => setCopied(true))
              .catch(() => {})
          }
        >
          <HugeiconsIcon
            icon={copied ? Tick02Icon : Copy01Icon}
            className="size-3.5"
          />
        </Button>
      ) : null}
      <AssistantCopyLink href={assistantHrefs.message(messageId)} />
    </div>
  )
}

/** Role-shaped starter questions (from bootstrap) that fill the composer. */
export function GeneralSuggestions({
  vm,
  className,
}: {
  vm: GeneralAssistantVM
  className?: string
}) {
  const { disabled } = generalChatFlags(vm)
  const suggestions = vm.bootstrap.data?.suggestions ?? []
  if (!suggestions.length) return null
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {suggestions.map((suggestion) => (
        <Button
          key={suggestion.capabilityId}
          size="sm"
          variant="outline"
          className="rounded-[999px]"
          disabled={disabled}
          onClick={() => vm.setDraft(suggestion.label)}
        >
          {suggestion.label}
        </Button>
      ))}
    </div>
  )
}

type SavedChat = NonNullable<
  GeneralAssistantVM["conversations"]["data"]
>["items"][number]

function groupChats(chats: SavedChat[], now = new Date()) {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const week = new Date(day)
  week.setDate(day.getDate() - 6)
  const groups: [string, SavedChat[]][] = [
    ["Today", []],
    ["This week", []],
    ["Earlier", []],
  ]
  for (const chat of chats) {
    const at = new Date(chat.updatedAt)
    groups[at >= day ? 0 : at >= week ? 1 : 2]?.[1].push(chat)
  }
  return groups.filter(([, rows]) => rows.length)
}

/** Vertical saved-chat list for the assistant page. */
export function GeneralChatList({
  vm,
  onChosen,
  query = "",
}: {
  vm: GeneralAssistantVM
  /** Called after a chat is opened, e.g. to close the history dialog. */
  onChosen?: (id: string) => void
  /** Only chats whose title contains this text. */
  query?: string
}) {
  const { navigationDisabled } = generalChatFlags(vm)
  const needle = query.trim().toLowerCase()
  if (vm.conversations.isPending)
    return <output className="px-2 py-1.5 text-sm">Loading saved chats…</output>
  if (vm.conversations.isError)
    return (
      <div role="alert" className="grid gap-2 px-2 py-1.5 text-sm">
        <p>We couldn't load your saved chats.</p>
        <Button
          size="sm"
          variant="outline"
          className="self-start"
          onClick={() => void vm.conversations.refetch()}
        >
          Retry loading chats
        </Button>
      </div>
    )
  const all = vm.conversations.data?.items ?? []
  const groups = groupChats(
    all.filter((chat) => !needle || chat.title.toLowerCase().includes(needle))
  )
  if (!all.length)
    return (
      <p className="px-2 py-1.5 text-sm text-muted-foreground">
        Your saved chats appear here.
      </p>
    )
  if (needle && !groups.length)
    return (
      <p className="px-2 py-1.5 text-sm text-muted-foreground">
        No chats match “{query.trim()}”.
      </p>
    )
  return (
    <div className="flex flex-col gap-0.5">
      {groups.map(([group, chats]) => (
        <section key={group} aria-label={group}>
          <h3 className="mt-4 mb-1 px-2 text-xs text-muted-foreground first:mt-1">
            {group}
          </h3>
          <ul className="flex flex-col gap-0.5">
            {chats.map((conversation) => (
              <li key={conversation.id}>
                <button
                  type="button"
                  disabled={navigationDisabled}
                  aria-current={conversation.id === vm.conversationId}
                  onClick={() => onChosen?.(conversation.id)}
                  className={cn(
                    "w-full rounded-lg px-2.5 py-2 text-left text-sm hover:bg-muted disabled:opacity-60",
                    conversation.id === vm.conversationId &&
                      "bg-primary/10 text-primary hover:bg-primary/10"
                  )}
                >
                  <span className="block truncate">
                    {conversation.title || "New chat"}
                  </span>
                  {conversation.lastMessagePreview ? (
                    <span className="block truncate text-xs text-muted-foreground">
                      {conversation.lastMessagePreview}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
