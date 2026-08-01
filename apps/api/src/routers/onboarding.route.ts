import {
  createTenantWorkspaceBootstrap,
  getMemberOnboardingRequestSummary,
  getTenantOnboardingState,
  listMemberOnboardingRequests,
  resolveConfiguredQaDomain,
} from "@halaalvest/db"
import { roleCan } from "@halaalvest/auth/roles"
import { isCooperativeCountry } from "@halaalvest/domain"
import { getServerQaEmailDomains } from "@halaalvest/notifications/server"
import { TRPCError } from "@trpc/server"
import { z } from "zod"

import {
  authenticatedProcedure,
  createTRPCRouter,
  tenantProcedure,
} from "../lib.trpc"
import { listMembershipApprovalsSchema } from "../schemas/onboarding"

const membershipApprovalProcedure = tenantProcedure.use(({ ctx, next }) => {
  if (!roleCan(ctx.auth.activeMembership.role, "manage_members")) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Member-management access is required for this action.",
    })
  }

  return next({ ctx })
})

export const onboardingRouter = createTRPCRouter({
  membershipApprovalSummary: membershipApprovalProcedure.query(({ ctx }) =>
    getMemberOnboardingRequestSummary(ctx.tenant.current.id)
  ),

  membershipApprovals: membershipApprovalProcedure
    .input(listMembershipApprovalsSchema)
    .query(async ({ ctx, input }) => {
      const pageSize = input?.pageSize ?? 50
      const requests = await listMemberOnboardingRequests(
        ctx.tenant.current.id,
        {
          cursor: input?.cursor ?? undefined,
          pageSize: pageSize + 1,
          search: input?.q || undefined,
          sort: input?.sort ?? null,
          status: input?.status ?? undefined,
        }
      )
      const items = requests.items.slice(0, pageSize)

      return {
        data: items,
        meta: {
          cursor:
            requests.items.length > pageSize ? items.at(-1)?.id : undefined,
          total: requests.total,
        },
      }
    }),

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
        city: z.string().min(1).optional(),
        state: z.string().min(1).optional(),
        country: z
          .string()
          .min(1)
          .refine(isCooperativeCountry, "Select a valid cooperative country.")
          .optional(),
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
      })
    )
    .mutation(async ({ input }) => {
      return createTenantWorkspaceBootstrap({
        ...input,
        qaSourceDomain: resolveConfiguredQaDomain(
          input.ownerEmail,
          getServerQaEmailDomains()
        ),
      })
    }),
})
