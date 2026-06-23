import { hasActiveMembership } from "@halaalvest/auth"
import { isRoleAtLeast, type CooperativeRole } from "@halaalvest/auth/roles"
import { initTRPC, TRPCError } from "@trpc/server"
import superjson from "superjson"

import type { TRPCContext } from "./context"

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
  if (!ctx.tenant.current || !hasActiveMembership(ctx.auth)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "An active tenant is required for this action.",
    })
  }

  return next({
    ctx: {
      ...ctx,
      auth: {
        ...ctx.auth,
        activeMembership: ctx.auth.activeMembership,
        session: ctx.auth.session,
      },
      tenant: {
        ...ctx.tenant,
        current: ctx.tenant.current,
      },
    },
  })
})

export function minRoleProcedure(required: CooperativeRole) {
  return tenantProcedure.use(({ ctx, next }) => {
    if (!isRoleAtLeast(ctx.auth.activeMembership.role, required)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `This action requires ${required} role or above.`,
      })
    }

    return next({
      ctx,
    })
  })
}
