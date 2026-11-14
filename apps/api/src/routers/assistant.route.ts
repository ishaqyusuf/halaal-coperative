import {
  assistantHelpItems,
  assistantSuggestions,
  proposalConfirmInputSchema,
  proposalEditInputSchema,
  assistantTurnInputSchema,
  type AssistantRole,
} from "@halaalvest/assistant"
import {
  archiveAssistantConversation,
  createAssistantConversation,
  listAssistantConversations,
  listConversationProposals,
  readAssistantConversation,
  readAssistantProposal,
} from "@halaalvest/db"
import { AppError } from "@halaalvest/errors"
import { z } from "zod"

import type { AssistantPrincipal } from "../assistant/principal"
import {
  cancelProposal,
  confirmProposal,
  editProposal,
  ProposalError,
  toProposalDto,
} from "../assistant/proposals"
import { AssistantTurnError, runAssistantTurn } from "../assistant/turn"
import { createTRPCRouter, tenantProcedure } from "../lib.trpc"
import { assistantChannelsRouter } from "./assistant-channels.route"

/**
 * Signed-in website and native assistant. Authority comes only from the
 * tRPC session (tenant resolver + active membership); see
 * .brain/tasks/2026-11-14-cooperative-assistant-delivery.md for the contract.
 */

const appChannel = z.enum(["web", "native"])

type TenantCtx = {
  auth: {
    activeMembership: { id: string; role: string }
    session: { user: { id: string } }
  }
  tenant: { current: { id: string; name: string } }
}

function principalFor(ctx: TenantCtx, channel: "web" | "native"): AssistantPrincipal {
  return {
    tenantId: ctx.tenant.current.id,
    tenantName: ctx.tenant.current.name,
    userId: ctx.auth.session.user.id,
    membershipId: ctx.auth.activeMembership.id,
    role: ctx.auth.activeMembership.role as AssistantRole,
    channel,
    channelLinkId: null,
  }
}

const scopeOf = (principal: AssistantPrincipal) => ({
  tenantId: principal.tenantId,
  userId: principal.userId,
  membershipId: principal.membershipId,
})

function publicError(error: unknown): never {
  if (error instanceof ProposalError || error instanceof AssistantTurnError) {
    const code =
      error.code === "NOT_FOUND"
        ? "NOT_FOUND"
        : error.code === "FORBIDDEN"
          ? "PERMISSION_DENIED"
          : error.code === "CONFLICT"
            ? "CONFLICT"
            : "VALIDATION_FAILED"
    throw new AppError({ code, publicMessage: error.message, cause: error })
  }
  throw error
}

const conversationSummary = (row: {
  id: string
  title: string
  channel: string
  lastMessageAt: Date
}) => ({
  id: row.id,
  title: row.title,
  channel: row.channel as "web" | "native" | "whatsapp" | "telegram",
  updatedAt: row.lastMessageAt.toISOString(),
  lastMessagePreview: null,
})

export const assistantRouter = createTRPCRouter({
  bootstrap: tenantProcedure
    .input(z.object({ channel: appChannel }))
    .query(({ ctx, input }) => {
      const principal = principalFor(ctx, input.channel)
      return {
        role: principal.role === "member" ? ("member" as const) : ("staff" as const),
        cooperativeName: principal.tenantName,
        suggestions: assistantSuggestions(principal.role, principal.channel),
        help: assistantHelpItems(principal.role, principal.channel),
      }
    }),

  conversations: createTRPCRouter({
    list: tenantProcedure
      .input(z.object({ channel: appChannel, cursor: z.string().uuid().nullish() }))
      .query(({ ctx, input }) =>
        listAssistantConversations({
          ...scopeOf(principalFor(ctx, input.channel)),
          channel: input.channel,
          cursor: input.cursor ?? null,
        })
      ),
    create: tenantProcedure
      .input(z.object({ channel: appChannel }))
      .mutation(async ({ ctx, input }) => {
        const row = await createAssistantConversation({
          ...scopeOf(principalFor(ctx, input.channel)),
          channel: input.channel,
        })
        return { id: row.id }
      }),
    get: tenantProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        const principal = principalFor(ctx, "web")
        const conversation = await readAssistantConversation({
          ...scopeOf(principal),
          conversationId: input.id,
        })
        if (!conversation)
          throw new AppError({ code: "NOT_FOUND", publicMessage: "Chat not found." })
        const proposals = await listConversationProposals({
          ...scopeOf(principal),
          conversationId: input.id,
        })
        return {
          conversation: conversationSummary(conversation),
          messages: conversation.messages.map((message) => ({
            id: message.id,
            role: message.role,
            parts: Array.isArray(message.parts) ? message.parts : [],
            createdAt: message.createdAt.toISOString(),
          })),
          proposals: proposals.map(toProposalDto),
        }
      }),
    archive: tenantProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        await archiveAssistantConversation({
          ...scopeOf(principalFor(ctx, "web")),
          conversationId: input.id,
        })
        return { ok: true as const }
      }),
  }),

  send: tenantProcedure
    .input(assistantTurnInputSchema.extend({ channel: appChannel }))
    .mutation(async ({ ctx, input }) => {
      const { channel, ...turn } = input
      return runAssistantTurn(principalFor(ctx, channel), turn).catch(publicError)
    }),

  proposals: createTRPCRouter({
    get: tenantProcedure
      .input(z.object({ proposalId: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        const row = await readAssistantProposal({
          ...scopeOf(principalFor(ctx, "web")),
          proposalId: input.proposalId,
        })
        if (!row) throw new AppError({ code: "NOT_FOUND", publicMessage: "Draft not found." })
        return toProposalDto(row)
      }),
    edit: tenantProcedure
      .input(proposalEditInputSchema.extend({ channel: appChannel.default("web") }))
      .mutation(({ ctx, input }) => {
        const { channel, ...edit } = input
        return editProposal(principalFor(ctx, channel), edit).catch(publicError)
      }),
    confirm: tenantProcedure
      .input(proposalConfirmInputSchema.extend({ channel: appChannel.default("web") }))
      .mutation(({ ctx, input }) => {
        const { channel, ...confirm } = input
        return confirmProposal(principalFor(ctx, channel), confirm).catch(publicError)
      }),
    cancel: tenantProcedure
      .input(z.object({ proposalId: z.string().uuid(), channel: appChannel.default("web") }))
      .mutation(({ ctx, input }) =>
        cancelProposal(principalFor(ctx, input.channel), input.proposalId).catch(publicError)
      ),
  }),

  channels: assistantChannelsRouter,
})
