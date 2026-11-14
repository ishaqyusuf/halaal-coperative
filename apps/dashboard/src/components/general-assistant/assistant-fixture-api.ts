import {
  assistantHelpItems,
  assistantSuggestions,
} from "@halaalvest/assistant/suggestions"
import type {
  AssistantActionResult,
  AssistantAnswer,
  AssistantConversationSummary,
  AssistantMessage,
  AssistantPart,
  AssistantProposal,
  AssistantProposalFields,
  AssistantTurnOutput,
} from "@halaalvest/assistant/contracts"
import {
  fixtureAnswers,
  fixtureProposal,
} from "@halaalvest/assistant/fixtures"
import { formatMoney, money } from "@halaalvest/assistant/format"
import { paymentRequestOptions, routeIntent } from "@halaalvest/assistant/intents"
import type { AssistantApi, AssistantConversationDetail } from "./assistant-api"

/**
 * Rehearsal adapter over the synthetic fixtures in `@halaalvest/assistant`.
 * Used until the coordinator's `assistant` tRPC router is registered; it
 * mirrors the router's contract (idempotent sends and confirmations, proposal
 * revisions) so the page behaves the same once the real procedures land.
 * Nothing here reads or writes cooperative data.
 */
type Conversation = AssistantConversationDetail & { archived: boolean }

const wait = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms))
const now = () => new Date().toISOString()
let counter = 0
const id = (prefix: string) => `${prefix}_${Date.now().toString(36)}${++counter}`

function summarise(parts: AssistantPart[]) {
  const text = parts.find((part) => part.type === "text")
  return text && text.type === "text" ? text.text.slice(0, 120) : null
}

function proposalMissing(fields: AssistantProposalFields): string[] {
  const missing: string[] = []
  if (!fields.amount) missing.push("Amount")
  if (fields.kind === "receipt-submission" && !fields.paidOn)
    missing.push("Date paid")
  if (fields.kind === "payment-request" && !fields.purpose)
    missing.push("What the payment is for")
  if (fields.kind === "record-payment") {
    if (!fields.member) missing.push("Member")
    if (!fields.paidOn) missing.push("Date paid")
    if (!fields.period) missing.push("Collection month")
  }
  return missing
}

const effects: Record<AssistantProposalFields["kind"], string> = {
  "receipt-submission":
    "Saves a receipt for review. No money is posted until staff approve it.",
  "payment-request":
    "Sends your request to the cooperative. Nothing is paid until staff approve it.",
  "record-payment":
    "Posts this payment to the member's account. This changes their balance.",
}

const capabilityFor: Record<AssistantProposalFields["kind"], string> = {
  "receipt-submission": "M04",
  "payment-request": "M05",
  "record-payment": "S04",
}

export function createFixtureAssistantApi({
  role,
  cooperativeName,
}: {
  role: "member" | "staff"
  cooperativeName: string
}): AssistantApi {
  const registryRole = role === "member" ? "member" : "finance_officer"
  const conversations = new Map<string, Conversation>()
  const proposals = new Map<string, AssistantProposal>()
  const replies = new Map<string, AssistantTurnOutput>()
  const confirmations = new Map<string, AssistantActionResult>()

  const conversation = (conversationId: string) => {
    const found = conversations.get(conversationId)
    if (!found || found.archived) throw new Error("Conversation not found")
    return found
  }

  const newProposal = (fields: AssistantProposalFields): AssistantProposal => {
    const missing = proposalMissing(fields)
    const proposal: AssistantProposal = {
      id: id("pr"),
      capabilityId: capabilityFor[fields.kind],
      revision: 1,
      status: missing.length ? "collecting" : "review",
      fields,
      missing,
      effect: effects[fields.kind],
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      confirmInApp: fields.kind === "record-payment",
    }
    proposals.set(proposal.id, proposal)
    return proposal
  }

  function reply(
    text: string,
    choice: { proposalId: string | null; value: string } | undefined
  ): { parts: AssistantPart[]; proposals: AssistantProposal[] } {
    const answer = (value: AssistantAnswer, lead: string) => ({
      parts: [
        { type: "text" as const, text: lead },
        { type: "answer" as const, answer: value },
      ],
      proposals: [],
    })
    const propose = (fields: AssistantProposalFields, lead: string) => {
      const proposal = newProposal(fields)
      return {
        parts: [
          { type: "text" as const, text: lead },
          {
            type: "proposal" as const,
            proposalId: proposal.id,
            revision: proposal.revision,
          },
        ],
        proposals: [proposal],
      }
    }

    if (choice && !choice.proposalId) {
      const purpose = paymentRequestOptions.find(
        (option) => option.value === choice.value
      )
      if (purpose)
        return propose(
          {
            kind: "payment-request",
            purpose: purpose.value,
            amount: null,
            note: null,
          },
          `Okay: ${purpose.label.toLowerCase()}. Add the amount, then review the request.`
        )
    }

    const intent = routeIntent(text, role)
    const amount = intent.candidates.amount
    switch (intent.capabilityId) {
      case "M01":
        return answer(
          fixtureAnswers.financingStatus,
          "Here is your financing, as recorded by the cooperative."
        )
      case "M02":
        return answer(
          fixtureAnswers.investments,
          "Here is your position, kept separate by type."
        )
      case "M03":
        return answer(fixtureAnswers.receipts, "These are your latest receipts.")
      case "M04":
        return propose(
          {
            ...fixtureProposal.fields,
            ...(amount ? { amount: money(amount) } : {}),
          } as AssistantProposalFields,
          "I prepared this receipt from what you told me. Check it before you confirm."
        )
      case "M05":
        return {
          parts: [
            {
              type: "answer",
              answer: {
                kind: "clarify",
                question: "What is the payment for?",
                options: paymentRequestOptions.map((option) => ({
                  label: option.label,
                  value: option.value,
                })),
              },
            },
          ],
          proposals: [],
        }
      case "S01":
        return answer(
          {
            ...fixtureAnswers.memberMatches,
            query: intent.candidates.memberQuery ?? "Aisha",
          },
          "Pick the member you mean. I never choose a close match for you."
        )
      case "S02": {
        const member = fixtureAnswers.memberMatches.items[0]!
        return answer(
          {
            kind: "member-history",
            asOf: now(),
            member: {
              memberId: member.memberId,
              memberNumber: member.memberNumber,
              name: member.name,
            },
            regularSavings: money(184000),
            specialSavings: money(45000),
            shareCapital: money(50000),
            outstandingFinancing: money(62500),
            recentReceipts: fixtureAnswers.receipts.items,
            link: member.link,
          },
          `History for ${member.name}.`
        )
      }
      case "S03":
        return answer(
          fixtureAnswers.receiptQueue,
          "These receipts are waiting for review."
        )
      case "S04": {
        const member = fixtureAnswers.memberMatches.items[0]!
        return propose(
          {
            kind: "record-payment",
            member: {
              memberId: member.memberId,
              memberNumber: member.memberNumber,
              name: member.name,
            },
            amount: amount ? money(amount) : null,
            paidOn: now().slice(0, 10),
            period: intent.candidates.period ?? now().slice(0, 7),
            channel: "Bank transfer",
            paymentReference: null,
            allocations: amount
              ? [
                  {
                    targetId: "regular_savings",
                    label: "Regular savings",
                    amount: money(amount),
                  },
                ]
              : [],
          },
          amount
            ? `Recording ${formatMoney(money(amount))} for ${member.name}. Check it before you confirm.`
            : `Recording a payment for ${member.name}. Add the amount, then review.`
        )
      }
      case "X01":
        return {
          parts: [
            { type: "text", text: "Here is what I can help with." },
            {
              type: "answer",
              answer: {
                kind: "help",
                items: assistantHelpItems(registryRole, "web"),
              },
            },
          ],
          proposals: [],
        }
      case "X02":
        return {
          parts: [
            {
              type: "answer",
              answer: {
                kind: "notice",
                tone: "info",
                message:
                  "A member of staff can help. Open a support request and they will reply there.",
                link: { label: "Open support", href: "/support" },
              },
            },
          ],
          proposals: [],
        }
      default:
        return {
          parts: [
            {
              type: "answer",
              answer: {
                kind: "notice",
                tone: "unsupported",
                message:
                  "I can't help with that yet. Ask what I can help with to see the list.",
                link: null,
              },
            },
          ],
          proposals: [],
        }
    }
  }

  return {
    async bootstrap() {
      await wait(150)
      return {
        role,
        cooperativeName,
        suggestions: assistantSuggestions(registryRole, "web"),
        help: assistantHelpItems(registryRole, "web"),
      }
    },
    async listConversations() {
      await wait(150)
      const items: AssistantConversationSummary[] = [...conversations.values()]
        .filter((row) => !row.archived && row.messages.length)
        .map((row) => row.conversation)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      return { items, nextCursor: null }
    },
    async createConversation() {
      await wait(100)
      const conversationId = id("conv")
      conversations.set(conversationId, {
        archived: false,
        conversation: {
          id: conversationId,
          title: "New chat",
          channel: "web",
          updatedAt: now(),
          lastMessagePreview: null,
        },
        messages: [],
        proposals: [],
      })
      return { id: conversationId }
    },
    async getConversation(conversationId) {
      await wait(150)
      const row = conversation(conversationId)
      return {
        conversation: row.conversation,
        messages: row.messages,
        proposals: row.proposals.map((p) => proposals.get(p.id) ?? p),
      }
    },
    async archiveConversation(conversationId) {
      await wait(100)
      conversation(conversationId).archived = true
      return { ok: true }
    },
    async send(input) {
      const saved = replies.get(input.requestId)
      if (saved) return saved
      await wait(700)
      const row = conversation(input.conversationId)
      const userMessage: AssistantMessage = {
        id: id("msg"),
        role: "user",
        parts: [{ type: "text", text: input.text }],
        createdAt: now(),
      }
      const result = reply(input.text, input.choice)
      const replyMessage: AssistantMessage = {
        id: id("msg"),
        role: "assistant",
        parts: result.parts,
        createdAt: now(),
      }
      row.messages = [...row.messages, userMessage, replyMessage]
      row.proposals = [...row.proposals, ...result.proposals]
      row.conversation = {
        ...row.conversation,
        title:
          row.conversation.title === "New chat"
            ? input.text.slice(0, 60)
            : row.conversation.title,
        updatedAt: now(),
        lastMessagePreview: summarise(result.parts) ?? input.text.slice(0, 120),
      }
      const output: AssistantTurnOutput = {
        conversationId: input.conversationId,
        userMessage,
        reply: replyMessage,
        proposals: result.proposals,
      }
      replies.set(input.requestId, output)
      return output
    },
    async getProposal(proposalId) {
      await wait(100)
      const proposal = proposals.get(proposalId)
      if (!proposal) throw new Error("Proposal not found")
      return proposal
    },
    async editProposal(input) {
      await wait(400)
      const current = proposals.get(input.proposalId)
      if (!current) throw new Error("Proposal not found")
      if (current.revision !== input.revision)
        throw new Error("This draft changed. Review the latest version.")
      if (current.status !== "review" && current.status !== "collecting")
        throw new Error("This draft can no longer be edited.")
      const missing = proposalMissing(input.fields)
      const next: AssistantProposal = {
        ...current,
        fields: input.fields,
        revision: current.revision + 1,
        missing,
        status: missing.length ? "collecting" : "review",
      }
      proposals.set(next.id, next)
      return next
    },
    async confirmProposal(input) {
      const saved = confirmations.get(input.confirmationKey)
      if (saved) return saved
      await wait(700)
      const current = proposals.get(input.proposalId)
      if (!current) throw new Error("Proposal not found")
      if (current.revision !== input.revision || current.status !== "review")
        return {
          proposalId: current.id,
          revision: input.revision,
          outcome: "not_saved",
          reference: null,
          message: "This draft changed before you confirmed. Nothing was saved.",
          link: null,
        }
      proposals.set(current.id, { ...current, status: "confirmed" })
      const reference =
        current.fields.kind === "record-payment"
          ? `PAY-${String(200 + counter)}`
          : current.fields.kind === "payment-request"
            ? `REQ-${String(300 + counter)}`
            : `RCPT-${String(110 + counter)}`
      const result: AssistantActionResult = {
        proposalId: current.id,
        revision: current.revision,
        outcome: "saved",
        reference,
        message:
          current.fields.kind === "record-payment"
            ? `Payment ${reference} is posted.`
            : current.fields.kind === "payment-request"
              ? `Request ${reference} is sent to the cooperative.`
              : `Receipt ${reference} is saved for review.`,
        link:
          current.fields.kind === "record-payment"
            ? { label: "Open contributions", href: "/contributions" }
            : current.fields.kind === "payment-request"
              ? { label: "Open support", href: "/support" }
              : { label: "Open receipt", href: "/payment-receipts" },
      }
      confirmations.set(input.confirmationKey, result)
      for (const row of conversations.values()) {
        if (!row.proposals.some((p) => p.id === current.id)) continue
        row.messages = [
          ...row.messages,
          {
            id: id("msg"),
            role: "assistant",
            parts: [{ type: "result", result }],
            createdAt: now(),
          },
        ]
      }
      return result
    },
    async cancelProposal(proposalId) {
      await wait(300)
      const current = proposals.get(proposalId)
      if (!current) throw new Error("Proposal not found")
      const next: AssistantProposal = { ...current, status: "cancelled" }
      proposals.set(proposalId, next)
      return next
    },
  }
}
