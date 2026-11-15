import { StatusBadge } from "@/components/app/status-badge"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { cn } from "@/lib/utils"
import type {
  AssistantActionResult,
  AssistantAnswer,
  AssistantLink,
  AssistantProposal,
} from "@halaalvest/assistant/contracts"
import { formatAssistantDate, formatMoney } from "@halaalvest/assistant/format"
import type { ReactNode } from "react"
import { View } from "react-native"
import {
  proposalConfirmLabel,
  proposalLapsed,
  proposalLines,
  proposalStatusLabel,
  proposalTitle,
} from "../model/proposal-model"
import { assistantAsOf } from "./assistant-ui"

type Answer<K extends AssistantAnswer["kind"]> = Extract<
  AssistantAnswer,
  { kind: K }
>

export type AnswerActions = {
  disabled: boolean
  onChoice: (label: string, value: string) => void
  onSuggest: (text: string) => void
  onAsk: (text: string) => void
  onOpenLink: (link: AssistantLink) => void
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

const base = "text-base leading-[22px]"

function LinkButton({
  link,
  actions,
  variant = "outline",
}: {
  link: AssistantLink
  actions: AnswerActions
  variant?: "outline" | "ghost"
}) {
  const large = useLargeTextLayout()
  return (
    <Button
      accessibilityLabel={link.label}
      className={cn(large ? "w-full" : "self-start", "min-h-11")}
      disabled={actions.disabled}
      size="sm"
      variant={variant}
      onPress={() => actions.onOpenLink(link)}
    >
      <Text>{link.label}</Text>
      <Icon name="ChevronRight" className="size-[16px] text-foreground" />
    </Button>
  )
}

/**
 * No card: an answer sits on the page like the reply text, set apart by
 * space alone (EwaTrade, 5 Nov 2026). Title, the value, rows, then where and
 * when in one small line, then the exact link.
 */
function AnswerBlock({
  title,
  value,
  asOf,
  currency = true,
  link,
  actions,
  children,
}: {
  title: string
  value?: string
  asOf?: string
  currency?: boolean
  link?: AssistantLink | null
  actions: AnswerActions
  children?: ReactNode
}) {
  const meta = [currency ? "Amounts in NGN" : null, asOf ? assistantAsOf(asOf) : null]
    .filter(Boolean)
    .join(" · ")
  return (
    <View accessibilityLabel={title} className="gap-1">
      <Text className="text-sm font-semibold leading-5 text-muted-foreground">
        {title}
      </Text>
      {value ? (
        <Text className="text-xl font-extrabold tracking-tight text-foreground">
          {value}
        </Text>
      ) : null}
      {children}
      {meta ? (
        <Text className="text-xs leading-[18px] text-muted-foreground">
          {meta}
        </Text>
      ) : null}
      {link ? (
        <View className="pt-1.5">
          <LinkButton link={link} actions={actions} />
        </View>
      ) : null}
    </View>
  )
}

function Row({
  label,
  value,
  sub,
  strong = false,
}: {
  label: string
  value?: string
  sub?: string | null
  strong?: boolean
}) {
  const large = useLargeTextLayout()
  return (
    <View
      className={cn(
        "border-t border-border py-2",
        large ? "gap-0.5" : "flex-row items-start justify-between gap-3"
      )}
    >
      <View className="min-w-0 flex-1">
        <Text
          className={cn(
            base,
            strong ? "font-bold text-foreground" : "text-foreground"
          )}
        >
          {label}
        </Text>
        {sub ? (
          <Text className="text-sm leading-5 text-muted-foreground">{sub}</Text>
        ) : null}
      </View>
      {value ? (
        <Text
          className={cn(base, "font-semibold text-foreground", !large && "text-right")}
        >
          {value}
        </Text>
      ) : null}
    </View>
  )
}

function FinancingStatus({
  answer,
  actions,
}: {
  answer: Answer<"financing-status">
  actions: AnswerActions
}) {
  const lead = answer.active[0]
  return (
    <AnswerBlock
      title="Financing"
      value={lead ? `${formatMoney(lead.remaining)} left` : "No active financing"}
      asOf={answer.asOf}
      link={answer.link}
      actions={actions}
    >
      <View className="pt-1">
        {answer.active.map((item) => (
          <Row
            key={item.id}
            label={`${item.label} · ${item.reference}`}
            sub={[
              financingStatus[item.status],
              `${formatMoney(item.remaining)} of ${formatMoney(item.principal)} left`,
              item.nextDue
                ? `Next due ${formatAssistantDate(item.nextDue.date)}: ${formatMoney(item.nextDue.amount)}`
                : null,
            ]
              .filter(Boolean)
              .join("\n")}
          />
        ))}
        {answer.requests.map((request) => (
          <Row
            key={request.id}
            label={`${request.label} · ${request.reference}`}
            sub={request.stage}
            value={formatMoney(request.amount)}
          />
        ))}
      </View>
    </AnswerBlock>
  )
}

function Investments({
  answer,
  actions,
}: {
  answer: Answer<"investments">
  actions: AnswerActions
}) {
  return (
    <AnswerBlock
      title="Savings, shares and profit"
      asOf={answer.asOf}
      link={answer.link}
      actions={actions}
    >
      <View className="pt-1">
        <Row label="Regular savings" value={formatMoney(answer.regularSavings)} />
        <Row label="Special savings" value={formatMoney(answer.specialSavings)} />
        <Row
          label="Share capital"
          sub={
            answer.shareUnits === null
              ? null
              : `${answer.shareUnits.toLocaleString("en-NG")} units`
          }
          value={formatMoney(answer.shareCapital)}
        />
        <Row
          label="Published profit"
          value={formatMoney(answer.publishedProfit)}
        />
      </View>
      <Text className={cn(base, "text-foreground")}>{answer.basis}</Text>
    </AnswerBlock>
  )
}

function ReceiptRows({
  items,
  actions,
}: {
  items: Answer<"receipts">["items"]
  actions: AnswerActions
}) {
  return (
    <View className="pt-1">
      {items.map((item) => (
        <View key={item.id} className="gap-1.5 border-t border-border py-2">
          <View className="flex-row flex-wrap items-center justify-between gap-2">
            <Text className={cn(base, "font-semibold text-foreground")}>
              {formatMoney(item.amount)}
            </Text>
            <StatusBadge
              label={receiptStatus[item.status] ?? item.status}
              tone={
                item.status === "approved"
                  ? "success"
                  : item.status === "submitted"
                    ? "neutral"
                    : "warning"
              }
            />
          </View>
          <Text className="text-sm leading-5 text-muted-foreground">
            {item.reference} · {formatAssistantDate(item.submittedAt)}
            {item.reason ? ` · ${item.reason}` : ""}
          </Text>
          <LinkButton link={item.link} actions={actions} variant="ghost" />
        </View>
      ))}
    </View>
  )
}

function MemberMatches({
  answer,
  actions,
}: {
  answer: Answer<"member-matches">
  actions: AnswerActions
}) {
  return (
    <AnswerBlock
      title={`Members matching “${answer.query}”`}
      currency={false}
      actions={actions}
    >
      {answer.items.length ? (
        <View className="pt-1">
          {answer.items.map((item) => (
            <View key={item.memberId} className="gap-1.5 border-t border-border py-2">
              <Text className={cn(base, "font-semibold text-foreground")}>
                {item.name}
              </Text>
              <Text className="text-sm leading-5 text-muted-foreground">
                {item.memberNumber}
                {item.hint ? ` · ${item.hint}` : ""}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                <Button
                  className="min-h-11"
                  disabled={actions.disabled}
                  size="sm"
                  variant="outline"
                  onPress={() =>
                    actions.onAsk(`Show history for ${item.memberNumber}`)
                  }
                >
                  <Text>History</Text>
                </Button>
                <LinkButton link={item.link} actions={actions} variant="ghost" />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text className={cn(base, "text-foreground")}>
          No members match that search.
        </Text>
      )}
      {answer.truncated ? (
        <Text className="text-sm leading-5 text-muted-foreground">
          More members match. Add a member number or another name.
        </Text>
      ) : null}
    </AnswerBlock>
  )
}

function MemberHistory({
  answer,
  actions,
}: {
  answer: Answer<"member-history">
  actions: AnswerActions
}) {
  return (
    <AnswerBlock
      title={`${answer.member.name} · ${answer.member.memberNumber}`}
      asOf={answer.asOf}
      link={answer.link}
      actions={actions}
    >
      <View className="pt-1">
        <Row label="Regular savings" value={formatMoney(answer.regularSavings)} />
        <Row label="Special savings" value={formatMoney(answer.specialSavings)} />
        <Row label="Share capital" value={formatMoney(answer.shareCapital)} />
        <Row
          label="Outstanding financing"
          value={formatMoney(answer.outstandingFinancing)}
        />
      </View>
      {answer.recentReceipts.length ? (
        <>
          <Text className="pt-2 text-sm font-semibold leading-5 text-muted-foreground">
            Recent receipts
          </Text>
          <ReceiptRows items={answer.recentReceipts} actions={actions} />
        </>
      ) : null}
    </AnswerBlock>
  )
}

function ReceiptQueue({
  answer,
  actions,
}: {
  answer: Answer<"receipt-queue">
  actions: AnswerActions
}) {
  return (
    <AnswerBlock
      title="Receipts to review"
      value={`${answer.pendingCount.toLocaleString("en-NG")} waiting`}
      asOf={answer.asOf}
      link={answer.link}
      actions={actions}
    >
      {answer.correctionCount ? (
        <Text className="text-sm leading-5 text-warn">
          {answer.correctionCount} need correction
        </Text>
      ) : null}
      <View className="pt-1">
        {answer.items.map((item) => (
          <View key={item.id} className="gap-1.5 border-t border-border py-2">
            <Text className={cn(base, "font-semibold text-foreground")}>
              {item.memberName} · {item.memberNumber}
            </Text>
            <Text className="text-sm leading-5 text-muted-foreground">
              {formatMoney(item.amount)} · {item.reference} ·{" "}
              {formatAssistantDate(item.submittedAt)} ·{" "}
              {receiptStatus[item.status]}
            </Text>
            <LinkButton link={item.link} actions={actions} variant="ghost" />
          </View>
        ))}
      </View>
    </AnswerBlock>
  )
}

function Help({
  answer,
  actions,
}: {
  answer: Answer<"help">
  actions: AnswerActions
}) {
  return (
    <AnswerBlock title="What I can help with" currency={false} actions={actions}>
      <View className="gap-2 pt-1">
        {answer.items.map((item) => (
          <View key={item.capabilityId} className="gap-1 border-t border-border pt-2">
            <Text className={cn(base, "font-semibold text-foreground")}>
              {item.title}
            </Text>
            <Button
              className="min-h-11 self-start"
              disabled={actions.disabled}
              size="sm"
              variant="outline"
              onPress={() => actions.onSuggest(item.suggestion)}
            >
              <Text>{item.suggestion}</Text>
            </Button>
          </View>
        ))}
      </View>
    </AnswerBlock>
  )
}

function Clarify({
  answer,
  actions,
}: {
  answer: Answer<"clarify">
  actions: AnswerActions
}) {
  return (
    <View className="gap-2">
      <Text className={cn(base, "text-foreground")}>{answer.question}</Text>
      <View className="flex-row flex-wrap gap-2">
        {answer.options.map((option) => (
          <Button
            key={option.value}
            className="min-h-11"
            disabled={actions.disabled}
            size="sm"
            variant="outline"
            onPress={() => actions.onChoice(option.label, option.value)}
          >
            <Text>{option.label}</Text>
          </Button>
        ))}
      </View>
    </View>
  )
}

const noticeTitle: Record<Answer<"notice">["tone"], string> = {
  empty: "Nothing here yet",
  unavailable: "Couldn't read this right now",
  denied: "Not available for your account",
  unsupported: "Not something I can do yet",
  info: "Good to know",
}

function Notice({
  answer,
  actions,
}: {
  answer: Answer<"notice">
  actions: AnswerActions
}) {
  const warn = answer.tone === "unavailable" || answer.tone === "denied"
  return (
    <View
      accessibilityLabel={noticeTitle[answer.tone]}
      className={cn(
        "gap-2 rounded-[18px] p-3",
        warn ? "border border-warn/40 bg-warn/10" : "bg-muted"
      )}
    >
      <Text
        className={cn(
          base,
          "font-bold",
          warn ? "text-warn" : "text-foreground"
        )}
      >
        {noticeTitle[answer.tone]}
      </Text>
      <Text className={cn(base, "text-foreground")}>{answer.message}</Text>
      {answer.link ? <LinkButton link={answer.link} actions={actions} /> : null}
    </View>
  )
}

/** One typed card per answer kind. */
export function AssistantAnswerCard({
  answer,
  actions,
}: {
  answer: AssistantAnswer
  actions: AnswerActions
}) {
  switch (answer.kind) {
    case "financing-status":
      return <FinancingStatus answer={answer} actions={actions} />
    case "investments":
      return <Investments answer={answer} actions={actions} />
    case "receipts":
      return (
        <AnswerBlock
          title="Your receipts"
          asOf={answer.asOf}
          link={answer.link}
          actions={actions}
        >
          {answer.items.length ? (
            <ReceiptRows items={answer.items} actions={actions} />
          ) : (
            <Text className={cn(base, "text-foreground")}>
              You have no receipts yet.
            </Text>
          )}
        </AnswerBlock>
      )
    case "member-matches":
      return <MemberMatches answer={answer} actions={actions} />
    case "member-history":
      return <MemberHistory answer={answer} actions={actions} />
    case "receipt-queue":
      return <ReceiptQueue answer={answer} actions={actions} />
    case "help":
      return <Help answer={answer} actions={actions} />
    case "clarify":
      return <Clarify answer={answer} actions={actions} />
    case "notice":
      return <Notice answer={answer} actions={actions} />
  }
}

/**
 * A draft waiting for the person: the exact revision, then Confirm, Edit or
 * Cancel. Presentation only; the screen supplies the server-authorized
 * decisions. Confirm is never automatic and is off while a request runs.
 */
export function ProposalCard({
  proposal,
  disabled,
  working,
  offlineReason,
  onConfirm,
  onEdit,
  onCancel,
  onShare,
  onAddProof,
  highlighted,
}: {
  proposal: AssistantProposal
  disabled: boolean
  working: boolean
  /** Why actions are paused (offline, locked); shown in place of the hint. */
  offlineReason?: string
  onConfirm: () => void
  onEdit: () => void
  onCancel: () => void
  /** Share the draft's website link. Works offline; it sends nothing. */
  onShare?: () => void
  /** Receipt drafts: proof is added on the Receipts screen (no upload here). */
  onAddProof?: () => void
  /** Opened from a draft link. */
  highlighted?: boolean
}) {
  const large = useLargeTextLayout()
  const actionClass = large ? "w-full min-h-11" : "min-h-11 px-3"
  const kind = proposal.fields.kind
  const lapsed = proposalLapsed(proposal)
  const status =
    lapsed && (proposal.status === "review" || proposal.status === "collecting")
      ? "expired"
      : proposal.status
  const reviewing = status === "review"
  const collecting = status === "collecting"
  const open = reviewing || collecting
  const busy = disabled || working
  return (
    <View
      accessibilityLabel={
        highlighted ? `${proposalTitle[kind]}, from your link` : proposalTitle[kind]
      }
      className={cn(
        "gap-3 rounded-[18px] border bg-card p-3",
        open ? "border-brand-warm" : "border-border",
        highlighted && "border-2"
      )}
    >
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <Text className={cn(base, "font-bold text-foreground")}>
          {proposalTitle[kind]}
        </Text>
        <StatusBadge
          label={reviewing ? "Check and confirm" : proposalStatusLabel[status]}
          tone={
            status === "confirmed"
              ? "success"
              : open
                ? "warning"
                : status === "refused"
                  ? "destructive"
                  : "muted"
          }
        />
      </View>
      <View>
        {proposalLines(proposal.fields).map((line, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: review lines have no ids
          <Row key={index} label={line.label} value={line.value} strong={line.strong} />
        ))}
      </View>
      {collecting && proposal.missing.length ? (
        <Text className={cn(base, "text-warn")}>
          Still needed: {proposal.missing.join(", ")}.
        </Text>
      ) : null}
      {open ? (
        <>
          <Text className={cn(base, "text-muted-foreground")}>
            {offlineReason ??
              `${proposal.effect}${proposal.confirmInApp ? " Confirm it here in the app." : ""}`}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {reviewing ? (
              <Button className={actionClass} disabled={busy} onPress={onConfirm}>
                <Text>{working ? "Saving…" : proposalConfirmLabel[kind]}</Text>
              </Button>
            ) : null}
            <Button
              className={actionClass}
              disabled={busy}
              variant="outline"
              onPress={onEdit}
            >
              <Text>{collecting ? "Add details" : "Edit"}</Text>
            </Button>
            <Button
              className={actionClass}
              disabled={busy}
              variant="ghost"
              onPress={onCancel}
            >
              <Text>Cancel draft</Text>
            </Button>
          </View>
          {onAddProof &&
          proposal.fields.kind === "receipt-submission" &&
          !proposal.fields.evidenceUploadId ? (
            <View className="gap-2 rounded-[14px] bg-muted/60 p-3">
              <Text className={cn(base, "text-foreground")}>
                Need to attach payment proof? Submit this receipt from the
                Receipts screen instead; this draft stays here until you
                confirm or cancel it.
              </Text>
              <Button
                className={cn(actionClass, "self-start")}
                variant="outline"
                onPress={onAddProof}
              >
                <Icon name="ReceiptText" className="size-[16px] text-foreground" />
                <Text>Open Receipts</Text>
              </Button>
            </View>
          ) : null}
        </>
      ) : (
        <Text className={cn(base, "text-muted-foreground")}>
          {status === "expired"
            ? "This draft expired before it was confirmed. Ask again to start a fresh one."
            : status === "confirmed"
              ? "Confirmed."
              : status === "refused"
                ? "Your account can't confirm this. Nothing was saved."
                : "Nothing was saved."}
        </Text>
      )}
      {onShare ? (
        <Button
          accessibilityLabel="Share a link to this draft"
          className="min-h-11 self-start px-2"
          size="sm"
          variant="ghost"
          onPress={onShare}
        >
          <Icon name="Share" className="size-[16px] text-muted-foreground" />
          <Text className="text-muted-foreground">Share link</Text>
        </Button>
      ) : null}
    </View>
  )
}

/** The outcome of a confirmation, with the saved reference and its link. */
export function ResultCard({
  result,
  actions,
}: {
  result: AssistantActionResult
  actions: AnswerActions
}) {
  const saved = result.outcome === "saved"
  const checking = result.outcome === "checking"
  return (
    <View
      accessibilityLabel={saved ? "Saved" : checking ? "Still checking" : "Not saved"}
      className={cn(
        "gap-3 rounded-[18px] p-3",
        saved
          ? "bg-success/10"
          : checking
            ? "border border-warn/40 bg-warn/10"
            : "border border-destructive/40 bg-destructive/10"
      )}
    >
      <View className="flex-row items-start gap-3">
        <Icon
          name={saved ? "CircleCheck" : checking ? "CalendarClock" : "CircleX"}
          className={cn(
            "size-[20px]",
            saved ? "text-success" : checking ? "text-warn" : "text-destructive"
          )}
        />
        <View className="min-w-0 flex-1 gap-1">
          <Text className={cn(base, "font-bold text-foreground")}>
            {result.reference ?? (saved ? "Saved" : checking ? "Still checking" : "Not saved")}
          </Text>
          <Text className={cn(base, "text-foreground")}>{result.message}</Text>
          {checking ? (
            <Text className={cn(base, "text-muted-foreground")}>
              Open the record to see if it saved before trying again.
            </Text>
          ) : null}
        </View>
      </View>
      {result.link ? <LinkButton link={result.link} actions={actions} /> : null}
    </View>
  )
}
