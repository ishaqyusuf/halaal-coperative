import { z } from "zod"
import { createTRPCRouter, tenantProcedure, minRoleProcedure } from "../lib.trpc"
import {
  listContributions,
  recordContribution,
  getContributionHistory,
  getMemberSavingsTotal,
} from "@halaal-vest/db"

export const contributionsRouter = createTRPCRouter({
  list: tenantProcedure
    .input(
      z
        .object({
          memberId: z.string().uuid().optional(),
          status: z.enum(["pending", "posted", "failed", "reversed"]).optional(),
          fromDate: z.string().datetime().transform((s) => new Date(s)).optional(),
          toDate: z.string().datetime().transform((s) => new Date(s)).optional(),
          page: z.number().int().min(1).optional(),
          pageSize: z.number().int().min(1).max(100).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return listContributions(ctx.tenant.current.id, input)
    }),

  record: minRoleProcedure("finance_officer")
    .input(
      z.object({
        memberId: z.string().uuid(),
        amount: z.number().positive(),
        channel: z.enum(["payroll", "transfer", "cash", "manual"]),
        postedAt: z.string().datetime().transform((s) => new Date(s)),
        contributionPlanId: z.string().uuid().optional(),
        periodLabel: z.string().optional(),
        reference: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return recordContribution({
        tenantId: ctx.tenant.current.id,
        memberId: input.memberId,
        amount: input.amount,
        channel: input.channel,
        postedAt: input.postedAt,
        contributionPlanId: input.contributionPlanId,
        periodLabel: input.periodLabel,
        reference: input.reference,
        notes: input.notes,
        actorUserId: ctx.auth.session.user.id,
      })
    }),

  memberHistory: tenantProcedure
    .input(z.object({ memberId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return getContributionHistory(ctx.tenant.current.id, input.memberId)
    }),

  memberSavings: tenantProcedure
    .input(z.object({ memberId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const total = await getMemberSavingsTotal(ctx.tenant.current.id, input.memberId)
      return { total }
    }),
})
