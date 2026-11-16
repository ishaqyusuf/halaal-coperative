import {
  type AssistantAnswer,
  type AssistantMessage,
  type AssistantPart,
  type AssistantProposal,
  type AssistantStreamStage,
  type AssistantTurnInput,
  type AssistantTurnOutput,
  type CapabilityId,
  type IntentCandidates,
  assistantPartSchema,
  assistantTurnInputSchema,
  capabilityAllowed,
  extractAmount,
  extractPaymentReference,
  money,
  proposalFieldsSchema,
  routeIntent,
} from "@halaalvest/assistant"
import {
  type AssistantStoredMessage,
  beginAssistantTurn,
  completeAssistantTurn,
  listAssistantHistory,
  listConversationProposals,
  readAssistantProposal,
} from "@halaalvest/db"
import { interpretWithModel, resolveAssistantModel } from "./model"
import type { AssistantPrincipal } from "./principal"
import {
  choosePaymentRequestPurpose,
  chooseRecordPaymentMember,
  editProposal,
  type ProposalStart,
  startPaymentRequest,
  startReceiptSubmission,
  startRecordPayment,
  toProposalDto,
} from "./proposals"
import {
  denied,
  readFinancingStatus,
  readHelp,
  readInvestments,
  readMemberHistory,
  readMemberMatches,
  readOwnReceipts,
  readReceiptQueue,
} from "./reads"

/**
 * One authorized turn, independent of HTTP, WhatsApp or Telegram delivery
 * (EwaTrade `createGeneralAssistantTurn`). The principal carries the only
 * authority; reads and proposals recheck it live. Replays of `requestId`
 * return the saved reply without rerunning anything.
 */

export class AssistantTurnError extends Error {
  constructor(
    readonly code: "BAD_REQUEST" | "NOT_FOUND" | "CONFLICT",
    message: string
  ) {
    super(message)
    this.name = "AssistantTurnError"
  }
}

type Outcome = {
  capabilityId: CapabilityId | null
  text: string
  answer?: AssistantAnswer
  proposal?: AssistantProposal
}

const scopeOf = (principal: AssistantPrincipal) => ({
  tenantId: principal.tenantId,
  userId: principal.userId,
  membershipId: principal.membershipId,
})

function toMessage(row: AssistantStoredMessage): AssistantMessage {
  const parts = Array.isArray(row.parts) ? row.parts : []
  return {
    id: row.id,
    role: row.role,
    parts: parts.flatMap((part) => {
      const parsed = assistantPartSchema.safeParse(part)
      return parsed.success ? [parsed.data] : []
    }),
    createdAt: row.createdAt.toISOString(),
  }
}

async function liveProposals(principal: AssistantPrincipal, parts: AssistantPart[]) {
  const ids = parts.flatMap((part) => (part.type === "proposal" ? [part.proposalId] : []))
  const rows = await Promise.all(
    ids.map((proposalId) => readAssistantProposal({ ...scopeOf(principal), proposalId }))
  )
  return rows.flatMap((row) => (row ? [toProposalDto(row)] : []))
}

const fromStart = (capabilityId: CapabilityId, start: ProposalStart): Outcome =>
  start.kind === "proposal"
    ? { capabilityId, text: start.text, proposal: start.proposal }
    : { capabilityId, text: start.text, answer: start.answer }

async function handleChoice(
  principal: AssistantPrincipal,
  value: string
): Promise<Outcome | null> {
  const [kind, proposalId, choice] = value.split(":")
  if (!proposalId || !choice) return null
  if (kind === "purpose")
    return fromStart("M05", await choosePaymentRequestPurpose(principal, proposalId, choice))
  if (kind === "member")
    return fromStart("S04", await chooseRecordPaymentMember(principal, proposalId, choice))
  return null
}

/** A bare amount or a stated reference fills the newest collecting draft in this chat. */
async function continueDraft(
  principal: AssistantPrincipal,
  conversationId: string,
  text: string
): Promise<Outcome | null> {
  const amount = extractAmount(text) ?? (/^\s*\d+(\.\d{1,2})?\s*$/.test(text) ? text.trim() : null)
  const paymentReference = extractPaymentReference(text)
  if (!amount && !paymentReference) return null
  const open = (await listConversationProposals({ ...scopeOf(principal), conversationId }))
    .filter((row) => row.status === "collecting")
    .at(-1)
  if (!open) return null
  const fields = proposalFieldsSchema.parse(open.fields)
  if (fields.kind === "payment-request") return null
  const proposal = await editProposal(principal, {
    proposalId: open.id,
    revision: open.revision,
    fields: {
      ...fields,
      ...(amount ? { amount: money(amount) } : {}),
      ...(paymentReference ? { paymentReference } : {}),
    },
  })
  return {
    capabilityId: open.capabilityId as CapabilityId,
    proposal,
    text: proposal.missing.length
      ? `I still need: ${proposal.missing.join(", ")}.`
      : "Here's the updated review. Confirm when it looks right.",
  }
}

async function runCapability(
  principal: AssistantPrincipal,
  conversationId: string,
  capabilityId: CapabilityId,
  candidates: IntentCandidates
): Promise<Outcome> {
  const query = candidates.memberNumber ?? candidates.memberQuery
  const answer = (value: AssistantAnswer, text: string): Outcome => ({ capabilityId, text, answer: value })
  switch (capabilityId) {
    case "M01":
      return answer(await readFinancingStatus(principal), "Here's your financing.")
    case "M02":
      return answer(await readInvestments(principal), "Here's your position, kept separate by type.")
    case "M03":
      return answer(await readOwnReceipts(principal), "Here are your latest receipts.")
    case "M04":
      return fromStart(capabilityId, await startReceiptSubmission(principal, conversationId, candidates))
    case "M05":
      return fromStart(capabilityId, await startPaymentRequest(principal, conversationId, candidates))
    case "S01":
      return answer(await readMemberMatches(principal, query), "Choose the right member.")
    case "S02":
      return answer(await readMemberHistory(principal, query), "Here's the member's position.")
    case "S03":
      return answer(await readReceiptQueue(principal), "Here's the receipt queue.")
    case "S04":
      return fromStart(capabilityId, await startRecordPayment(principal, conversationId, candidates))
    case "X01":
      return answer(readHelp(principal), "Here's what I can help with.")
    case "X02":
      return answer(
        {
          kind: "notice",
          tone: "info",
          message: "A person on your cooperative's team can help. Open a support case and they'll reply there.",
          link: { label: "Open support", href: "/support" },
        },
        "I'll connect you with your cooperative's team."
      )
  }
}

export type TurnDependencies = {
  resolveModel: typeof resolveAssistantModel
  interpret: typeof interpretWithModel
  now: () => Date
}

const defaultTurnDependencies: TurnDependencies = {
  resolveModel: resolveAssistantModel,
  interpret: interpretWithModel,
  now: () => new Date(),
}

/** Progress for streamed clients. Best effort: a failing listener never changes the turn. */
export type TurnHooks = { onStage?: (stage: AssistantStreamStage) => void }

function emit(hooks: TurnHooks | undefined, stage: AssistantStreamStage) {
  try {
    hooks?.onStage?.(stage)
  } catch {
    // Progress is cosmetic; the saved reply is the source of truth.
  }
}

const draftCapabilities = new Set<CapabilityId>(["M04", "M05", "S04"])

/** Model candidates only fill gaps; what the fixed rules read wins. */
function fillMissing(base: IntentCandidates, extra: Partial<IntentCandidates>): IntentCandidates {
  const merged = { ...base }
  for (const key of Object.keys(extra) as (keyof IntentCandidates)[]) {
    if ((merged[key] === null || merged[key] === undefined) && extra[key]) (merged as Record<string, unknown>)[key] = extra[key]
  }
  return merged
}

export async function runAssistantTurn(
  principal: AssistantPrincipal,
  rawInput: AssistantTurnInput,
  deps: TurnDependencies = defaultTurnDependencies,
  hooks?: TurnHooks
): Promise<AssistantTurnOutput> {
  const parsed = assistantTurnInputSchema.safeParse(rawInput)
  if (!parsed.success) throw new AssistantTurnError("BAD_REQUEST", "Invalid assistant message.")
  const input = parsed.data
  const startedAt = Date.now()
  const begun = await beginAssistantTurn({
    ...scopeOf(principal),
    conversationId: input.conversationId,
    requestId: input.requestId,
    userParts: [{ type: "text", text: input.text }],
    title: null,
    // Platform billing meters staff messages on the website only.
    meterPlatformUsage: principal.channel === "web" && principal.role !== "member",
  })
  if (begun.kind === "replay") {
    if (!begun.reply)
      throw new AssistantTurnError("CONFLICT", "This message is still being answered. Refresh in a moment.")
    const reply = toMessage(begun.reply)
    return {
      conversationId: input.conversationId,
      userMessage: toMessage(begun.userMessage),
      reply,
      proposals: await liveProposals(principal, reply.parts),
    }
  }

  emit(hooks, "received")
  const model = deps.resolveModel()
  let outcome: Outcome
  let errorCode: string | null = null
  try {
    outcome = await decide(principal, input, model, deps, hooks)
  } catch (error) {
    errorCode = error instanceof Error ? error.name.slice(0, 60) : "UNKNOWN"
    console.error("[assistant] turn failed", { code: errorCode, channel: principal.channel })
    outcome = {
      capabilityId: null,
      text: "Something went wrong reading that. Nothing was changed. Try again.",
      answer: { kind: "notice", tone: "unavailable", message: "The assistant couldn't finish that request.", link: null },
    }
  }

  const replyParts: AssistantPart[] = [
    { type: "text", text: outcome.text },
    ...(outcome.answer ? [{ type: "answer" as const, answer: outcome.answer }] : []),
    ...(outcome.proposal
      ? [{ type: "proposal" as const, proposalId: outcome.proposal.id, revision: outcome.proposal.revision }]
      : []),
  ]
  const reply = await completeAssistantTurn({
    turnId: begun.turnId,
    tenantId: principal.tenantId,
    conversationId: input.conversationId,
    status: errorCode ? "failed" : "completed",
    replyParts,
    capabilityId: outcome.capabilityId,
    provider: model?.provider ?? "deterministic",
    model: model?.modelId ?? null,
    errorCode,
    durationMs: Date.now() - startedAt,
  })
  return {
    conversationId: input.conversationId,
    userMessage: toMessage(begun.userMessage),
    reply: toMessage(reply),
    proposals: outcome.proposal ? [outcome.proposal] : [],
  }
}

async function decide(
  principal: AssistantPrincipal,
  input: AssistantTurnInput,
  model: ReturnType<typeof resolveAssistantModel>,
  deps: TurnDependencies,
  hooks?: TurnHooks
): Promise<Outcome> {
  if (input.choice) {
    const chosen = await handleChoice(principal, input.choice.value)
    if (chosen) return chosen
  }
  const role = principal.role === "member" ? "member" : "staff"
  let intent = routeIntent(input.text, role, deps.now())
  if (!intent.capabilityId) {
    const continued = await continueDraft(principal, input.conversationId, input.text)
    if (continued) return continued
  }
  // A draft the fixed rules recognized but whose amount they couldn't read
  // ("five thousand naira" is handled; odder wording falls to the model).
  const needsAmount =
    intent.capabilityId !== null && draftCapabilities.has(intent.capabilityId) &&
    intent.capabilityId !== "M05" && !intent.candidates.amount
  if ((!intent.capabilityId || needsAmount) && model) {
    const history = (await listAssistantHistory({ conversationId: input.conversationId, limit: 10 }))
      .flatMap((row) => {
        const parts = (Array.isArray(row.parts) ? row.parts : []) as { type?: string; text?: string }[]
        const text = parts.find((part) => part?.type === "text" && typeof part.text === "string")
        return text ? [{ role: row.role, text: text.text as string }] : []
      })
    emit(hooks, "thinking")
    const picked = await deps.interpret({ model, principal, text: input.text, history }).catch(() => null)
    if (picked && !intent.capabilityId)
      intent = { capabilityId: picked.capabilityId, candidates: fillMissing(intent.candidates, picked.candidates) }
    else if (picked) intent = { ...intent, candidates: fillMissing(intent.candidates, picked.candidates) }
  }
  if (!intent.capabilityId)
    return {
      capabilityId: null,
      text: "I can't help with that yet. Here's what I can do.",
      answer: readHelp(principal),
    }
  // Messaging adapters only call this when their channel flag is on.
  if (!capabilityAllowed(intent.capabilityId, principal.role, principal.channel, { messagingChannelEnabled: true }))
    return { capabilityId: intent.capabilityId, text: "That isn't available here.", answer: denied("That isn't available on this channel or for your role.") }
  emit(hooks, draftCapabilities.has(intent.capabilityId) ? "drafting" : "reading")
  return runCapability(principal, input.conversationId, intent.capabilityId, intent.candidates)
}
