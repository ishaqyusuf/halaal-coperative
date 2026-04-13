import { initTRPC, TRPCError } from "@trpc/server"
import superjson from "superjson"

import type { TRPCContext } from "./context.js"

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
})

export const createTRPCRouter = t.router
export const publicProcedure = t.procedure
export const authenticatedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.auth.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to continue.",
    })
  }

  return next({
    ctx,
  })
})

export const tenantProcedure = authenticatedProcedure.use(({ ctx, next }) => {
  if (!ctx.auth.activeTenantId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "An active tenant is required for this action.",
    })
  }

  return next({
    ctx,
  })
})
