"use client"

import { TenantLink } from "@halaalvest/tenant-url/next"
import { Button } from "@halaalvest/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@halaalvest/ui/components/dropdown-menu"
import { cn } from "@halaalvest/ui/lib/utils"
import {
  ArrowDown01Icon,
  ArrowUpRight01Icon,
  PlusSignIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { type ReactNode, useState } from "react"
import { useAssistantDraftRequests } from "@/components/quick-assistant/quick-assistant-requests"
import {
  GeneralComposer,
  GeneralThread,
  generalChatFlags,
  generalChatTitle,
  openProposals,
} from "./general-chat"
import {
  type GeneralAssistantVM,
  useGeneralAssistant,
} from "./use-general-assistant"

/**
 * The quick panel's chat (EwaTrade's `GeneralChat`): the same view model,
 * thread, cards and composer as the assistant page, in a compact frame.
 * Saved chats sit in the title menu, which also opens the full page.
 */
export function GeneralQuickChat({
  actions,
  onLeave,
}: {
  actions?: ReactNode
  active?: boolean
  /** Called when a link leaves the panel, e.g. to the full page. */
  onLeave?: () => void
}) {
  const [historyOpen, setHistoryOpen] = useState(false)
  const vm = useGeneralAssistant({ showHistory: historyOpen })
  // A record page's "Ask assistant" fills the composer; nothing is sent.
  useAssistantDraftRequests(vm.setDraft)
  const { navigationDisabled } = generalChatFlags(vm)
  const waiting = openProposals(vm).length
  return (
    <section
      aria-label="Assistant"
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
    >
      <header className="flex shrink-0 items-center gap-1 border-b py-1.5 pr-2 pl-3">
        <HugeiconsIcon
          icon={SparklesIcon}
          className="size-4 shrink-0 text-primary"
        />
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <GeneralChatSwitcher
            vm={vm}
            historyOpen={historyOpen}
            onHistoryOpenChange={setHistoryOpen}
            onLeave={onLeave}
          />
          {waiting ? (
            <span className="flex shrink-0 items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
              <span className="size-1.5 rounded-full bg-current" />
              {waiting} to review
            </span>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="New chat"
          title="New chat"
          disabled={navigationDisabled}
          onClick={vm.clearThread}
        >
          <HugeiconsIcon icon={PlusSignIcon} className="size-4" />
        </Button>
        {actions}
      </header>
      <GeneralThread vm={vm} compact />
      <div className="shrink-0 px-3 pt-2 pb-3">
        <GeneralComposer
          vm={vm}
          footer={
            <p className="text-center">
              Answers come from your cooperative's records. Check drafts before
              you confirm.
            </p>
          }
        />
      </div>
    </section>
  )
}

/** Title menu: saved chats, and the full assistant page. */
function GeneralChatSwitcher({
  vm,
  historyOpen,
  onHistoryOpenChange,
  onLeave,
}: {
  vm: GeneralAssistantVM
  historyOpen: boolean
  onHistoryOpenChange: (open: boolean) => void
  onLeave?: () => void
}) {
  const { navigationDisabled } = generalChatFlags(vm)
  const chats = vm.conversations.data?.items ?? []
  return (
    <DropdownMenu open={historyOpen} onOpenChange={onHistoryOpenChange}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="max-w-full min-w-0 justify-start gap-1 px-2 font-semibold"
            aria-label="Saved chats"
          />
        }
      >
        <span className="truncate">{generalChatTitle(vm)}</span>
        <HugeiconsIcon icon={ArrowDown01Icon} className="size-4 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Saved chats</DropdownMenuLabel>
          {vm.conversations.isError ? (
            <DropdownMenuItem onClick={() => void vm.conversations.refetch()}>
              Couldn't load chats. Retry
            </DropdownMenuItem>
          ) : vm.conversations.isPending && !vm.bootstrap.isError ? (
            <DropdownMenuItem disabled>Loading saved chats…</DropdownMenuItem>
          ) : chats.length ? (
            chats.map((conversation) => (
              <DropdownMenuItem
                key={conversation.id}
                disabled={navigationDisabled}
                onClick={() => vm.choose(conversation.id)}
                className={cn(
                  "flex flex-col items-start gap-0",
                  conversation.id === vm.conversationId && "font-medium"
                )}
              >
                <span className="w-full truncate">
                  {conversation.title || "New chat"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(conversation.updatedAt).toLocaleDateString("en-NG", {
                    timeZone: "Africa/Lagos",
                  })}
                </span>
              </DropdownMenuItem>
            ))
          ) : (
            <DropdownMenuItem disabled>Your saved chats appear here.</DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onLeave}
          render={
            <TenantLink
              href={
                vm.conversationId
                  ? `/assistant/c/${encodeURIComponent(vm.conversationId)}`
                  : "/assistant"
              }
            />
          }
        >
          <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-4" />
          Open the assistant page
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
