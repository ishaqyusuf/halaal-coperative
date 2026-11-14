import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { getAssistantChannelRuntime } from "../assistant/channels/routes"
import {
  AssistantChannelError,
  type AssistantChannelRuntime,
} from "../assistant/channels/runtime"
import { createTRPCRouter, tenantProcedure } from "../lib.trpc"

const providerInput = z
  .object({ provider: z.enum(["telegram", "whatsapp"]) })
  .strict()
const challengeInput = z
  .object({ challengeId: z.string().min(1).max(128) })
  .strict()

const errorCodes = {
  CHANNEL_DISABLED: "PRECONDITION_FAILED",
  NOT_FOUND: "NOT_FOUND",
  EXPIRED: "BAD_REQUEST",
  NOT_CLAIMED: "CONFLICT",
} as const

async function guarded<T>(work: () => Promise<T>) {
  try {
    return await work()
  } catch (error) {
    if (error instanceof AssistantChannelError)
      throw new TRPCError({
        code: errorCodes[error.code],
        message: error.message,
      })
    throw error
  }
}

type OwnerContext = {
  tenant: { current: { id: string } }
  auth: { session: { user: { id: string } }; activeMembership: { id: string } }
}

/** Identity comes only from the signed session, never from input. */
function owner(ctx: OwnerContext) {
  return {
    tenantId: ctx.tenant.current.id,
    userId: ctx.auth.session.user.id,
    membershipId: ctx.auth.activeMembership.id,
  }
}

/**
 * `assistant.channels.*`: link an existing signed-in account to a private
 * Telegram or WhatsApp chat, confirm it here, see status and disconnect.
 * Nothing creates a user or a cooperative.
 */
export function createAssistantChannelsRouter(
  runtime: () => AssistantChannelRuntime = getAssistantChannelRuntime
) {
  return createTRPCRouter({
    startLink: tenantProcedure
      .input(providerInput)
      .mutation(({ ctx, input }) =>
        guarded(() => runtime().startLink(owner(ctx), input.provider))
      ),
    pending: tenantProcedure.query(({ ctx }) =>
      guarded(() => runtime().pendingLinks(owner(ctx)))
    ),
    confirmLink: tenantProcedure
      .input(challengeInput)
      .mutation(({ ctx, input }) =>
        guarded(() => runtime().confirmLink(owner(ctx), input.challengeId))
      ),
    cancelLink: tenantProcedure
      .input(challengeInput)
      .mutation(({ ctx, input }) =>
        guarded(() => runtime().cancelLink(owner(ctx), input.challengeId))
      ),
    status: tenantProcedure.query(({ ctx }) =>
      guarded(() => runtime().status(owner(ctx)))
    ),
    disconnect: tenantProcedure
      .input(providerInput)
      .mutation(({ ctx, input }) =>
        guarded(() => runtime().disconnect(owner(ctx), input.provider))
      ),
  })
}

export const assistantChannelsRouter = createAssistantChannelsRouter()
