"use client"

import type {
  AssistantActionResult,
  AssistantProposal,
} from "@halaalvest/assistant/contracts"
import { Badge } from "@halaalvest/ui/components/badge"
import { Button } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import {
  Cancel01Icon,
  Clock01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { AssistantLinkButton } from "./general-answer-card"
import {
  proposalConfirmLabel,
  proposalLapsed,
  proposalLines,
  proposalStatusLabel,
  proposalTitle,
} from "./proposal-model"

/**
 * A draft that needs the person: review the exact revision, then Confirm,
 * Edit or Cancel. Ported from EwaTrade's proposal card. Confirm is never
 * automatic and is disabled while any request for this draft is in flight.
 */
export function GeneralProposalCard({
  proposal,
  result,
  disabled,
  working,
  onConfirm,
  onCancel,
  onEdit,
}: {
  proposal: AssistantProposal
  /** The confirmation's saved result, when this page confirmed it. */
  result?: AssistantActionResult | null
  /** Chat-wide reasons not to act (sending, unavailable). */
  disabled: boolean
  /** A confirm, edit or cancel for this draft is in flight. */
  working: boolean
  onConfirm: () => void
  onCancel: () => void
  onEdit: () => void
}) {
  const kind = proposal.fields.kind
  const title = proposalTitle[kind]
  const lapsed = proposalLapsed(proposal)
  const status =
    lapsed && (proposal.status === "review" || proposal.status === "collecting")
      ? "expired"
      : proposal.status
  const reviewing = status === "review"
  const collecting = status === "collecting"
  const open = reviewing || collecting
  const lines = proposalLines(proposal.fields)
  const busy = disabled || working

  if (status === "confirmed" && result) return <ActionResultCard result={result} />

  return (
    <section
      aria-label={title}
      aria-busy={working}
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-lg border border-l-[3px] bg-card px-4 py-3 [overflow-wrap:anywhere]",
        status === "expired"
          ? "border-l-amber-500"
          : open
            ? "border-l-primary"
            : "border-l-border"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {status === "expired" ? (
          <Badge
            variant="outline"
            className="border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400"
          >
            <HugeiconsIcon icon={Clock01Icon} />
            {proposalStatusLabel.expired}
          </Badge>
        ) : (
          <Badge variant={open ? "default" : "secondary"}>
            {proposalStatusLabel[status]}
          </Badge>
        )}
      </div>
      <ul className="min-w-0 space-y-1 text-sm">
        {lines.map((line, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: review lines have no ids
          <li key={index}>
            <span
              className={cn(
                "flex justify-between gap-4",
                line.strong && "font-semibold"
              )}
            >
              <span
                className={cn("min-w-0", !line.strong && "text-muted-foreground")}
              >
                {line.label}
              </span>
              <span className="max-w-[60%] text-right tabular-nums">
                {line.value}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {collecting && proposal.missing.length ? (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Still needed: {proposal.missing.join(", ")}.
        </p>
      ) : null}
      {open ? <p className="text-xs text-muted-foreground">{proposal.effect}</p> : null}
      {open && proposal.confirmInApp ? (
        <p className="text-xs text-muted-foreground">
          This can only be confirmed here in the app.
        </p>
      ) : null}
      {open ? (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex flex-wrap gap-2">
            {reviewing ? (
              <Button size="sm" disabled={busy} onClick={onConfirm}>
                {working ? "Saving…" : proposalConfirmLabel[kind]}
              </Button>
            ) : null}
            <Button size="sm" variant="outline" disabled={busy} onClick={onEdit}>
              {collecting ? "Add details" : "Edit"}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={onCancel}>
              Cancel draft
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Nothing changes until you confirm · expires{" "}
            {new Date(proposal.expiresAt).toLocaleTimeString("en-NG", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Africa/Lagos",
            })}
          </p>
        </div>
      ) : status === "expired" ? (
        <p className="text-xs text-muted-foreground">
          This draft expired before it was confirmed. Ask again to start a fresh
          one.
        </p>
      ) : status === "confirmed" ? (
        <p className="text-xs text-muted-foreground">Confirmed.</p>
      ) : status === "refused" ? (
        <p className="text-xs text-muted-foreground">
          Your account can't confirm this. Nothing was saved.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Nothing was saved.</p>
      )}
    </section>
  )
}

const outcomeLabel: Record<AssistantActionResult["outcome"], string> = {
  saved: "Saved",
  not_saved: "Not saved",
  checking: "Still checking",
}

/** The saved (or not saved) outcome of a confirmation. */
export function ActionResultCard({ result }: { result: AssistantActionResult }) {
  const saved = result.outcome === "saved"
  const checking = result.outcome === "checking"
  return (
    <section
      aria-label={outcomeLabel[result.outcome]}
      className="flex min-h-11 min-w-0 flex-wrap items-center gap-3 rounded-lg border px-4 py-2 [overflow-wrap:anywhere]"
    >
      <span
        role="img"
        aria-label={outcomeLabel[result.outcome]}
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full",
          saved
            ? "bg-primary/10 text-primary"
            : checking
              ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
              : "bg-muted text-destructive"
        )}
      >
        <HugeiconsIcon
          icon={saved ? Tick02Icon : checking ? Clock01Icon : Cancel01Icon}
          className="size-3"
        />
      </span>
      <p className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 text-sm">
        <span className="font-medium">
          {result.reference ?? outcomeLabel[result.outcome]}
        </span>
        <span className="text-muted-foreground">{result.message}</span>
        {checking ? (
          <span className="text-xs text-muted-foreground">
            Open the record to see if it saved before trying again.
          </span>
        ) : null}
      </p>
      {result.link ? <AssistantLinkButton link={result.link} variant="ghost" /> : null}
    </section>
  )
}
