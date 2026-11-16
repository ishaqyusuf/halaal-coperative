import { createDeepSeek } from "@ai-sdk/deepseek"
import { createOpenAI } from "@ai-sdk/openai"
import {
  type CapabilityId,
  type IntentCandidates,
  PAYMENT_REFERENCE_MAX,
  assistantInstructions,
  capabilitiesFor,
} from "@halaalvest/assistant"
import { type LanguageModel, generateText, stepCountIs, tool } from "ai"
import { z } from "zod"
import type { AssistantPrincipal } from "./principal"

/**
 * Optional model interpretation, ported from EwaTrade's model resolution.
 * Client input never selects provider, model, key or endpoint. With no key
 * configured (or ASSISTANT_REHEARSAL_MODE=true outside production) the
 * assistant runs on deterministic routing only.
 */

type Environment = Readonly<Record<string, string | undefined>>

export type ResolvedAssistantModel = {
  model: LanguageModel
  provider: string
  modelId: string
}

const MODELS = {
  DEEPSEEK: ["deepseek-chat", "deepseek-flash", "deepseek-v4-pro"],
  OPENAI: ["gpt-4.1-mini", "gpt-4.1"],
} as const

export function resolveAssistantModel(
  environment: Environment = process.env
): ResolvedAssistantModel | null {
  if (environment.ASSISTANT_REHEARSAL_MODE === "true" && environment.APP_ENV !== "production")
    return null
  const provider = (environment.ASSISTANT_AI_PROVIDER?.trim().toUpperCase() || "DEEPSEEK") as
    | "DEEPSEEK"
    | "OPENAI"
  if (provider !== "DEEPSEEK" && provider !== "OPENAI") return null
  const modelId = environment.ASSISTANT_AI_MODEL?.trim() || MODELS[provider][0]
  if (!(MODELS[provider] as readonly string[]).includes(modelId)) return null
  const apiKey =
    provider === "DEEPSEEK"
      ? environment.ASSISTANT_DEEPSEEK_API_KEY?.trim() || environment.DEEPSEEK_API?.trim()
      : environment.ASSISTANT_OPENAI_API_KEY?.trim() || environment.OPENAI_API_KEY?.trim()
  if (!apiKey) return null
  return provider === "DEEPSEEK"
    ? { model: createDeepSeek({ apiKey })(modelId), provider: "deepseek", modelId }
    : { model: createOpenAI({ apiKey })(modelId), provider: "openai", modelId }
}

const candidateSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
  memberQuery: z.string().max(80).nullable().optional(),
  period: z.string().regex(/^\d{4}-\d{2}$/).nullable().optional(),
  /** Payment date YYYY-MM-DD, only when the person said when they paid. */
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  /** Bank/teller/transaction reference exactly as the person typed it, only when they gave one. */
  paymentReference: z.string().max(PAYMENT_REFERENCE_MAX).nullable().optional(),
})

/** Keep a model-read reference only when it appears verbatim in the message, so none is invented. */
function statedReference(value: string | null | undefined, text: string) {
  const reference = value?.trim()
  if (!reference || !/\d/.test(reference)) return null
  return text.toLowerCase().includes(reference.toLowerCase()) ? reference.slice(0, PAYMENT_REFERENCE_MAX) : null
}

/**
 * The model only picks one allowed capability and candidate fields. Typed
 * server code then selects records, money and dates and enforces authority.
 */
export async function interpretWithModel(input: {
  model: ResolvedAssistantModel
  principal: AssistantPrincipal
  text: string
  history: { role: "user" | "assistant"; text: string }[]
  signal?: AbortSignal
}): Promise<{ capabilityId: CapabilityId; candidates: Partial<IntentCandidates> } | null> {
  const allowed = capabilitiesFor(input.principal.role, input.principal.channel, {
    messagingChannelEnabled: true,
  })
  let picked: { capabilityId: CapabilityId; candidates: Partial<IntentCandidates> } | null = null
  const tools = Object.fromEntries(
    allowed.map((capability) => [
      `use_${capability.id}`,
      tool({
        description: `${capability.title}. Examples: ${capability.intentExamples.join(" | ")}`,
        inputSchema: candidateSchema,
        execute: async (args) => {
          picked = {
            capabilityId: capability.id,
            candidates: {
              amount: args.amount ?? null,
              memberQuery: args.memberQuery ?? null,
              period: args.period ?? null,
              paidOn: args.paidOn ?? null,
              paymentReference: statedReference(args.paymentReference, input.text),
            },
          }
          return { ok: true }
        },
      }),
    ])
  )
  await generateText({
    model: input.model.model,
    system: assistantInstructions({
      cooperativeName: input.principal.tenantName,
      role: input.principal.role === "member" ? "member" : "staff",
      today: new Date().toISOString().slice(0, 10),
      channel: input.principal.channel,
    }),
    messages: [
      ...input.history.slice(-8).map((message) => ({
        role: message.role,
        content: message.text,
      })),
      { role: "user" as const, content: input.text },
    ],
    tools,
    toolChoice: "auto",
    stopWhen: stepCountIs(1),
    abortSignal: input.signal ?? AbortSignal.timeout(20_000),
  })
  return picked
}
