import { createTenantWorkspaceBootstrap, getTenantOnboardingState } from "@halaalvest/db"
import { z } from "zod"

import { authenticatedProcedure, createTRPCRouter, tenantProcedure } from "../lib.trpc"

export const onboardingRouter = createTRPCRouter({
  status: tenantProcedure.query(async ({ ctx }) => {
    return getTenantOnboardingState(ctx.tenant.current.id)
  }),

  bootstrap: authenticatedProcedure
    .input(
      z.object({
        name: z.string().min(2),
        slug: z.string().min(2),
        ownerFullName: z.string().min(2),
        ownerEmail: z.email(),
        ownerMemberNumber: z.string().min(1).optional(),
        region: z.string().min(2).optional(),
        currencyCode: z.string().length(3).optional(),
        timezone: z.string().min(2).optional(),
        reserveBufferAmount: z.number().nonnegative().optional(),
        monthlyLevyAmount: z.number().nonnegative().nullable().optional(),
        quickLoanTermMonths: z.number().int().min(1).optional(),
        normalLoanTermMonths: z.number().int().min(1).optional(),
        loanEligibilityMultiple: z.number().positive().optional(),
        requiresDualLoanApproval: z.boolean().optional(),
        allowOfflineFinancialCapture: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return createTenantWorkspaceBootstrap(input)
    }),
})
