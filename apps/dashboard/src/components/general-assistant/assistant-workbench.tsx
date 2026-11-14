"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@halaalvest/ui/components/dialog"
import { cn } from "@halaalvest/ui/lib/utils"
import {
  PlusSignIcon,
  Search01Icon,
  SidebarLeftIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import {
  GENERAL_DIALOG,
  GeneralChatList,
  GeneralComposer,
  GeneralSuggestions,
  GeneralThread,
  generalChatFlags,
  generalChatTitle,
  openProposals,
} from "./general-chat"
import { useGeneralAssistant } from "./use-general-assistant"

/** Reading width shared by the welcome, the thread and the composer. */
const COLUMN = "mx-auto w-full max-w-[720px]"

/**
 * The assistant page: one focused chat (ported from EwaTrade). Saved chats
 * sit on the left on very large screens, where the header's panel button
 * hides them; below that the same button opens them in a dialog. `/assistant`
 * is a blank new chat; its first message creates the conversation and the
 * URL moves to `/assistant/c/<id>`.
 */
export function AssistantWorkbench() {
  const routeId = useParams<{ id?: string }>().id ?? null
  const vm = useGeneralAssistant({ initialConversationId: routeId })
  const router = useRouter()
  const { enabled, navigationDisabled } = generalChatFlags(vm)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [chatQuery, setChatQuery] = useState("")
  const waiting = openProposals(vm).length

  const newChat = () => {
    if (navigationDisabled) return
    setHistoryOpen(false)
    vm.clearThread()
    router.push("/assistant", { scroll: false })
  }
  const openChat = (id: string) => {
    setHistoryOpen(false)
    if (id === vm.conversationId) return
    vm.choose(id)
    router.push(`/assistant/c/${encodeURIComponent(id)}`, { scroll: false })
  }

  // A blank chat's first message takes over the URL.
  const shown = useRef<string | null>(routeId)
  useEffect(() => {
    const id = vm.conversationId
    if (!id || id === shown.current || id === routeId) return
    shown.current = id
    if (id === vm.startedConversationId)
      router.replace(`/assistant/c/${encodeURIComponent(id)}`, { scroll: false })
  }, [vm.conversationId, vm.startedConversationId, routeId, router])

  // Back/Forward or a pasted link opens the chat it names, once a reply in
  // progress has arrived.
  useEffect(() => {
    if (vm.busy || routeId === vm.conversationId) return
    if (routeId === null && vm.conversationId === vm.startedConversationId)
      return
    shown.current = routeId
    if (routeId) vm.choose(routeId)
    else vm.clearThread()
    // biome-ignore lint/correctness/useExhaustiveDependencies: follows the URL only
  }, [routeId, vm.busy])

  const fresh =
    enabled &&
    !vm.conversationId &&
    !vm.messages.length &&
    !vm.busy &&
    !vm.failedText

  return (
    // Edge to edge under the shell header: no card frame. Negative margins
    // cancel the shell's page padding so only the columns scroll.
    <div className="-mx-4 -my-6 flex flex-1 flex-col sm:-mx-6 lg:-mx-8">
      <h1 className="sr-only">Assistant</h1>
      <div
        className={cn(
          "grid h-[calc(100svh-71px)] min-h-[32rem] overflow-hidden",
          sidebarOpen && "xl:grid-cols-[272px_minmax(0,1fr)]"
        )}
      >
        <nav
          aria-label="Saved chats"
          className={cn(
            "hidden min-h-0 flex-col gap-1 overflow-y-auto border-r p-3",
            sidebarOpen && "xl:flex"
          )}
        >
          <Button
            variant="secondary"
            className="justify-start"
            disabled={navigationDisabled}
            onClick={newChat}
          >
            <HugeiconsIcon icon={PlusSignIcon} className="size-4" />
            New chat
          </Button>
          <ChatSearch value={chatQuery} onChange={setChatQuery} />
          {enabled ? (
            <GeneralChatList vm={vm} query={chatQuery} onChosen={openChat} />
          ) : null}
        </nav>
        <section
          aria-label="Assistant"
          className="flex min-h-0 min-w-0 flex-col"
        >
          <header className="flex shrink-0 items-center gap-2 px-3 py-2.5 sm:px-4">
            <Button
              size="icon-sm"
              variant="ghost"
              className="hidden xl:inline-flex"
              aria-label={sidebarOpen ? "Hide saved chats" : "Show saved chats"}
              aria-expanded={sidebarOpen}
              title={sidebarOpen ? "Hide saved chats" : "Show saved chats"}
              onClick={() => setSidebarOpen((open) => !open)}
            >
              <HugeiconsIcon icon={SidebarLeftIcon} className="size-5" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              className="xl:hidden"
              aria-label="Chat history"
              title="Chat history"
              onClick={() => setHistoryOpen(true)}
            >
              <HugeiconsIcon icon={SidebarLeftIcon} className="size-5" />
            </Button>
            <div className="flex min-w-0 flex-1 items-baseline gap-2">
              <h2 className="truncate text-sm font-medium">
                {generalChatTitle(vm)}
              </h2>
              {vm.bootstrap.data ? (
                <p className="truncate text-xs text-muted-foreground max-sm:hidden">
                  {vm.bootstrap.data.cooperativeName}
                </p>
              ) : null}
              {waiting ? (
                <span className="flex shrink-0 items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                  <span className="size-1.5 rounded-full bg-current" />
                  {waiting} to review
                </span>
              ) : null}
            </div>
            {vm.messages.length ? (
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0"
                disabled={navigationDisabled}
                onClick={newChat}
              >
                <HugeiconsIcon icon={PlusSignIcon} className="size-4" />
                New chat
              </Button>
            ) : null}
          </header>
          {vm.bootstrap.isPending ? (
            <output className="p-6 text-sm">Loading your assistant…</output>
          ) : vm.bootstrap.isError ? (
            <div className="flex items-center gap-3 p-6 text-sm">
              <p>We couldn't load the assistant.</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void vm.bootstrap.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : fresh ? (
            <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto px-4 pb-16 sm:px-6">
              <div className={`${COLUMN} flex flex-col gap-4`}>
                <h2 className="text-center text-2xl font-semibold tracking-tight">
                  How can I help?
                </h2>
                <p className="text-center text-sm text-muted-foreground">
                  {vm.bootstrap.data?.role === "staff"
                    ? "Find members, check history and receipts, or record a payment. Nothing changes until you confirm."
                    : "Ask about your financing, savings, shares and receipts, or send a receipt. Nothing changes until you confirm."}
                </p>
                <GeneralComposer vm={vm} />
                <GeneralSuggestions vm={vm} className="justify-center" />
                {vm.notice ? (
                  <p role="alert" className="text-center text-sm text-destructive">
                    {vm.notice}
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <>
              <GeneralThread vm={vm} contentClassName={COLUMN} />
              <div className="shrink-0 px-4 pb-3 sm:px-6">
                <div className={`${COLUMN} flex flex-col gap-1.5`}>
                  <GeneralComposer
                    vm={vm}
                    footer={
                      <p className="text-center">
                        Answers come from your cooperative's records. Check
                        drafts before you confirm.
                      </p>
                    }
                  />
                </div>
              </div>
            </>
          )}
        </section>
      </div>
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className={GENERAL_DIALOG}>
          <DialogHeader className="pr-8">
            <DialogTitle className="text-lg leading-none font-semibold">
              Chat history
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Your saved chats, newest first.
            </DialogDescription>
          </DialogHeader>
          <Button
            size="sm"
            variant="secondary"
            className="self-start"
            disabled={navigationDisabled}
            onClick={newChat}
          >
            <HugeiconsIcon icon={PlusSignIcon} className="size-4" />
            New chat
          </Button>
          <ChatSearch value={chatQuery} onChange={setChatQuery} />
          <div className="-mx-2 min-h-0 overflow-x-hidden overflow-y-auto">
            {enabled ? (
              <GeneralChatList vm={vm} query={chatQuery} onChosen={openChat} />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Filters saved chats by title. */
function ChatSearch({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground focus-within:bg-muted/60 hover:bg-muted/60">
      <HugeiconsIcon icon={Search01Icon} className="size-4 shrink-0" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search"
        aria-label="Search saved chats"
        className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
      />
    </label>
  )
}
