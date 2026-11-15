"use client"

import type {
  AssistantLinkResolution,
  AssistantLinkTarget,
} from "@halaalvest/assistant/contracts"
import { TenantLink, useTenantRouter } from "@halaalvest/tenant-url/next"
import { Button, buttonVariants } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { type ReactNode, useEffect, useState } from "react"
import { assistantKeys, useAssistantApi } from "./assistant-api"
import { GeneralProposalCard } from "./general-proposal-card"
import { GeneralProposalEditor } from "./general-proposal-editor"
import { useGeneralAssistant } from "./use-general-assistant"

/** Ids the contract accepts; anything else is unavailable without a call. */
const linkId = (id: string) => id.length >= 1 && id.length <= 128

/** The chat path a saved-answer link opens, scrolled to that message. */
export function assistantMessageChatPath(conversationId: string, messageId: string) {
  return `/assistant/c/${encodeURIComponent(conversationId)}?m=${encodeURIComponent(messageId)}`
}

/**
 * Re-authorizes a link on every open (`assistant.links.resolve`, a read).
 * Nothing is cached between opens, so a link that stopped being yours stops
 * working at once.
 */
function useAssistantLink(target: AssistantLinkTarget) {
  const api = useAssistantApi()
  const valid = linkId(target.id)
  const query = useQuery({
    queryKey: assistantKeys.link(target),
    queryFn: () => api.resolveLink(target),
    enabled: valid,
    retry: false,
    gcTime: 0,
    staleTime: 0,
    refetchOnWindowFocus: false,
  })
  const resolution: AssistantLinkResolution | undefined = valid
    ? query.data
    : { status: "unavailable" }
  return { query, resolution }
}

/**
 * One title, at most one short line and one action (EwaTrade's link pages,
 * commit 98f019a85), centred in the dashboard shell.
 */
function LinkFrame({
  title,
  description,
  children,
  footer,
  wide = false,
}: {
  title: string
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col gap-6 py-6 sm:py-12",
        wide ? "max-w-xl" : "max-w-md"
      )}
    >
      <div className="grid gap-2">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
          {title}
        </h2>
        {description ? (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {description}
          </p>
        ) : null}
      </div>
      {children}
      {footer ? <div className="text-sm">{footer}</div> : null}
    </div>
  )
}

const Pending = () => (
  <div className="h-11 animate-pulse rounded-[var(--ui-radius-control)] bg-muted" />
)

function BackToAssistant({ primary = false }: { primary?: boolean }) {
  return (
    <TenantLink
      href="/assistant"
      className={
        primary
          ? cn(buttonVariants(), "w-full")
          : "font-medium text-primary underline-offset-4 hover:underline"
      }
    >
      Back to assistant
    </TenantLink>
  )
}

function Unavailable({ kind }: { kind: AssistantLinkTarget["kind"] }) {
  return (
    <LinkFrame
      title={
        kind === "message"
          ? "This answer isn't available"
          : "This draft isn't available"
      }
      description="It may have been removed, or it belongs to another account or cooperative."
    >
      <BackToAssistant primary />
    </LinkFrame>
  )
}

function CouldNotOpen({
  kind,
  onRetry,
}: {
  kind: AssistantLinkTarget["kind"]
  onRetry: () => void
}) {
  return (
    <LinkFrame
      title={kind === "message" ? "Couldn't open this answer" : "Couldn't open this draft"}
      description="Check your connection and try again."
      footer={<BackToAssistant />}
    >
      <Button className="w-full" onClick={onRetry}>
        Try again
      </Button>
    </LinkFrame>
  )
}

/**
 * Saved-answer link (`/assistant/m/<id>`): resolves, then replaces the URL
 * with the chat scrolled to and highlighting that message.
 */
export function AssistantMessageLink({ messageId }: { messageId: string }) {
  const router = useTenantRouter()
  const { query, resolution } = useAssistantLink({ kind: "message", id: messageId })
  const ok = resolution?.status === "ok" ? resolution : null
  useEffect(() => {
    if (!ok) return
    router.replace(
      assistantMessageChatPath(ok.conversationId, ok.messageId ?? messageId),
      { scroll: false }
    )
    // biome-ignore lint/correctness/useExhaustiveDependencies: navigate once per resolution
  }, [ok?.conversationId, ok?.messageId])

  if (resolution?.status === "unavailable") return <Unavailable kind="message" />
  if (query.isError)
    return <CouldNotOpen kind="message" onRetry={() => void query.refetch()} />
  return (
    <LinkFrame title="Opening your saved answer…" footer={<BackToAssistant />}>
      <Pending />
    </LinkFrame>
  )
}

/**
 * Draft link (`/assistant/review/<id>`): the live draft on its own page
 * with the normal Edit / Confirm / Cancel controls. Opening it only reads;
 * confirming is the person's own tap, exactly as in the chat.
 */
export function AssistantProposalLink({ proposalId }: { proposalId: string }) {
  const { query, resolution } = useAssistantLink({ kind: "proposal", id: proposalId })
  if (resolution?.status === "unavailable") return <Unavailable kind="proposal" />
  if (query.isError)
    return <CouldNotOpen kind="proposal" onRetry={() => void query.refetch()} />
  if (resolution?.status === "ok")
    return (
      <ProposalReview
        conversationId={resolution.conversationId}
        proposalId={resolution.proposalId ?? proposalId}
      />
    )
  return (
    <LinkFrame title="Opening your draft…" footer={<BackToAssistant />}>
      <Pending />
    </LinkFrame>
  )
}

function ProposalReview({
  conversationId,
  proposalId,
}: {
  conversationId: string
  proposalId: string
}) {
  const vm = useGeneralAssistant({ initialConversationId: conversationId })
  const [editing, setEditing] = useState(false)
  const proposal = vm.data?.proposals.find((row) => row.id === proposalId)
  const working = vm.working.has(proposalId)
  const footer = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <TenantLink
        href={`/assistant/c/${encodeURIComponent(conversationId)}`}
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        Open the chat
      </TenantLink>
      <BackToAssistant />
    </div>
  )

  if (vm.bootstrap.isError || vm.state.isError)
    return (
      <CouldNotOpen
        kind="proposal"
        onRetry={() =>
          void (vm.bootstrap.isError ? vm.bootstrap.refetch() : vm.state.refetch())
        }
      />
    )
  if (!vm.data)
    return (
      <LinkFrame title="Opening your draft…" footer={<BackToAssistant />}>
        <Pending />
      </LinkFrame>
    )
  if (!proposal) return <Unavailable kind="proposal" />

  return (
    <LinkFrame
      wide
      title={editing ? "Edit your draft" : "Review your draft"}
      description={vm.bootstrap.data?.cooperativeName}
      footer={footer}
    >
      <div className="grid gap-4" aria-live="polite">
        {vm.notice ? (
          <p role="alert" className="text-sm text-destructive">
            {vm.notice}
          </p>
        ) : null}
        {editing ? (
          <div className="rounded-lg border bg-card p-4 sm:p-6">
            <GeneralProposalEditor
              key={`${proposal.id}:${proposal.revision}`}
              proposal={proposal}
              disabled={working}
              onCancel={() => setEditing(false)}
              onSave={async (fields) => {
                if (await vm.save(proposal, fields)) setEditing(false)
              }}
            />
          </div>
        ) : (
          <GeneralProposalCard
            key={`${proposal.id}:${proposal.revision}`}
            proposal={proposal}
            result={vm.results[proposal.id]}
            disabled={false}
            working={working}
            receiptProofUploads={vm.receiptProofUploads}
            onConfirm={() => void vm.confirm(proposal)}
            onCancel={() => void vm.cancel(proposal)}
            onEdit={() => setEditing(true)}
            onProofUploaded={(file) => void vm.attachProof(proposal, file)}
          />
        )}
      </div>
    </LinkFrame>
  )
}
