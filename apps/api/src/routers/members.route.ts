import { z } from "zod"
import { createTRPCRouter, tenantProcedure, minRoleProcedure } from "../lib.trpc.js"
import {
  listMembers,
  getMemberById,
  createMember,
  updateMember,
  updateMemberStatus,
} from "@halaal-vest/db"

export const membersRouter = createTRPCRouter({
  list: tenantProcedure
    .input(
      z
        .object({
          status: z.enum(["pending", "active", "inactive", "suspended", "exited"]).optional(),
          memberType: z.enum(["civil_servant", "individual", "business"]).optional(),
          search: z.string().optional(),
          page: z.number().int().min(1).optional(),
          pageSize: z.number().int().min(1).max(100).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return listMembers(ctx.tenant.current.id, input)
    }),

  get: tenantProcedure
    .input(z.object({ memberId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const member = await getMemberById(ctx.tenant.current.id, input.memberId)
      if (!member) {
        throw new Error("Member not found")
      }
      return member
    }),

  create: minRoleProcedure("operations_officer")
    .input(
      z.object({
        memberNumber: z.string().min(1),
        fullName: z.string().min(1),
        memberType: z.enum(["civil_servant", "individual", "business"]),
        joinedAt: z.string().datetime().transform((s) => new Date(s)),
        userId: z.string().uuid().optional(),
        deductionSourceId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return createMember({
        tenantId: ctx.tenant.current.id,
        memberNumber: input.memberNumber,
        fullName: input.fullName,
        memberType: input.memberType,
        joinedAt: input.joinedAt,
        userId: input.userId,
        deductionSourceId: input.deductionSourceId,
        actorUserId: ctx.auth.session.user.id,
      })
    }),

  update: minRoleProcedure("operations_officer")
    .input(
      z.object({
        memberId: z.string().uuid(),
        fullName: z.string().min(1).optional(),
        memberType: z.enum(["civil_servant", "individual", "business"]).optional(),
        deductionSourceId: z.string().uuid().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return updateMember(ctx.tenant.current.id, input.memberId, {
        fullName: input.fullName,
        memberType: input.memberType,
        deductionSourceId: input.deductionSourceId,
        actorUserId: ctx.auth.session.user.id,
      })
    }),

  updateStatus: minRoleProcedure("tenant_admin")
    .input(
      z.object({
        memberId: z.string().uuid(),
        status: z.enum(["pending", "active", "inactive", "suspended", "exited"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return updateMemberStatus(
        ctx.tenant.current.id,
        input.memberId,
        input.status,
        ctx.auth.session.user.id,
      )
    }),
})
