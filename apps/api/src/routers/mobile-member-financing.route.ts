import {
  createMobileMemberFinancingRequestForSession,
  getMobileMemberFinancingRequestPage,
  getMobileMemberFinancingRequestDetail,
  getMobileMemberFinancingSnapshot,
  getMobileMemberGuarantorSnapshot,
  quoteMobileMemberFinancingRequest,
  respondMobileMemberGuarantorRequestForSession,
} from "@halaalvest/db"
import { TRPCError } from "@trpc/server"
import { z } from "zod"

import {
  createTRPCRouter,
  memberOperationalProcedure,
  tenantProcedure,
} from "../lib.trpc"

const financingQuoteInput = z.object({
  extraMonthlySavingsAmount: z.number().min(0).optional(),
  loanProductId: z.string().trim().min(1),
  requestedAmount: z.number().positive(),
  requestedTermMonths: z.number().int().positive(),
})

const financingCreateInput = financingQuoteInput.extend({
  chargeQuoteHash: z.string().regex(/^[a-f0-9]{64}$/),
  purpose: z.string().trim().max(1000).optional(),
})

const financingPageInput = z.object({
  cursor: z.string().trim().min(1).max(500).nullish(),
  pageSize: z.number().int().min(1).max(50).optional(),
})

const financingDetailInput = z.object({
  loanRequestId: z.string().trim().min(1).max(200),
})

const guarantorResponseInput = z
  .object({
    decisionConfirmed: z.literal(true),
    guarantorApprovalId: z.string().trim().min(1),
    notes: z.string().trim().max(1000).optional(),
    status: z.enum(["approved", "rejected"]),
  })
  .superRefine((input, ctx) => {
    if (input.status === "rejected" && !input.notes?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "A rejection reason is required.",
        path: ["notes"],
      })
    }
  })

function assertMemberWorkspace(role: string) {
  if (role !== "member") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Switch to the member workspace to view member data.",
    })
  }
}

export const mobileMemberFinancingProcedures = {
  financing: createTRPCRouter({
    createRequest: memberOperationalProcedure
      .input(financingCreateInput)
      .mutation(({ ctx, input }) => {
        assertMemberWorkspace(ctx.auth.activeMembership.role)
        return createMobileMemberFinancingRequestForSession({
          ...input,
          tenantId: ctx.tenant.current.id,
          userId: ctx.auth.session.user.id,
        })
      }),
    list: tenantProcedure.query(({ ctx }) => {
      assertMemberWorkspace(ctx.auth.activeMembership.role)
      return getMobileMemberFinancingSnapshot({
        tenantId: ctx.tenant.current.id,
        userId: ctx.auth.session.user.id,
      })
    }),
    request: tenantProcedure
      .input(financingDetailInput)
      .query(({ ctx, input }) => {
        assertMemberWorkspace(ctx.auth.activeMembership.role)
        return getMobileMemberFinancingRequestDetail({
          ...input,
          tenantId: ctx.tenant.current.id,
          userId: ctx.auth.session.user.id,
        })
      }),
    quote: tenantProcedure
      .input(financingQuoteInput)
      .query(({ ctx, input }) => {
        assertMemberWorkspace(ctx.auth.activeMembership.role)
        return quoteMobileMemberFinancingRequest({
          ...input,
          tenantId: ctx.tenant.current.id,
          userId: ctx.auth.session.user.id,
        })
      }),
    requests: tenantProcedure
      .input(financingPageInput)
      .query(({ ctx, input }) => {
        assertMemberWorkspace(ctx.auth.activeMembership.role)
        return getMobileMemberFinancingRequestPage({
          ...input,
          tenantId: ctx.tenant.current.id,
          userId: ctx.auth.session.user.id,
        })
      }),
  }),
  guarantorApprovals: createTRPCRouter({
    list: tenantProcedure.query(({ ctx }) => {
      assertMemberWorkspace(ctx.auth.activeMembership.role)
      return getMobileMemberGuarantorSnapshot({
        tenantId: ctx.tenant.current.id,
        userId: ctx.auth.session.user.id,
      })
    }),
    respond: memberOperationalProcedure
      .input(guarantorResponseInput)
      .mutation(({ ctx, input }) => {
        assertMemberWorkspace(ctx.auth.activeMembership.role)
        return respondMobileMemberGuarantorRequestForSession({
          ...input,
          tenantId: ctx.tenant.current.id,
          userId: ctx.auth.session.user.id,
        })
      }),
  }),
}
