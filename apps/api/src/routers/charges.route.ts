import { z } from "zod"
import { createTRPCRouter, tenantProcedure, minRoleProcedure } from "../lib.trpc"
import {
  createChargeDefinitionVersion,
  listChargeDefinitions,
  listChargeDefinitionVersions,
  createChargeDefinition,
  updateChargeDefinition,
} from "@halaalvest/db"

export const chargesRouter = createTRPCRouter({
  listDefinitions: tenantProcedure.query(async ({ ctx }) => {
    return listChargeDefinitions(ctx.tenant.current.id)
  }),

  createDefinition: minRoleProcedure("tenant_admin")
    .input(
      z.object({
        name: z.string().min(1),
        code: z.string().min(1),
        kind: z.enum(["fixed", "percentage"]),
        amount: z.number().positive(),
        effectiveFrom: z.coerce.date().optional(),
        isMonthlyLevy: z.boolean().optional(),
        appliesToMembers: z.boolean().optional(),
        appliesToLoanRequests: z.boolean().optional(),
        appliesToLoans: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return createChargeDefinition({
        ...input,
        effectiveFrom: input.effectiveFrom ?? new Date(),
        tenantId: ctx.tenant.current.id,
      })
    }),

  listVersions: tenantProcedure
    .input(
      z.object({
        chargeDefinitionId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return listChargeDefinitionVersions(ctx.tenant.current.id, input.chargeDefinitionId)
    }),

  createVersion: minRoleProcedure("tenant_admin")
    .input(
      z.object({
        chargeDefinitionId: z.string().uuid(),
        effectiveFrom: z.coerce.date(),
        amount: z.number().positive(),
        kind: z.enum(["fixed", "percentage"]),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return createChargeDefinitionVersion({
        ...input,
        createdByUserId: ctx.auth.session.user.id,
        tenantId: ctx.tenant.current.id,
      })
    }),

  updateDefinition: minRoleProcedure("tenant_admin")
    .input(
      z.object({
        chargeDefinitionId: z.string().uuid(),
        name: z.string().min(1).optional(),
        kind: z.enum(["fixed", "percentage"]).optional(),
        amount: z.number().positive().optional(),
        effectiveFrom: z.coerce.date().optional(),
        notes: z.string().optional(),
        isActive: z.boolean().optional(),
        appliesToMembers: z.boolean().optional(),
        appliesToLoanRequests: z.boolean().optional(),
        appliesToLoans: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { chargeDefinitionId, ...data } = input
      return updateChargeDefinition(ctx.tenant.current.id, chargeDefinitionId, {
        ...data,
        createdByUserId: ctx.auth.session.user.id,
      })
    }),
})
