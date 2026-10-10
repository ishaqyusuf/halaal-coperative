import { roleCan, type CooperativeRole } from "@halaalvest/auth"
import {
  getMobileAdminFinanceSupportOverview,
  mobileAdminFinanceSupportQueueKeys,
  recordMobileAdminFinanceCollectionFollowUp,
  replyMobileAdminSupportCase,
  reviewMobileAdminFinanceFoodPurchase,
  reviewMobileAdminFinanceLoan,
  reviewMobileAdminFinanceProcurement,
  reviewMobileAdminFinanceProject,
  reviewMobileAdminFinanceReceipt,
  reviewMobileAdminFinanceShare,
  reviewMobileAdminSupportAdjustment,
  updateMobileAdminSupportCase,
  type MobileAdminFinanceSupportCapabilities,
} from "@halaalvest/db"
import { z } from "zod"
import { isSafeSupportAttachmentUrl } from "@halaalvest/utils"

import { createTRPCRouter, permissionProcedure } from "../lib.trpc"

const commandBase = {
  commandId: z.string().uuid(),
  expectedState: z.string().trim().min(1).max(80),
}

const reviewStatus = z.enum(["approved", "rejected", "under_review"])
const evidenceNotes = z.string().trim().min(2).max(1000)

const receiptReviewInput = z
  .object({
    ...commandBase,
    adjustmentReason: evidenceNotes.optional(),
    decision: z.enum([
      "under_review",
      "correction_requested",
      "approved",
      "rejected",
    ]),
    receiptId: z.string().trim().min(1),
    reviewNotes: evidenceNotes.optional(),
  })
  .superRefine((input, ctx) => {
    if (input.decision !== "under_review" && !input.reviewNotes) {
      ctx.addIssue({
        code: "custom",
        message: "Review evidence is required for the final receipt decision.",
        path: ["reviewNotes"],
      })
    }
  })

const financingReviewInput = z
  .object({
    ...commandBase,
    loanRequestId: z.string().trim().min(1),
    notes: evidenceNotes.optional(),
    status: reviewStatus,
  })
  .superRefine((input, ctx) => {
    if (input.status !== "under_review" && !input.notes) {
      ctx.addIssue({
        code: "custom",
        message: "Review evidence is required for the financing decision.",
        path: ["notes"],
      })
    }
  })

const procurementReviewInput = z
  .object({
    ...commandBase,
    approvedCost: z.number().positive().optional(),
    approvedRepaymentMonths: z.number().int().positive().optional(),
    notes: evidenceNotes.optional(),
    procurementRequestId: z.string().trim().min(1),
    status: reviewStatus,
  })
  .superRefine((input, ctx) => {
    if (input.status !== "under_review" && !input.notes) {
      ctx.addIssue({
        code: "custom",
        message: "Review evidence is required for the procurement decision.",
        path: ["notes"],
      })
    }
  })

const foodPurchaseReviewInput = z
  .object({
    ...commandBase,
    applicationId: z.string().trim().min(1),
    approvedAmount: z.number().positive().optional(),
    approvedPaybackMonths: z.number().int().positive().optional(),
    notes: evidenceNotes.optional(),
    status: reviewStatus,
  })
  .superRefine((input, ctx) => {
    if (input.status !== "under_review" && !input.notes) {
      ctx.addIssue({
        code: "custom",
        message:
          "Review evidence is required for the Foodstuff Purchase decision.",
        path: ["notes"],
      })
    }
  })

const projectReviewInput = z
  .object({
    ...commandBase,
    approvedAmount: z.number().positive().optional(),
    approvedPaybackMonths: z.number().int().positive().optional(),
    approvedStructure: z
      .enum([
        "investment_partnership",
        "profit_sharing",
        "repayable_facility",
        "undecided",
      ])
      .optional(),
    notes: evidenceNotes.optional(),
    projectFinancingRequestId: z.string().trim().min(1),
    status: reviewStatus,
  })
  .superRefine((input, ctx) => {
    if (input.status !== "under_review" && !input.notes) {
      ctx.addIssue({
        code: "custom",
        message:
          "Review evidence is required for the project financing decision.",
        path: ["notes"],
      })
    }
  })

const shareReviewInput = z.object({
  ...commandBase,
  applicationId: z.string().trim().min(1),
  approvedUnits: z.number().int().positive().optional(),
  decision: z.enum(["approved", "rejected"]),
  effectiveDate: z
    .string()
    .datetime()
    .transform((value) => new Date(value))
    .optional(),
  reviewNotes: evidenceNotes,
})

const supportReplyInput = z.object({
  ...commandBase,
  attachmentUrl: z
    .string()
    .trim()
    .max(1000)
    .refine(isSafeSupportAttachmentUrl)
    .optional(),
  message: z.string().trim().min(2).max(2000),
  supportCaseId: z.string().trim().min(1),
})

const supportStatusInput = z.object({
  ...commandBase,
  assignedToUserId: z.string().trim().min(1).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  requiresFinancialAdjustment: z.boolean().optional(),
  resolutionSummary: evidenceNotes,
  status: z.enum([
    "open",
    "in_progress",
    "waiting_on_member",
    "resolved",
    "closed",
  ]),
  supportCaseId: z.string().trim().min(1),
})

const supportAdjustmentInput = z.object({
  ...commandBase,
  approvalNotes: evidenceNotes,
  approvalStatus: z.enum(["approved", "rejected"]),
  expectedApprovalStatus: z.enum([
    "not_required",
    "pending",
    "approved",
    "rejected",
  ]),
  supportCaseId: z.string().trim().min(1),
})

const collectionFollowUpInput = z.object({
  ...commandBase,
  assignedToUserId: z.string().trim().min(1).optional(),
  caseStage: z.string().trim().max(80).optional(),
  nextActionAt: z.string().date().optional(),
  note: evidenceNotes,
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  promiseToPayAt: z.string().date().optional(),
  repaymentScheduleItemId: z.string().trim().min(1),
  resolutionStatus: z.string().trim().max(80).optional(),
  status: z.enum(["promise_to_pay", "reminded", "settled", "unreachable"]),
})

const overviewInput = z
  .object({
    limit: z.number().int().min(1).max(50).optional(),
    queueKey: z.enum(mobileAdminFinanceSupportQueueKeys).optional(),
    search: z.string().trim().max(120).optional(),
  })
  .optional()

export function getMobileAdminFinanceSupportCapabilities(
  role: CooperativeRole
): MobileAdminFinanceSupportCapabilities {
  return {
    approveMoneyImpactSupport: roleCan(role, "approve_money_impact_support"),
    manageSupport: roleCan(role, "manage_support"),
    recordCollectionFollowUp: roleCan(role, "record_collection_follow_up"),
    reviewFinancing: roleCan(role, "review_financing"),
    reviewFoodPurchase: roleCan(role, "review_food_purchase_applications"),
    reviewProcurement: roleCan(role, "review_procurement"),
    reviewProjectFinancing: roleCan(role, "review_project_financing"),
    reviewReceipts: roleCan(role, "review_receipts"),
    reviewShares: roleCan(role, "review_share_request"),
  }
}

export const mobileAdminFinanceSupportProcedures = {
  finance: createTRPCRouter({
    overview: permissionProcedure("view_admin_work_queue")
      .input(overviewInput)
      .query(({ ctx, input }) =>
        getMobileAdminFinanceSupportOverview({
          ...input,
          capabilities: getMobileAdminFinanceSupportCapabilities(
            ctx.auth.activeMembership.role
          ),
          tenantId: ctx.tenant.current.id,
        })
      ),
    recordCollectionFollowUp: permissionProcedure("record_collection_follow_up")
      .input(collectionFollowUpInput)
      .mutation(({ ctx, input }) =>
        recordMobileAdminFinanceCollectionFollowUp({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
    reviewFinancingRequest: permissionProcedure("review_financing")
      .input(financingReviewInput)
      .mutation(({ ctx, input }) =>
        reviewMobileAdminFinanceLoan({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
    reviewFoodPurchaseApplication: permissionProcedure(
      "review_food_purchase_applications"
    )
      .input(foodPurchaseReviewInput)
      .mutation(({ ctx, input }) =>
        reviewMobileAdminFinanceFoodPurchase({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
    reviewProcurementRequest: permissionProcedure("review_procurement")
      .input(procurementReviewInput)
      .mutation(({ ctx, input }) =>
        reviewMobileAdminFinanceProcurement({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
    reviewProjectFinancingRequest: permissionProcedure(
      "review_project_financing"
    )
      .input(projectReviewInput)
      .mutation(({ ctx, input }) =>
        reviewMobileAdminFinanceProject({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
    reviewReceipt: permissionProcedure("review_receipts")
      .input(receiptReviewInput)
      .mutation(({ ctx, input }) =>
        reviewMobileAdminFinanceReceipt({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
    reviewShareApplication: permissionProcedure("review_share_request")
      .input(shareReviewInput)
      .mutation(({ ctx, input }) =>
        reviewMobileAdminFinanceShare({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
  }),
  support: createTRPCRouter({
    reply: permissionProcedure("manage_support")
      .input(supportReplyInput)
      .mutation(({ ctx, input }) =>
        replyMobileAdminSupportCase({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
    reviewFinancialAdjustment: permissionProcedure(
      "approve_money_impact_support"
    )
      .input(supportAdjustmentInput)
      .mutation(({ ctx, input }) =>
        reviewMobileAdminSupportAdjustment({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
    updateStatus: permissionProcedure("manage_support")
      .input(supportStatusInput)
      .mutation(({ ctx, input }) =>
        updateMobileAdminSupportCase({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
  }),
}
