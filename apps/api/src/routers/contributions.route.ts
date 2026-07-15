import { z } from "zod"
import { createTRPCRouter, tenantProcedure, minRoleProcedure } from "../lib.trpc"
import {
  listContributions,
  recordContribution,
  getContributionHistory,
  getMemberSavingsTotal,
} from "@halaalvest/db"

const contributionSortFieldSchema = z.enum([
  "amount",
  "committedAmount",
  "extraSavingsAmount",
  "memberName",
  "postedAt",
])

const listContributionsLedgerSchema = z
  .object({
    channel: z.enum(["payroll", "transfer", "cash", "manual"]).optional(),
    cursor: z.string().nullable().optional(),
    from: z
      .string()
      .optional()
      .transform((value) =>
        value ? new Date(`${value}T00:00:00.000Z`) : undefined
      ),
    memberId: z.string().uuid().optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    q: z.string().nullable().optional(),
    sort: z
      .tuple([contributionSortFieldSchema, z.enum(["asc", "desc"])])
      .nullable()
      .optional(),
    to: z
      .string()
      .optional()
      .transform((value) =>
        value ? new Date(`${value}T23:59:59.999Z`) : undefined
      ),
  })
  .optional()

export const contributionsRouter = createTRPCRouter({
  ledger: tenantProcedure
    .input(listContributionsLedgerSchema)
    .query(async ({ ctx, input }) => {
      const pageSize = input?.pageSize ?? 50
      const result = await listContributions(ctx.tenant.current.id, {
        channel: input?.channel,
        cursor: input?.cursor ?? undefined,
        fromDate: input?.from,
        memberId: input?.memberId,
        pageSize: pageSize + 1,
        search: input?.q || undefined,
        sort: input?.sort ?? null,
        toDate: input?.to,
      })
      const data = result.items.slice(0, pageSize)

      return {
        data,
        meta: {
          cursor: result.items.length > pageSize ? data.at(-1)?.id : undefined,
          total: result.total,
        },
      }
    }),

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
