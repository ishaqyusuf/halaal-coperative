import { hasActiveMembership } from "@halaalvest/auth"
import { isRoleAtLeast, type CooperativeRole } from "@halaalvest/auth/roles"
import {
  assertMemberOperationalReadiness,
  getMemberByUserId,
} from "@halaalvest/db"
import { initTRPC, TRPCError } from "@trpc/server"
import superjson from "superjson"

import type { TRPCContext } from "./context"

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
})

export const createTRPCRouter = t.router
export const createCallerFactory = t.createCallerFactory
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

export const platformOwnerProcedure = authenticatedProcedure.use(
  ({ ctx, next }) => {
    const session = ctx.auth.session

    if (!session?.user.isPlatformOwner) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Platform-owner access is required for this action.",
      })
    }

    return next({
      ctx: {
        ...ctx,
        auth: {
          ...ctx.auth,
          session,
        },
      },
    })
  }
)

export const tenantProcedure = authenticatedProcedure.use(({ ctx, next }) => {
  if (!ctx.tenant.current || !hasActiveMembership(ctx.auth)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "An active tenant is required for this action.",
    })
  }

  if (ctx.tenant.current.qaPurgeStartedAt) {
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "This QA workspace is being purged and no longer accepts writes.",
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

export const memberOperationalProcedure = tenantProcedure.use(
  async ({ ctx, next }) => {
    if (ctx.auth.activeMembership.role !== "member") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Member access is required for this action.",
      })
    }

    let member

    try {
      member = await getMemberByUserId({
        tenantId: ctx.tenant.current.id,
        userId: ctx.auth.session.user.id,
      })
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Database not configured"
      ) {
        return next({ ctx })
      }

      throw error
    }

    if (!member) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Your user account is not linked to a member profile.",
      })
    }

    try {
      await assertMemberOperationalReadiness({
        memberId: member.id,
        tenantId: ctx.tenant.current.id,
      })
    } catch {
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "Member verification is required before financial or operational actions can continue.",
      })
    }

    return next({ ctx })
  }
)

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
