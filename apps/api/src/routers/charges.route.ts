import { z } from "zod"
import { createTRPCRouter, tenantProcedure, minRoleProcedure } from "../lib.trpc"
import {
  listChargeDefinitions,
  createChargeDefinition,
  updateChargeDefinition,
} from "@halaal-vest/db"

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
        isMonthlyLevy: z.boolean().optional(),
        appliesToMembers: z.boolean().optional(),
        appliesToLoanRequests: z.boolean().optional(),
        appliesToLoans: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return createChargeDefinition({
        tenantId: ctx.tenant.current.id,
        ...input,
      })
    }),

  updateDefinition: minRoleProcedure("tenant_admin")
    .input(
      z.object({
        chargeDefinitionId: z.string().uuid(),
        name: z.string().min(1).optional(),
        amount: z.number().positive().optional(),
        isActive: z.boolean().optional(),
        appliesToMembers: z.boolean().optional(),
        appliesToLoanRequests: z.boolean().optional(),
        appliesToLoans: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { chargeDefinitionId, ...data } = input
      return updateChargeDefinition(ctx.tenant.current.id, chargeDefinitionId, data)
    }),
})
