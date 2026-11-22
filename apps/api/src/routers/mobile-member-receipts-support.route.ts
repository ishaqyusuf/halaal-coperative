import {
  createMobileMemberReceiptForSession,
  createMobileMemberSupportCaseForSession,
  getMobileMemberReceiptSnapshot,
  getMobileMemberReceiptFormOptions,
  getMobileMemberPayables,
  getTenantOperationProfile,
  getMobileMemberReceiptDetail,
  getMobileMemberSupportDetail,
  getMobileMemberSupportSnapshot,
  replyMobileMemberSupportCaseForSession,
} from "@halaalvest/db"
import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { isSafeSupportAttachmentUrl } from "@halaalvest/utils"

import {
  createTRPCRouter,
  memberOperationalProcedure,
  tenantProcedure,
} from "../lib.trpc"

const allocationCategory = z.enum([
  "commitment",
  "special_savings",
  "loan_servicing",
  "loan_extra_payment",
  "shares",
  "procurement",
  "project_financing",
  "food_purchase",
  "other",
])
const periodIntent = z.enum([
  "current_period",
  "future_period",
  "back_period",
  "unspecified",
])
export const receiptCreateInput = z.object({
  allocations: z
    .array(
      z.object({
        amount: z.number().positive(),
        category: allocationCategory,
        contributionPlanId: z.string().trim().min(1).optional(),
        foodPurchaseApplicationId: z.string().trim().min(1).optional(),
        loanId: z.string().trim().min(1).optional(),
        memberShareApplicationId: z.string().trim().min(1).optional(),
        notes: z.string().trim().max(240).optional(),
        periodIntent: periodIntent.optional(),
        projectFinancingRequestId: z.string().trim().min(1).optional(),
        procurementRepaymentScheduleItemId: z.string().trim().min(1).optional(),
        targetPeriodStart: z
          .string()
          .datetime()
          .transform((value) => new Date(value))
          .optional(),
      })
    )
    // Empty (T30): approval applies the amount in the cooperative's order.
    .min(0)
    .max(8),
  channel: z.enum(["transfer", "cash", "manual", "payroll"]).optional(),
  memberNotes: z.string().trim().max(1000).optional(),
  paidAt: z
    .string()
    .datetime()
    .transform((value) => new Date(value)),
  paymentReference: z.string().trim().max(120).optional(),
  proofDocumentName: z.string().trim().max(160).optional(),
  proofDocumentUrl: z
    .string()
    .trim()
    .max(1000)
    .refine(isSafeSupportAttachmentUrl)
    .optional(),
  totalAmount: z.number().positive(),
})

const supportCategory = z.enum([
  "payment_issue",
  "account_update",
  "shares",
  "financing",
  "procurement",
  "feature_request",
  "technical",
  "other",
])
const linkedRecordType = z.enum([
  "member",
  "contribution",
  "repayment",
  "loan_request",
  "loan",
  "share_application",
  "procurement",
  "receipt",
  "other",
])
const supportCreateInput = z
  .object({
    category: supportCategory,
    description: z.string().trim().min(5).max(2000),
    linkedRecordId: z.string().trim().min(1).optional(),
    linkedRecordType: linkedRecordType.optional(),
    moneyImpactRequested: z.boolean().optional(),
    subject: z.string().trim().min(3).max(120),
  })
  .refine(
    (input) =>
      Boolean(input.linkedRecordId) === Boolean(input.linkedRecordType),
    "Linked record id and type are required together."
  )
const supportReplyInput = z.object({
  attachmentUrl: z
    .string()
    .trim()
    .max(1000)
    .refine(isSafeSupportAttachmentUrl)
    .optional(),
  message: z.string().trim().min(2).max(2000),
  supportCaseId: z.string().trim().min(1),
})
const supportListInput = z
  .object({
    cursor: z.string().trim().min(1).optional(),
    includeOverview: z.boolean().optional(),
  })
  .optional()

function assertMemberWorkspace(role: string) {
  if (role !== "member") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Switch to the member workspace to view member data.",
    })
  }
}

export const mobileMemberReceiptsSupportProcedures = {
  receipts: createTRPCRouter({
    create: memberOperationalProcedure
      .input(receiptCreateInput)
      .mutation(({ ctx, input }) => {
        assertMemberWorkspace(ctx.auth.activeMembership.role)
        return createMobileMemberReceiptForSession({
          ...input,
          tenantId: ctx.tenant.current.id,
          userId: ctx.auth.session.user.id,
        })
      }),
    list: tenantProcedure
      .input(
        z
          .object({
            compact: z.literal(true).optional(),
            cursor: z.string().trim().min(1).max(1024).optional(),
            search: z.string().trim().min(1).max(120).optional(),
          })
          .optional()
      )
      .query(({ ctx, input }) => {
        assertMemberWorkspace(ctx.auth.activeMembership.role)
        return getMobileMemberReceiptSnapshot({
          ...input,
          tenantId: ctx.tenant.current.id,
          userId: ctx.auth.session.user.id,
        })
      }),
    uploadAccess: memberOperationalProcedure.query(async ({ ctx }) => {
      // The REST upload handlers run this same guard with the signed device session.
      if (!ctx.request.mobileAuthenticated)
        throw new TRPCError({ code: "FORBIDDEN" })
      const tenantId = ctx.tenant.current.id
      const profile = await getTenantOperationProfile(tenantId)
      if (!profile.services.payment_receipts.canMemberCreate) {
        throw new TRPCError({ code: "FORBIDDEN" })
      }
      return { tenantId, userId: ctx.auth.session.user.id }
    }),
    payables: tenantProcedure.query(({ ctx }) => {
      assertMemberWorkspace(ctx.auth.activeMembership.role)
      return getMobileMemberPayables({
        tenantId: ctx.tenant.current.id,
        userId: ctx.auth.session.user.id,
      })
    }),
    formOptions: tenantProcedure.query(({ ctx }) => {
      assertMemberWorkspace(ctx.auth.activeMembership.role)
      return getMobileMemberReceiptFormOptions({
        tenantId: ctx.tenant.current.id,
        userId: ctx.auth.session.user.id,
      })
    }),
    detail: tenantProcedure
      .input(z.object({ receiptId: z.string().trim().min(1).max(200) }))
      .query(({ ctx, input }) => {
        assertMemberWorkspace(ctx.auth.activeMembership.role)
        return getMobileMemberReceiptDetail({
          ...input,
          tenantId: ctx.tenant.current.id,
          userId: ctx.auth.session.user.id,
        })
      }),
  }),
  support: createTRPCRouter({
    create: tenantProcedure
      .input(supportCreateInput)
      .mutation(({ ctx, input }) => {
        assertMemberWorkspace(ctx.auth.activeMembership.role)
        return createMobileMemberSupportCaseForSession({
          ...input,
          tenantId: ctx.tenant.current.id,
          userId: ctx.auth.session.user.id,
        })
      }),
    detail: tenantProcedure
      .input(z.object({ supportCaseId: z.string().trim().min(1) }))
      .query(({ ctx, input }) => {
        assertMemberWorkspace(ctx.auth.activeMembership.role)
        return getMobileMemberSupportDetail({
          ...input,
          tenantId: ctx.tenant.current.id,
          userId: ctx.auth.session.user.id,
        })
      }),
    list: tenantProcedure.input(supportListInput).query(({ ctx, input }) => {
      assertMemberWorkspace(ctx.auth.activeMembership.role)
      return getMobileMemberSupportSnapshot({
        cursor: input?.cursor,
        includeOverview: input?.includeOverview,
        tenantId: ctx.tenant.current.id,
        userId: ctx.auth.session.user.id,
      })
    }),
    reply: tenantProcedure
      .input(supportReplyInput)
      .mutation(({ ctx, input }) => {
        assertMemberWorkspace(ctx.auth.activeMembership.role)
        return replyMobileMemberSupportCaseForSession({
          ...input,
          tenantId: ctx.tenant.current.id,
          userId: ctx.auth.session.user.id,
        })
      }),
  }),
}
