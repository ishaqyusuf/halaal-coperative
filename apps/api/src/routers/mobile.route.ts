import {
  createMobileMemberReceipt,
  createMobileMemberSupportCase,
  getMobileAdminOverview,
  getMobileMemberHome,
  getMobileMemberMore,
  getMobileMemberReceipts,
  getMobileMemberSupport,
  getMobileMemberSection,
  mobileMemberSectionKeys,
  mobileReceiptAllocationCategoryKeys,
  mobileReceiptChannelKeys,
  mobileReceiptPeriodIntentKeys,
  mobileSupportCategoryKeys,
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
