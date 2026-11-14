"use client"

import type {
  AssistantAnswer,
  AssistantLink,
} from "@halaalvest/assistant/contracts"
import { formatAssistantDate, formatMoney } from "@halaalvest/assistant/format"
import { Badge } from "@halaalvest/ui/components/badge"
import { Button } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"
import type { ReactNode } from "react"

type Answer<K extends AssistantAnswer["kind"]> = Extract<
  AssistantAnswer,
  { kind: K }
>

export type AnswerActions = {
  /** Sends a tapped clarify option as the next turn. */
  onChoice: (label: string, value: string) => void
  /** Puts a suggested question in the composer. */
  onSuggest: (text: string) => void
  /** Asks a follow-up straight away (e.g. a chosen member's history). */
  onAsk: (text: string) => void
  disabled: boolean
}

/** "14 Nov 2026, 10:00" in the cooperative's time zone. */
export function formatAsOf(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  })
}

/** Only app-relative paths open; anything else is dropped. */
export function safeAssistantHref(href: string) {
  return href.startsWith("/") && !href.startsWith("//") ? href : null
}

export function AssistantLinkButton({
  link,
  variant = "outline",
  className,
}: {
  link: AssistantLink
  variant?: "outline" | "ghost"
  className?: string
}) {
  const href = safeAssistantHref(link.href)
  if (!href) return null
  return (
    <Button
      size="sm"
      variant={variant}
      className={className}
      nativeButton={false}
      render={<Link href={href} />}
    >
      {link.label}
      <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
    </Button>
  )
}

const receiptStatus: Record<string, string> = {
  submitted: "Waiting for review",
  approved: "Approved",
  rejected: "Rejected",
  correction: "Needs correction",
}

const financingStatus: Record<string, string> = {
  approved: "Approved, not yet disbursed",
  disbursed: "Disbursed",
  repaying: "Repaying",
  overdue: "Overdue",
}

/**
 * Value and meaning first; where it came from in a small line; the original
 * record opens from the right (below on narrow chats). Ported from
 * EwaTrade's answer card.
 */
function AnswerFrame({
  title,
  asOf,
  currency = true,
  link,
  children,
}: {
  title: string
  asOf?: string
  currency?: boolean
  link?: AssistantLink | null
  children: ReactNode
}) {
  return (
    <section
      aria-label={title}
      className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 rounded-lg border bg-card px-4 py-3 [overflow-wrap:anywhere]"
    >
      <div className="min-w-0 flex-1 basis-56">
        <p className="text-xs text-muted-foreground">{title}</p>
        {children}
        {asOf || currency ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {[
              currency ? "Amounts in NGN" : null,
              asOf ? (
                <span key="as-of">
                  as of <time dateTime={asOf}>{formatAsOf(asOf)}</time>
                </span>
              ) : null,
            ]
              .filter(Boolean)
              .map((part, index) => (
                <span key={index}>
                  {index ? " · " : null}
                  {part}
                </span>
              ))}
          </p>
        ) : null}
      </div>
      {link ? (
        <div className="shrink-0">
          <AssistantLinkButton link={link} />
        </div>
      ) : null}
    </section>
  )
}

function Row({
  label,
  value,
  strong = false,
}: {
  label: ReactNode
  value: ReactNode
  strong?: boolean
}) {
  return (
    <div
      className={cn(
        "flex justify-between gap-4 text-sm",
        strong && "font-semibold"
      )}
    >
      <span className={cn("min-w-0", !strong && "text-muted-foreground")}>
        {label}
      </span>
      <span className="max-w-[60%] text-right tabular-nums">{value}</span>
    </div>
  )
}

function FinancingStatusCard({ answer }: { answer: Answer<"financing-status"> }) {
  const empty = !answer.active.length && !answer.requests.length
  return (
    <AnswerFrame title="Financing" asOf={answer.asOf} link={answer.link}>
      {empty ? (
        <p className="mt-1 text-sm">You have no financing or open requests.</p>
      ) : null}
      {answer.active.length ? (
        <ol className="mt-2 grid gap-3">
          {answer.active.map((item) => (
            <li key={item.id} className="grid gap-1 border-t pt-2 first:border-0 first:pt-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium">
                  {item.label}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    {item.reference}
                  </span>
                </p>
                <Badge
                  variant={item.status === "overdue" ? "destructive" : "secondary"}
                >
                  {financingStatus[item.status]}
                </Badge>
              </div>
              <p className="text-xl leading-tight font-semibold tabular-nums">
                {formatMoney(item.remaining)}
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  left of {formatMoney(item.principal)}
                </span>
              </p>
              {item.nextDue ? (
                <Row
                  label={`Next due ${formatAssistantDate(item.nextDue.date)}`}
                  value={formatMoney(item.nextDue.amount)}
                />
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
      {answer.requests.length ? (
        <div className="mt-3 grid gap-1.5 border-t pt-2">
          <p className="text-xs text-muted-foreground">Requests</p>
          {answer.requests.map((request) => (
            <Row
              key={request.id}
              label={
                <>
                  {request.label} · {request.reference}
                  <span className="block text-xs">{request.stage}</span>
                </>
              }
              value={formatMoney(request.amount)}
            />
          ))}
        </div>
      ) : null}
    </AnswerFrame>
  )
}

function InvestmentsCard({ answer }: { answer: Answer<"investments"> }) {
  return (
    <AnswerFrame
      title="Savings, shares and profit"
      asOf={answer.asOf}
      link={answer.link}
    >
      <div className="mt-2 grid gap-1.5">
        <Row label="Regular savings" value={formatMoney(answer.regularSavings)} />
        <Row label="Special savings" value={formatMoney(answer.specialSavings)} />
        <Row
          label={
            answer.shareUnits === null
              ? "Share capital"
              : `Share capital · ${answer.shareUnits.toLocaleString("en-NG")} units`
          }
          value={formatMoney(answer.shareCapital)}
        />
        <Row label="Published profit" value={formatMoney(answer.publishedProfit)} />
      </div>
      <p className="mt-2 text-sm">{answer.basis}</p>
    </AnswerFrame>
  )
}

function ReceiptRows({
  items,
}: {
  items: Answer<"receipts">["items"]
}) {
  return (
    <ol className="mt-2 grid gap-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 first:border-0 first:pt-0"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium tabular-nums">
              {formatMoney(item.amount)}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                {item.reference} · {formatAssistantDate(item.submittedAt)}
              </span>
            </p>
            <p
              className={cn(
                "text-xs",
                item.status === "rejected" || item.status === "correction"
                  ? "text-amber-700 dark:text-amber-400"
                  : "text-muted-foreground"
              )}
            >
              {receiptStatus[item.status]}
              {item.reason ? ` · ${item.reason}` : null}
            </p>
          </div>
          <AssistantLinkButton link={item.link} variant="ghost" />
        </li>
      ))}
    </ol>
  )
}

function ReceiptsCard({ answer }: { answer: Answer<"receipts"> }) {
  return (
    <AnswerFrame title="Your receipts" asOf={answer.asOf} link={answer.link}>
      {answer.items.length ? (
        <ReceiptRows items={answer.items} />
      ) : (
        <p className="mt-1 text-sm">You have no receipts yet.</p>
      )}
    </AnswerFrame>
  )
}

function MemberMatchesCard({
  answer,
  actions,
}: {
  answer: Answer<"member-matches">
  actions: AnswerActions
}) {
  return (
    <AnswerFrame title={`Members matching “${answer.query}”`} currency={false}>
      {answer.items.length ? (
        <ol className="mt-2 grid gap-2">
          {answer.items.map((item) => (
            <li
              key={item.memberId}
              className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 first:border-0 first:pt-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.memberNumber}
                  {item.hint ? ` · ${item.hint}` : null}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={actions.disabled}
                  onClick={() =>
                    actions.onAsk(`Show history for ${item.memberNumber}`)
                  }
                >
                  History
                </Button>
                <AssistantLinkButton link={item.link} variant="ghost" />
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-1 text-sm">No members match that search.</p>
      )}
      {answer.truncated ? (
        <p className="mt-2 text-xs text-muted-foreground">
          More members match. Add a member number or another name to narrow it.
        </p>
      ) : null}
    </AnswerFrame>
  )
}

function MemberHistoryCard({ answer }: { answer: Answer<"member-history"> }) {
  return (
    <AnswerFrame
      title={`${answer.member.name} · ${answer.member.memberNumber}`}
      asOf={answer.asOf}
      link={answer.link}
    >
      <div className="mt-2 grid gap-1.5">
        <Row label="Regular savings" value={formatMoney(answer.regularSavings)} />
        <Row label="Special savings" value={formatMoney(answer.specialSavings)} />
        <Row label="Share capital" value={formatMoney(answer.shareCapital)} />
        <Row
          label="Outstanding financing"
          value={formatMoney(answer.outstandingFinancing)}
        />
      </div>
      {answer.recentReceipts.length ? (
        <div className="mt-3 border-t pt-2">
          <p className="text-xs text-muted-foreground">Recent receipts</p>
          <ReceiptRows items={answer.recentReceipts} />
        </div>
      ) : null}
    </AnswerFrame>
  )
}

function ReceiptQueueCard({ answer }: { answer: Answer<"receipt-queue"> }) {
  return (
    <AnswerFrame title="Receipts to review" asOf={answer.asOf} link={answer.link}>
      <p className="text-xl leading-tight font-semibold tabular-nums">
        {answer.pendingCount.toLocaleString("en-NG")} waiting
        {answer.correctionCount ? (
          <span className="ml-1.5 text-xs font-normal text-amber-700 dark:text-amber-400">
            {answer.correctionCount} need correction
          </span>
        ) : null}
      </p>
      {answer.items.length ? (
        <ol className="mt-2 grid gap-2">
          {answer.items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 border-t pt-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {item.memberName}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    {item.memberNumber}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {formatMoney(item.amount)} · {item.reference} ·{" "}
                  {formatAssistantDate(item.submittedAt)} ·{" "}
                  {receiptStatus[item.status]}
                </p>
              </div>
              <AssistantLinkButton link={item.link} variant="ghost" />
            </li>
          ))}
        </ol>
      ) : null}
    </AnswerFrame>
  )
}

function HelpCard({
  answer,
  actions,
}: {
  answer: Answer<"help">
  actions: AnswerActions
}) {
  return (
    <AnswerFrame title="What I can help with" currency={false}>
      <ul className="mt-2 grid gap-2">
        {answer.items.map((item) => (
          <li
            key={item.capabilityId}
            className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 first:border-0 first:pt-0"
          >
            <p className="text-sm font-medium">{item.title}</p>
            <Button
              size="sm"
              variant="outline"
              className="rounded-[999px]"
              disabled={actions.disabled}
              onClick={() => actions.onSuggest(item.suggestion)}
            >
              {item.suggestion}
            </Button>
          </li>
        ))}
      </ul>
    </AnswerFrame>
  )
}

function ClarifyCard({
  answer,
  actions,
}: {
  answer: Answer<"clarify">
  actions: AnswerActions
}) {
  return (
    <div className="grid gap-2">
      <p className="text-[15px] leading-7">{answer.question}</p>
      <div className="flex flex-wrap gap-2">
        {answer.options.map((option) => (
          <Button
            key={option.value}
            size="sm"
            variant="outline"
            disabled={actions.disabled}
            onClick={() => actions.onChoice(option.label, option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  )
}

const noticeTitle: Record<Answer<"notice">["tone"], string> = {
  empty: "Nothing here yet",
  unavailable: "Couldn't read this right now",
  denied: "Not available for your account",
  unsupported: "Not something I can do yet",
  info: "Good to know",
}

function NoticeCard({ answer }: { answer: Answer<"notice"> }) {
  const warn = answer.tone === "unavailable" || answer.tone === "denied"
  return (
    <section
      aria-label={noticeTitle[answer.tone]}
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border px-4 py-3",
        warn
          ? "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40"
          : "bg-card"
      )}
    >
      <div className="min-w-0 flex-1 basis-56">
        <p
          className={cn(
            "text-xs",
            warn ? "text-amber-800 dark:text-amber-300" : "text-muted-foreground"
          )}
        >
          {noticeTitle[answer.tone]}
        </p>
        <p className="text-sm">{answer.message}</p>
      </div>
      {answer.link ? <AssistantLinkButton link={answer.link} /> : null}
    </section>
  )
}

/** One typed card per answer kind. */
export function GeneralAnswerCard({
  answer,
  actions,
}: {
  answer: AssistantAnswer
  actions: AnswerActions
}) {
  switch (answer.kind) {
    case "financing-status":
      return <FinancingStatusCard answer={answer} />
    case "investments":
      return <InvestmentsCard answer={answer} />
    case "receipts":
      return <ReceiptsCard answer={answer} />
    case "member-matches":
      return <MemberMatchesCard answer={answer} actions={actions} />
    case "member-history":
      return <MemberHistoryCard answer={answer} />
    case "receipt-queue":
      return <ReceiptQueueCard answer={answer} />
    case "help":
      return <HelpCard answer={answer} actions={actions} />
    case "clarify":
      return <ClarifyCard answer={answer} actions={actions} />
    case "notice":
      return <NoticeCard answer={answer} />
  }
}
