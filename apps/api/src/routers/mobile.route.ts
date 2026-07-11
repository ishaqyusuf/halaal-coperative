import {
  createMobileMemberFinancingRequest,
  createMobileMemberShareApplication,
  createMobileMemberReceipt,
  createMobileMemberSupportCase,
  getMobileAdminOverview,
  getMobileMemberFinancing,
  getMobileMemberGuarantorApprovals,
  getMobileMemberHome,
  getMobileMemberMore,
  getMobileMemberReceipts,
  getMobileMemberShares,
  getMobileMemberStatement,
  getMobileMemberSupport,
  getMobileMemberSection,
  mobileMemberSectionKeys,
  mobileReceiptAllocationCategoryKeys,
  mobileReceiptChannelKeys,
  mobileReceiptPeriodIntentKeys,
  mobileSupportCategoryKeys,
  respondMobileMemberGuarantorApproval,
} from "@halaalvest/db"
import { TRPCError } from "@trpc/server"
import { z } from "zod"

import {
  createTRPCRouter,
  minRoleProcedure,
  tenantProcedure,
} from "../lib.trpc"

const mobileMemberSectionInput = z.object({
  section: z.enum(mobileMemberSectionKeys),
})

const mobileSupportCreateInput = z.object({
  category: z.enum(mobileSupportCategoryKeys),
  description: z.string().trim().min(5).max(2000),
  moneyImpactRequested: z.boolean().optional(),
  subject: z.string().trim().min(3).max(120),
})

const mobileReceiptCreateInput = z.object({
  allocations: z
    .array(
      z.object({
        amount: z.number().positive(),
        category: z.enum(mobileReceiptAllocationCategoryKeys),
        notes: z.string().trim().max(240).optional(),
        periodIntent: z.enum(mobileReceiptPeriodIntentKeys).optional(),
        targetPeriodStart: z
          .string()
          .datetime()
          .transform((value) => new Date(value))
          .optional(),
      })
    )
    .min(1)
    .max(8),
  channel: z.enum(mobileReceiptChannelKeys).optional(),
  memberNotes: z.string().trim().max(1000).optional(),
  paidAt: z
    .string()
    .datetime()
    .transform((value) => new Date(value)),
  paymentReference: z.string().trim().max(120).optional(),
  proofDocumentName: z.string().trim().max(160).optional(),
  proofDocumentUrl: z.string().trim().url().max(1000).optional(),
  totalAmount: z.number().positive(),
})

const mobileShareApplicationCreateInput = z.object({
  notes: z.string().trim().max(1000).optional(),
  requestedUnits: z.number().int().positive(),
})

const mobileGuarantorApprovalRespondInput = z.object({
  guarantorApprovalId: z.string().trim().min(1),
  notes: z.string().trim().max(1000).optional(),
  status: z.enum(["approved", "rejected"]),
})

const mobileFinancingRequestCreateInput = z.object({
  extraMonthlySavingsAmount: z.number().min(0).optional(),
  loanProductId: z.string().trim().min(1),
  purpose: z.string().trim().max(1000).optional(),
  requestedAmount: z.number().positive(),
  requestedTermMonths: z.number().int().positive(),
})

function assertMemberWorkspace(role: string) {
  if (role !== "member") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Switch to the member workspace to view member data.",
    })
  }
}

export const mobileRouter = createTRPCRouter({
  admin: createTRPCRouter({
    overview: minRoleProcedure("operations_officer").query(({ ctx }) => {
      return getMobileAdminOverview(ctx.tenant.current.id)
    }),
  }),
  member: createTRPCRouter({
    home: tenantProcedure.query(({ ctx }) => {
      assertMemberWorkspace(ctx.auth.activeMembership.role)

      return getMobileMemberHome({
        tenantId: ctx.tenant.current.id,
        userId: ctx.auth.session.user.id,
      })
    }),
    more: tenantProcedure.query(({ ctx }) => {
      assertMemberWorkspace(ctx.auth.activeMembership.role)

      return getMobileMemberMore({
        tenantId: ctx.tenant.current.id,
        userId: ctx.auth.session.user.id,
      })
    }),
    section: tenantProcedure
      .input(mobileMemberSectionInput)
      .query(({ ctx, input }) => {
        assertMemberWorkspace(ctx.auth.activeMembership.role)

        return getMobileMemberSection({
          section: input.section,
          tenantId: ctx.tenant.current.id,
          userId: ctx.auth.session.user.id,
        })
      }),
    statement: tenantProcedure.query(({ ctx }) => {
      assertMemberWorkspace(ctx.auth.activeMembership.role)

      return getMobileMemberStatement({
        tenantId: ctx.tenant.current.id,
        userId: ctx.auth.session.user.id,
      })
    }),
    receipts: createTRPCRouter({
      create: tenantProcedure
        .input(mobileReceiptCreateInput)
        .mutation(({ ctx, input }) => {
          assertMemberWorkspace(ctx.auth.activeMembership.role)

          return createMobileMemberReceipt({
            allocations: input.allocations,
            channel: input.channel,
            memberNotes: input.memberNotes,
            paidAt: input.paidAt,
            paymentReference: input.paymentReference,
            proofDocumentName: input.proofDocumentName,
            proofDocumentUrl: input.proofDocumentUrl,
            tenantId: ctx.tenant.current.id,
            totalAmount: input.totalAmount,
            userId: ctx.auth.session.user.id,
          })
        }),
      list: tenantProcedure.query(({ ctx }) => {
        assertMemberWorkspace(ctx.auth.activeMembership.role)

        return getMobileMemberReceipts({
          tenantId: ctx.tenant.current.id,
          userId: ctx.auth.session.user.id,
        })
      }),
    }),
    guarantorApprovals: createTRPCRouter({
      list: tenantProcedure.query(({ ctx }) => {
        assertMemberWorkspace(ctx.auth.activeMembership.role)

        return getMobileMemberGuarantorApprovals({
          tenantId: ctx.tenant.current.id,
          userId: ctx.auth.session.user.id,
        })
      }),
      respond: tenantProcedure
        .input(mobileGuarantorApprovalRespondInput)
        .mutation(({ ctx, input }) => {
          assertMemberWorkspace(ctx.auth.activeMembership.role)

          return respondMobileMemberGuarantorApproval({
            guarantorApprovalId: input.guarantorApprovalId,
            notes: input.notes,
            status: input.status,
            tenantId: ctx.tenant.current.id,
            userId: ctx.auth.session.user.id,
          })
        }),
    }),
    financing: createTRPCRouter({
      createRequest: tenantProcedure
        .input(mobileFinancingRequestCreateInput)
        .mutation(({ ctx, input }) => {
          assertMemberWorkspace(ctx.auth.activeMembership.role)

          return createMobileMemberFinancingRequest({
            extraMonthlySavingsAmount: input.extraMonthlySavingsAmount,
            loanProductId: input.loanProductId,
            purpose: input.purpose,
            requestedAmount: input.requestedAmount,
            requestedTermMonths: input.requestedTermMonths,
            tenantId: ctx.tenant.current.id,
            userId: ctx.auth.session.user.id,
          })
        }),
      list: tenantProcedure.query(({ ctx }) => {
        assertMemberWorkspace(ctx.auth.activeMembership.role)

        return getMobileMemberFinancing({
          tenantId: ctx.tenant.current.id,
          userId: ctx.auth.session.user.id,
        })
      }),
    }),
    shares: createTRPCRouter({
      createApplication: tenantProcedure
        .input(mobileShareApplicationCreateInput)
        .mutation(({ ctx, input }) => {
          assertMemberWorkspace(ctx.auth.activeMembership.role)

          return createMobileMemberShareApplication({
            notes: input.notes,
            requestedUnits: input.requestedUnits,
            tenantId: ctx.tenant.current.id,
            userId: ctx.auth.session.user.id,
          })
        }),
      list: tenantProcedure.query(({ ctx }) => {
        assertMemberWorkspace(ctx.auth.activeMembership.role)

        return getMobileMemberShares({
          tenantId: ctx.tenant.current.id,
          userId: ctx.auth.session.user.id,
        })
      }),
    }),
    support: createTRPCRouter({
      create: tenantProcedure
        .input(mobileSupportCreateInput)
        .mutation(({ ctx, input }) => {
          assertMemberWorkspace(ctx.auth.activeMembership.role)

          return createMobileMemberSupportCase({
            category: input.category,
            description: input.description,
            moneyImpactRequested: input.moneyImpactRequested,
            subject: input.subject,
            tenantId: ctx.tenant.current.id,
            userId: ctx.auth.session.user.id,
          })
        }),
      list: tenantProcedure.query(({ ctx }) => {
        assertMemberWorkspace(ctx.auth.activeMembership.role)

        return getMobileMemberSupport({
          tenantId: ctx.tenant.current.id,
          userId: ctx.auth.session.user.id,
        })
      }),
    }),
  }),
})
