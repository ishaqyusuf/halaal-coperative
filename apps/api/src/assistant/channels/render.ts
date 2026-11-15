import {
  type AssistantAnswer,
  type AssistantLink,
  type AssistantRole,
  type AssistantTurnOutput,
  type CapabilityId,
  assistantHrefs,
  capabilitiesFor,
  capabilityAllowed,
  capabilityMode,
  formatAssistantDate,
  formatMoney,
  getAssistantCapability,
} from "@halaalvest/assistant"
import { type ChannelProvider, providerLabel } from "./config"
import type { ChannelButton, ChannelMessage } from "./types"

export type ChannelRenderOptions = {
  provider: ChannelProvider
  role: AssistantRole
  appUrl: string
  messagingChannelEnabled: boolean
  /**
   * Amounts stay inside signed-in Halaalvest until chat disclosure is agreed
   * (plan §3). Only a reviewed policy change may turn this on.
   */
  showAmounts?: boolean
  /** The saved reply, for "See the full answer" links. Set per turn. */
  messageId?: string
}

const answerCapability: Record<AssistantAnswer["kind"], CapabilityId> = {
  "financing-status": "M01",
  investments: "M02",
  receipts: "M03",
  "member-matches": "S01",
  "member-history": "S02",
  "receipt-queue": "S03",
  help: "X01",
  clarify: "X02",
  notice: "X02",
}

const MAX_ITEMS = 5
const MAX_MESSAGES = 4
const MAX_TEXT = 3500

/**
 * A protected link: the app asks the person to sign in. No token, no amount:
 * hrefs carry only app paths and record IDs, and opening one runs nothing.
 */
export function protectedLink(
  appUrl: string,
  link: AssistantLink | { label: string; href: string }
): ChannelButton {
  return {
    kind: "url",
    label: link.label.slice(0, 40),
    url: `${appUrl}${link.href.startsWith("/") ? link.href : "/"}`,
  }
}

/** The exact saved reply in the signed-in app (re-authorized on open). */
function fullAnswerLink(options: ChannelRenderOptions): ChannelButton | null {
  return options.messageId
    ? protectedLink(options.appUrl, {
        label: "See the full answer",
        href: assistantHrefs.message(options.messageId),
      })
    : null
}

function date(iso: string) {
  return formatAssistantDate(iso)
}

const receiptStatus = {
  submitted: "Waiting for review",
  approved: "Approved",
  rejected: "Not accepted",
  correction: "Needs correction",
} as const

function amount(
  options: ChannelRenderOptions,
  value: { amount: string; currency: "NGN" }
) {
  return options.showAmounts ? ` · ${formatMoney(value)}` : ""
}

function more(count: number) {
  return count > MAX_ITEMS
    ? [`…and ${count - MAX_ITEMS} more in Halaalvest.`]
    : []
}

/** Compact in-chat text for `bot` mode answers. */
function botAnswer(
  answer: AssistantAnswer,
  options: ChannelRenderOptions
): ChannelMessage {
  const open = (link: AssistantLink | null, truncated = false) => {
    const full = truncated ? fullAnswerLink(options) : null
    if (full) return [full]
    return link ? [protectedLink(options.appUrl, link)] : []
  }
  switch (answer.kind) {
    case "financing-status": {
      const lines = [
        ...answer.requests.map(
          (item) =>
            `• ${item.reference} ${item.label}: ${item.stage}${amount(options, item.amount)}`
        ),
        ...answer.active.map((item) => {
          const due = item.nextDue
            ? `, next due ${date(item.nextDue.date)}${amount(options, item.nextDue.amount)}`
            : ""
          return `• ${item.reference} ${item.label}: ${item.status}${due}`
        }),
      ]
      return {
        text: lines.length
          ? [
              `Financing as of ${date(answer.asOf)}`,
              ...lines.slice(0, MAX_ITEMS),
              ...more(lines.length),
            ].join("\n")
          : "You have no financing requests or active financing.",
        buttons: open(answer.link, lines.length > MAX_ITEMS),
      }
    }
    case "investments":
      return {
        text: options.showAmounts
          ? [
              `Savings and shares as of ${date(answer.asOf)}`,
              `Regular savings: ${formatMoney(answer.regularSavings)}`,
              `Special savings: ${formatMoney(answer.specialSavings)}`,
              `Share capital: ${formatMoney(answer.shareCapital)}`,
              `Published profit: ${formatMoney(answer.publishedProfit)}`,
            ].join("\n")
          : "Your savings, shares and profit are ready in Halaalvest.",
        buttons: open(answer.link),
      }
    case "receipts":
      return {
        text: answer.items.length
          ? [
              "Your receipts",
              ...answer.items
                .slice(0, MAX_ITEMS)
                .map(
                  (item) =>
                    `• ${item.reference} · ${date(item.submittedAt)} · ${receiptStatus[item.status]}${amount(options, item.amount)}`
                ),
              ...more(answer.items.length),
            ].join("\n")
          : "You have no receipts yet.",
        buttons: open(answer.link, answer.items.length > MAX_ITEMS),
      }
    case "receipt-queue":
      return {
        text: [
          `Receipts to review: ${answer.pendingCount} waiting, ${answer.correctionCount} need correction.`,
          ...answer.items
            .slice(0, MAX_ITEMS)
            .map(
              (item) =>
                `• ${item.reference} · ${item.memberNumber} · ${date(item.submittedAt)}${amount(options, item.amount)}`
            ),
          ...more(answer.items.length),
        ].join("\n"),
        buttons: open(answer.link, answer.items.length > MAX_ITEMS),
      }
    case "help":
      return {
        text: [
          "I can help with:",
          ...answer.items.map(
            (item) => `• ${item.title}: “${item.suggestion}”`
          ),
        ].join("\n"),
        buttons: answer.items
          .slice(0, 3)
          .map((item) => suggestionButton(item.suggestion)),
      }
    case "clarify":
      return {
        text: answer.question,
        buttons: answer.options.slice(0, 3).map((option) => ({
          kind: "reply" as const,
          label: option.label,
          data: `c:${option.value}`.slice(0, 64),
        })),
      }
    case "notice":
      return { text: answer.message, buttons: open(answer.link) }
    case "member-matches":
    case "member-history":
      // Staff member data never renders in chat; these are link-only.
      return linkAnswer(answer, options)
  }
}

function linkAnswer(
  answer: AssistantAnswer,
  options: ChannelRenderOptions
): ChannelMessage {
  const capability = getAssistantCapability(answerCapability[answer.kind])
  const link =
    "link" in answer && answer.link
      ? answer.link
      : { label: "Open Halaalvest", href: capability?.destination ?? "/" }
  return {
    text: `${capability?.title ?? "Your answer"} is ready in Halaalvest.`,
    buttons: [
      fullAnswerLink(options) ??
        protectedLink(options.appUrl, {
          label: "Open in Halaalvest",
          href: link.href,
        }),
    ],
  }
}

function unavailable(options: ChannelRenderOptions): ChannelMessage {
  return {
    text: `That isn't available in ${providerLabel[options.provider]}. You can do it in Halaalvest.`,
    buttons: [
      protectedLink(options.appUrl, {
        label: "Open Halaalvest",
        href: "/assistant",
      }),
    ],
  }
}

export function suggestionButton(text: string): ChannelButton {
  return {
    kind: "reply",
    label: text.slice(0, 40),
    data: `t:${text}`.slice(0, 64),
  }
}

/** Follows each capability's channel mode: `bot` answers, `link` hands off. */
export function renderAnswer(
  answer: AssistantAnswer,
  options: ChannelRenderOptions
): ChannelMessage {
  const id = answerCapability[answer.kind]
  if (answer.kind === "notice") return botAnswer(answer, options)
  if (
    !capabilityAllowed(id, options.role, options.provider, {
      messagingChannelEnabled: options.messagingChannelEnabled,
    })
  )
    return unavailable(options)
  const mode = capabilityMode(id, options.provider)
  if (mode === "bot") return botAnswer(answer, options)
  if (mode === "link") return linkAnswer(answer, options)
  return unavailable(options)
}

/**
 * One turn → chat messages. Proposals never confirm in chat: every financial
 * confirmation stays in the signed-in app.
 */
export function renderTurnForChannel(
  output: AssistantTurnOutput,
  turnOptions: ChannelRenderOptions
): ChannelMessage[] {
  const options = { ...turnOptions, messageId: output.reply.id }
  const messages: ChannelMessage[] = []
  for (const part of output.reply.parts) {
    if (part.type === "text") {
      if (!part.text.trim()) continue
      const cut = part.text.length > MAX_TEXT
      const full = cut ? fullAnswerLink(options) : null
      messages.push({
        text: cut ? `${part.text.slice(0, MAX_TEXT)}…` : part.text,
        ...(full ? { buttons: [full] } : {}),
      })
      continue
    }
    if (part.type === "answer") {
      messages.push(renderAnswer(part.answer, options))
      continue
    }
    if (part.type === "proposal") {
      const proposal = output.proposals.find(
        (item) => item.id === part.proposalId
      )
      const id = proposal?.capabilityId as CapabilityId | undefined
      const allowed =
        id &&
        capabilityAllowed(id, options.role, options.provider, {
          messagingChannelEnabled: options.messagingChannelEnabled,
        }) &&
        capabilityMode(id, options.provider) !== "off"
      if (!allowed) {
        messages.push(unavailable(options))
        continue
      }
      const title = getAssistantCapability(id)?.title ?? "Your draft"
      messages.push({
        text: `${title}: review and confirm it in Halaalvest. Nothing is saved until you confirm there.`,
        buttons: [
          protectedLink(options.appUrl, {
            label: "Review in Halaalvest",
            href: assistantHrefs.proposal(part.proposalId),
          }),
        ],
      })
      continue
    }
    if (part.type === "result")
      messages.push({
        text: [
          part.result.message,
          part.result.reference ? `Reference: ${part.result.reference}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
        buttons: part.result.link
          ? [protectedLink(options.appUrl, part.result.link)]
          : [],
      })
  }
  if (!messages.length)
    return [
      { text: "I couldn't answer that here. Try again, or open Halaalvest." },
    ]
  if (messages.length <= MAX_MESSAGES) return messages
  const full = fullAnswerLink(options)
  return [
    ...messages.slice(0, MAX_MESSAGES - 1),
    {
      text: "There's more in this answer.",
      ...(full ? { buttons: [full] } : {}),
    },
  ]
}

/** `/help`: only what this role can use on this channel. */
export function renderChannelHelp(
  options: ChannelRenderOptions & { tenantName: string }
) {
  const capabilities = capabilitiesFor(options.role, options.provider, {
    messagingChannelEnabled: options.messagingChannelEnabled,
  }).filter((capability) => capability.id !== "X01" && capability.id !== "X02")
  const commands =
    options.provider === "telegram"
      ? "Commands: /help, /scope, /new, /cancel, /disconnect"
      : "Send HELP, SCOPE, NEW, CANCEL or DISCONNECT."
  return {
    text: [
      `Connected to ${options.tenantName}. You can ask:`,
      ...capabilities.map(
        (capability) => `• ${capability.title}: “${capability.suggestion}”`
      ),
      "Anything that saves or changes money is confirmed in Halaalvest.",
      commands,
    ].join("\n"),
    buttons: capabilities
      .slice(0, 3)
      .map((capability) => suggestionButton(capability.suggestion)),
  } satisfies ChannelMessage
}
