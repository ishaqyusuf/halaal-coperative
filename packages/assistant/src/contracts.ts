import { z } from "zod"

/**
 * Typed assistant DTOs shared by the API, website, native app and messaging
 * renderers. Providers and clients render these; they never own finance or
 * chat behavior. Money is a decimal string in naira so `Decimal` columns are
 * never rounded through floating point.
 */

export const moneySchema = z.object({
  amount: z.string().regex(/^-?\d+(\.\d{1,2})?$/),
  currency: z.literal("NGN"),
})
export type AssistantMoney = z.infer<typeof moneySchema>

/** App-relative path. Channels turn it into a protected continuation link. */
export const linkSchema = z.object({
  label: z.string().min(1).max(80),
  href: z.string().startsWith("/").max(300),
})
export type AssistantLink = z.infer<typeof linkSchema>

const asOf = z.string().datetime()

export const financingStatusAnswerSchema = z.object({
  kind: z.literal("financing-status"),
  asOf,
  requests: z.array(
    z.object({
      id: z.string(),
      reference: z.string(),
      label: z.string(),
      amount: moneySchema,
      /** Request/cycle/guarantor stage in plain words, e.g. "Waiting for guarantor". */
      stage: z.string(),
    })
  ),
  active: z.array(
    z.object({
      id: z.string(),
      reference: z.string(),
      label: z.string(),
      principal: moneySchema,
      remaining: moneySchema,
      /** "approved" is not "disbursed"; never imply a guarantee. */
      status: z.enum(["approved", "disbursed", "repaying", "overdue"]),
      nextDue: z
        .object({ date: z.string(), amount: moneySchema })
        .nullable(),
    })
  ),
  link: linkSchema,
})

export const investmentsAnswerSchema = z.object({
  kind: z.literal("investments"),
  asOf,
  /** Statement totals are the source; no invented sum or yield. */
  regularSavings: moneySchema,
  specialSavings: moneySchema,
  shareCapital: moneySchema,
  shareUnits: z.number().int().nonnegative().nullable(),
  publishedProfit: moneySchema,
  basis: z.string(),
  link: linkSchema,
})

export const receiptStatusSchema = z.enum([
  "submitted",
  "approved",
  "rejected",
  "correction",
])

export const receiptsAnswerSchema = z.object({
  kind: z.literal("receipts"),
  asOf,
  items: z.array(
    z.object({
      id: z.string(),
      reference: z.string(),
      amount: moneySchema,
      submittedAt: z.string(),
      status: receiptStatusSchema,
      reason: z.string().nullable(),
      link: linkSchema,
    })
  ),
  nextCursor: z.string().nullable(),
  link: linkSchema,
})

export const memberMatchesAnswerSchema = z.object({
  kind: z.literal("member-matches"),
  query: z.string(),
  /** Staff choose; fuzzy matches are never auto-selected. */
  items: z.array(
    z.object({
      memberId: z.string(),
      memberNumber: z.string(),
      name: z.string(),
      hint: z.string().nullable(),
      link: linkSchema,
    })
  ),
  truncated: z.boolean(),
})

export const memberHistoryAnswerSchema = z.object({
  kind: z.literal("member-history"),
  asOf,
  member: z.object({
    memberId: z.string(),
    memberNumber: z.string(),
    name: z.string(),
  }),
  regularSavings: moneySchema,
  specialSavings: moneySchema,
  shareCapital: moneySchema,
  outstandingFinancing: moneySchema,
  recentReceipts: receiptsAnswerSchema.shape.items,
  link: linkSchema,
})

export const receiptQueueAnswerSchema = z.object({
  kind: z.literal("receipt-queue"),
  asOf,
  pendingCount: z.number().int().nonnegative(),
  correctionCount: z.number().int().nonnegative(),
  items: z.array(
    z.object({
      id: z.string(),
      reference: z.string(),
      memberName: z.string(),
      memberNumber: z.string(),
      amount: moneySchema,
      submittedAt: z.string(),
      status: receiptStatusSchema,
      link: linkSchema,
    })
  ),
  nextCursor: z.string().nullable(),
  link: linkSchema,
})

export const helpAnswerSchema = z.object({
  kind: z.literal("help"),
  items: z.array(
    z.object({
      capabilityId: z.string(),
      title: z.string(),
      suggestion: z.string(),
    })
  ),
})

export const clarifyAnswerSchema = z.object({
  kind: z.literal("clarify"),
  question: z.string(),
  options: z.array(z.object({ label: z.string(), value: z.string() })).max(6),
})

/**
 * Explicit non-answers. `empty` = real source, nothing there; `unavailable` =
 * source could not be read; `denied` = no authority; `unsupported` = no
 * capability for this request.
 */
export const noticeAnswerSchema = z.object({
  kind: z.literal("notice"),
  tone: z.enum(["empty", "unavailable", "denied", "unsupported", "info"]),
  message: z.string(),
  link: linkSchema.nullable(),
})

export const assistantAnswerSchema = z.discriminatedUnion("kind", [
  financingStatusAnswerSchema,
  investmentsAnswerSchema,
  receiptsAnswerSchema,
  memberMatchesAnswerSchema,
  memberHistoryAnswerSchema,
  receiptQueueAnswerSchema,
  helpAnswerSchema,
  clarifyAnswerSchema,
  noticeAnswerSchema,
])
export type AssistantAnswer = z.infer<typeof assistantAnswerSchema>
export type AssistantAnswerKind = AssistantAnswer["kind"]

// ---------------------------------------------------------------------------
// Proposals: collect → review → confirm exact revision → saved result
// ---------------------------------------------------------------------------

export const proposalStatusSchema = z.enum([
  "collecting",
  "review",
  "confirmed",
  "cancelled",
  "expired",
  "refused",
])
export type AssistantProposalStatus = z.infer<typeof proposalStatusSchema>

export const receiptSubmissionFieldsSchema = z.object({
  kind: z.literal("receipt-submission"),
  amount: moneySchema.nullable(),
  paidOn: z.string().nullable(),
  paymentReference: z.string().max(120).nullable(),
  /** Server-selected allocation across the member's eligible obligations. */
  allocations: z.array(
    z.object({
      targetId: z.string(),
      label: z.string(),
      amount: moneySchema,
    })
  ),
  /** Private evidence upload id, when the private upload path is enabled. */
  evidenceUploadId: z.string().nullable(),
})

export const paymentRequestFieldsSchema = z.object({
  kind: z.literal("payment-request"),
  /** The member's explicit choice; nothing is routed before it is set. */
  purpose: z
    .enum(["financing", "special_savings_refund", "money_owed", "pay_in"])
    .nullable(),
  amount: moneySchema.nullable(),
  note: z.string().max(500).nullable(),
})

export const recordPaymentFieldsSchema = z.object({
  kind: z.literal("record-payment"),
  member: z
    .object({ memberId: z.string(), memberNumber: z.string(), name: z.string() })
    .nullable(),
  amount: moneySchema.nullable(),
  paidOn: z.string().nullable(),
  /** Collection month, YYYY-MM. */
  period: z.string().regex(/^\d{4}-\d{2}$/).nullable(),
  channel: z.string().nullable(),
  paymentReference: z.string().max(120).nullable(),
  allocations: receiptSubmissionFieldsSchema.shape.allocations,
})

export const proposalFieldsSchema = z.discriminatedUnion("kind", [
  receiptSubmissionFieldsSchema,
  paymentRequestFieldsSchema,
  recordPaymentFieldsSchema,
])
export type AssistantProposalFields = z.infer<typeof proposalFieldsSchema>
export type AssistantProposalKind = AssistantProposalFields["kind"]

export const assistantProposalSchema = z.object({
  id: z.string(),
  capabilityId: z.string(),
  revision: z.number().int().positive(),
  status: proposalStatusSchema,
  fields: proposalFieldsSchema,
  /** Plain-language names of fields still needed before review. */
  missing: z.array(z.string()),
  /** What confirming does, e.g. "Saves a receipt for review. No money is posted." */
  effect: z.string(),
  expiresAt: z.string().datetime(),
  /** Some confirmations (staff posting) are app-only. */
  confirmInApp: z.boolean(),
})
export type AssistantProposal = z.infer<typeof assistantProposalSchema>

export const assistantActionResultSchema = z.object({
  proposalId: z.string(),
  revision: z.number().int().positive(),
  outcome: z.enum(["saved", "not_saved", "checking"]),
  /** Canonical saved record reference, e.g. receipt or payment reference. */
  reference: z.string().nullable(),
  message: z.string(),
  link: linkSchema.nullable(),
})
export type AssistantActionResult = z.infer<typeof assistantActionResultSchema>

// ---------------------------------------------------------------------------
// Messages and turns
// ---------------------------------------------------------------------------

export const assistantPartSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string().max(8000) }),
  z.object({ type: z.literal("answer"), answer: assistantAnswerSchema }),
  /** Reference only; the live proposal is re-read from the server. */
  z.object({
    type: z.literal("proposal"),
    proposalId: z.string(),
    revision: z.number().int().positive(),
  }),
  z.object({ type: z.literal("result"), result: assistantActionResultSchema }),
])
export type AssistantPart = z.infer<typeof assistantPartSchema>

export const assistantMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  parts: z.array(assistantPartSchema),
  createdAt: z.string().datetime(),
})
export type AssistantMessage = z.infer<typeof assistantMessageSchema>

export const assistantTurnInputSchema = z
  .object({
    conversationId: z.string().min(1).max(128),
    /** Client idempotency key; a replay returns the saved reply. */
    requestId: z.string().min(8).max(120),
    text: z.string().trim().min(1).max(4000),
    /** A tapped option from a clarify card or proposal edit. */
    choice: z
      .object({
        proposalId: z.string().max(128).nullable(),
        value: z.string().max(200),
      })
      .strict()
      .optional(),
  })
  .strict()
export type AssistantTurnInput = z.infer<typeof assistantTurnInputSchema>

export const assistantTurnOutputSchema = z.object({
  conversationId: z.string(),
  userMessage: assistantMessageSchema,
  reply: assistantMessageSchema,
  /** Live proposals referenced by the reply, freshly read. */
  proposals: z.array(assistantProposalSchema),
})
export type AssistantTurnOutput = z.infer<typeof assistantTurnOutputSchema>

export const proposalConfirmInputSchema = z
  .object({
    proposalId: z.string().min(1).max(128),
    revision: z.number().int().positive(),
    /** Idempotency key for the canonical write. */
    confirmationKey: z.string().min(8).max(120),
  })
  .strict()
export type ProposalConfirmInput = z.infer<typeof proposalConfirmInputSchema>

export const proposalEditInputSchema = z
  .object({
    proposalId: z.string().min(1).max(128),
    revision: z.number().int().positive(),
    fields: proposalFieldsSchema,
  })
  .strict()
export type ProposalEditInput = z.infer<typeof proposalEditInputSchema>

export type AssistantConversationSummary = {
  id: string
  title: string
  channel: "web" | "native" | "whatsapp" | "telegram"
  updatedAt: string
  lastMessagePreview: string | null
}
