import {
  getCooperativeMobileAccessSnapshot,
  getCooperativeMobileMemberStatus,
  grantCooperativeMobileAccess,
  listCooperativeMobileAccessMembers,
  listCooperativeMobileAccessTerms,
  requestCooperativeMobileAccess,
  reviewCooperativeMobileAccess,
  setCooperativeMobileAccessEnabled,
} from "@halaalvest/db"
import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { createTRPCRouter, tenantProcedure } from "../lib.trpc"

const webProcedure = tenantProcedure.use(({ ctx, next }) => {
  if (ctx.request.mobileAuthenticated) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Use the cooperative dashboard to manage mobile access.",
    })
  }
  return next({ ctx })
})

function actor(ctx: {
  auth: { activeMembership: { id: string }; session: { user: { id: string } } }
  tenant: { current: { id: string } }
}) {
  return {
    tenantId: ctx.tenant.current.id,
    userId: ctx.auth.session.user.id,
    membershipId: ctx.auth.activeMembership.id,
  }
}

const requiredNote = z.string().trim().min(1).max(500)
const termsVersion = z.string().trim().min(1).max(100)

export const cooperativeMobileAccessRouter = createTRPCRouter({
  snapshot: tenantProcedure.query(({ ctx }) =>
    getCooperativeMobileAccessSnapshot(actor(ctx))
  ),
  memberStatus: webProcedure.query(({ ctx }) =>
    getCooperativeMobileMemberStatus(actor(ctx))
  ),
  request: webProcedure
    .input(z.object({ termsVersion, accepted: z.literal(true) }).strict())
    .mutation(({ ctx, input }) =>
      requestCooperativeMobileAccess({
        ...actor(ctx),
        termsVersion: input.termsVersion,
      })
    ),
  queue: webProcedure
    .input(
      z
        .object({
          status: z
            .enum(["pending", "approved", "rejected", "revoked"])
            .optional(),
          cursor: z.uuid().optional(),
          limit: z.number().int().min(1).max(100).default(30),
        })
        // Not strict: tRPC infinite queries also send `direction`.
    )
    .query(({ ctx, input }) =>
      listCooperativeMobileAccessTerms({ ...actor(ctx), ...input })
    ),
  members: webProcedure
    .input(
      z
        .object({
          search: z.string().trim().max(100).optional(),
          cursor: z.uuid().optional(),
          limit: z.number().int().min(1).max(100).default(30),
        })
        // Not strict: tRPC infinite queries also send `direction`.
    )
    .query(({ ctx, input }) =>
      listCooperativeMobileAccessMembers({ ...actor(ctx), ...input })
    ),
  grant: webProcedure
    .input(
      z
        .object({
          memberIds: z.array(z.uuid()).min(1).max(50),
          termsVersion,
          memberAgreementConfirmed: z.literal(true),
          note: requiredNote.optional(),
        })
        .strict()
    )
    .mutation(({ ctx, input }) =>
      grantCooperativeMobileAccess({
        ...actor(ctx),
        memberIds: input.memberIds,
        termsVersion: input.termsVersion,
        note: input.note,
      })
    ),
  setEnabled: webProcedure
    .input(z.object({ enabled: z.boolean(), termsVersion }).strict())
    .mutation(({ ctx, input }) =>
      setCooperativeMobileAccessEnabled({ ...actor(ctx), ...input })
    ),
  review: webProcedure
    .input(
      z
        .object({
          termId: z.uuid(),
          decision: z.enum(["approve", "reject"]),
          note: requiredNote.optional(),
        })
        .strict()
    )
    .mutation(({ ctx, input }) =>
      reviewCooperativeMobileAccess({ ...actor(ctx), ...input })
    ),
  revoke: webProcedure
    .input(z.object({ termId: z.uuid(), note: requiredNote }).strict())
    .mutation(({ ctx, input }) =>
      reviewCooperativeMobileAccess({
        ...actor(ctx),
        ...input,
        decision: "revoke",
      })
    ),
  reinstate: webProcedure
    .input(z.object({ termId: z.uuid(), note: requiredNote }).strict())
    .mutation(({ ctx, input }) =>
      reviewCooperativeMobileAccess({
        ...actor(ctx),
        ...input,
        decision: "reinstate",
      })
    ),
})
