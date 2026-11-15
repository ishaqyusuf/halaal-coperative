"use client"

import {
  type AssistantActionResult,
  type AssistantProposal,
  assistantHrefs,
} from "@halaalvest/assistant/contracts"
import { TenantLink } from "@halaalvest/tenant-url/next"
import { Badge } from "@halaalvest/ui/components/badge"
import { Button } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import {
  Cancel01Icon,
  Clock01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useState } from "react"
import { UploadEvidenceInput } from "@/components/upload-evidence-input"
import { AssistantCopyLink } from "./assistant-copy-link"
import { AssistantLinkButton } from "./general-answer-card"
import {
  proposalConfirmLabel,
  proposalLapsed,
  proposalLines,
  proposalStatusLabel,
  proposalTitle,
  receiptProofUploadId,
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
  receiptProofUploads = false,
  onConfirm,
  onCancel,
  onEdit,
  onProofUploaded,
}: {
  proposal: AssistantProposal
  /** The confirmation's saved result, when this page confirmed it. */
  result?: AssistantActionResult | null
  /** Chat-wide reasons not to act (sending, unavailable). */
  disabled: boolean
  /** A confirm, edit or cancel for this draft is in flight. */
  working: boolean
  /** `bootstrap.uploads.receiptProof`: proof can be attached in chat. */
  receiptProofUploads?: boolean
  onConfirm: () => void
  onCancel: () => void
  onEdit: () => void
  /** An uploaded proof for a receipt draft; saved as a new revision. */
  onProofUploaded?: (file: { uploadId: string; name: string }) => void
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

  // Saved, or still settling for this exact revision: show the outcome, not
  // another Confirm.
  if (
    result &&
    (status === "confirmed" ||
      (result.outcome === "checking" && result.revision === proposal.revision))
  )
    return <ActionResultCard result={result} />

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
        <div className="flex items-center gap-1">
        <AssistantCopyLink
          href={assistantHrefs.proposal(proposal.id)}
          label="Copy draft link"
        />
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
      {open && proposal.fields.kind === "receipt-submission" ? (
        <ReceiptProofStep
          fileName={proposal.fields.evidenceName ?? null}
          attached={!!proposal.fields.evidenceUploadId}
          uploads={receiptProofUploads && !!onProofUploaded}
          disabled={busy}
          onUploaded={(file) => onProofUploaded?.(file)}
        />
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

/**
 * Proof for a member's receipt draft (M04). With private uploads on, the
 * file goes up as `payment_receipt_proof` and the draft gets a new revision
 * naming it; otherwise the receipts page takes the proof.
 */
function ReceiptProofStep({
  attached,
  fileName,
  uploads,
  disabled,
  onUploaded,
}: {
  attached: boolean
  fileName: string | null
  uploads: boolean
  disabled: boolean
  onUploaded: (file: { uploadId: string; name: string }) => void
}) {
  const [error, setError] = useState<string | null>(null)
  if (!uploads)
    return attached ? null : (
      <p className="text-xs text-muted-foreground">
        <TenantLink
          href="/payment-receipts"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Add proof on the receipts page
        </TenantLink>
      </p>
    )
  return (
    <div className="grid gap-1.5 rounded-md bg-muted/40 p-3">
      <p className="text-xs font-medium">
        {attached ? "Replace proof of payment" : "Add proof of payment"}
      </p>
      <UploadEvidenceInput
        disabled={disabled}
        purpose="payment_receipt_proof"
        onUploaded={(upload) => {
          const uploadId = receiptProofUploadId(upload.url)
          if (!uploadId) {
            setError("That upload didn't finish. Try again.")
            return
          }
          setError(null)
          onUploaded({ uploadId, name: upload.fileName })
        }}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
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
