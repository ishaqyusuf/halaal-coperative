import { roleCan, type CooperativeRole } from "@halaalvest/auth"
import {
  createMobileAdminFoodPurchaseCycle,
  getMobileAdminFoodPurchaseApplicationDetail,
  getMobileAdminFoodPurchaseWorkspace,
  mobileAdminFoodPurchaseLanes,
  reviewMobileAdminFoodPurchaseAccounting,
  reviewMobileAdminFoodPurchaseApplicationOperation,
  submitMobileAdminFoodPurchaseAccounting,
  transitionMobileAdminFoodPurchaseCycle,
  type MobileAdminFoodPurchaseCapabilities,
} from "@halaalvest/db"
import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { createTRPCRouter, permissionProcedure } from "../lib.trpc"

const commandId = z.string().uuid()
const dateOnly = z.string().date()
const evidence = z.string().trim().min(2).max(2_000)

export function getMobileAdminFoodPurchaseCapabilities(
  role: CooperativeRole
): MobileAdminFoodPurchaseCapabilities {
  return {
    releaseFunds: roleCan(role, "release_food_purchase_funds"),
    reviewAccounting: roleCan(role, "review_food_purchase_accounting"),
    reviewApplications: roleCan(role, "review_food_purchase_applications"),
    submitAccounting: roleCan(role, "submit_food_purchase_accounting"),
    view:
      roleCan(role, "view_admin_work_queue") &&
      (roleCan(role, "release_food_purchase_funds") ||
        roleCan(role, "review_food_purchase_accounting") ||
        roleCan(role, "review_food_purchase_applications") ||
        roleCan(role, "submit_food_purchase_accounting")),
  }
}

function assertMobileAdminFoodPurchaseView(role: CooperativeRole) {
  const capabilities = getMobileAdminFoodPurchaseCapabilities(role)
  if (!capabilities.view) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Foodstuff Purchase operations access is required.",
    })
  }
  return capabilities
}

export const mobileAdminFoodPurchaseOperationsProcedures = {
  foodPurchaseOperations: createTRPCRouter({
    applicationDetail: permissionProcedure("view_admin_work_queue")
      .input(z.object({ applicationId: z.string().uuid() }))
      .query(({ ctx, input }) => {
        assertMobileAdminFoodPurchaseView(ctx.auth.activeMembership.role)
        return getMobileAdminFoodPurchaseApplicationDetail({
          ...input,
          tenantId: ctx.tenant.current.id,
        })
      }),
    completeCycle: permissionProcedure("review_food_purchase_accounting")
      .input(
        z.object({
          commandId,
          cycleId: z.string().uuid(),
          expectedState: z.literal("accounting_approved"),
          notes: evidence.optional(),
          transition: z.literal("complete"),
        })
      )
      .mutation(({ ctx, input }) =>
        transitionMobileAdminFoodPurchaseCycle({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
    createCycle: permissionProcedure("release_food_purchase_funds")
      .input(
        z.object({
          commandId,
          periodMonth: dateOnly,
          releasedAmount: z.number().positive().finite().max(1_000_000_000),
          releasedAt: dateOnly,
          releaseNotes: evidence.optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        createMobileAdminFoodPurchaseCycle({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
    reviewAccounting: permissionProcedure("review_food_purchase_accounting")
      .input(
        z
          .object({
            commandId,
            cycleId: z.string().uuid(),
            decision: z.enum(["approved", "rejected"]),
            expectedState: z.literal("accounting_submitted"),
            notes: evidence.optional(),
          })
          .superRefine((input, ctx) => {
            if (input.decision === "rejected" && !input.notes) {
              ctx.addIssue({
                code: "custom",
                message: "Correction guidance is required.",
                path: ["notes"],
              })
            }
          })
      )
      .mutation(({ ctx, input }) =>
        reviewMobileAdminFoodPurchaseAccounting({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
    reviewApplication: permissionProcedure("review_food_purchase_applications")
      .input(
        z
          .object({
            applicationId: z.string().uuid(),
            approvedAmount: z.number().positive().finite().optional(),
            approvedPaybackMonths: z.number().int().positive().optional(),
            commandId,
            expectedState: z.enum(["submitted", "under_review"]),
            notes: evidence.optional(),
            status: z.enum(["approved", "rejected", "under_review"]),
          })
          .superRefine((input, ctx) => {
            if (input.status !== "under_review" && !input.notes) {
              ctx.addIssue({
                code: "custom",
                message: "Review evidence is required for a final decision.",
                path: ["notes"],
              })
            }
            if (
              input.status === "approved" &&
              (!input.approvedAmount || !input.approvedPaybackMonths)
            ) {
              ctx.addIssue({
                code: "custom",
                message: "Approved amount and payback months are required.",
                path: ["approvedAmount"],
              })
            }
          })
      )
      .mutation(({ ctx, input }) =>
        reviewMobileAdminFoodPurchaseApplicationOperation({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
    submitAccounting: permissionProcedure("submit_food_purchase_accounting")
      .input(
        z.object({
          commandId,
          cycleId: z.string().uuid(),
          expectedState: z.enum(["accounting_rejected", "intake_closed"]),
          notes: evidence.optional(),
          operatingExpenseAmount: z.number().nonnegative().finite(),
          purchaseCostAmount: z.number().nonnegative().finite(),
          salesAmount: z.number().nonnegative().finite(),
        })
      )
      .mutation(({ ctx, input }) =>
        submitMobileAdminFoodPurchaseAccounting({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
    transitionCycle: permissionProcedure("release_food_purchase_funds")
      .input(
        z.object({
          commandId,
          cycleId: z.string().uuid(),
          expectedState: z.enum([
            "accounting_rejected",
            "draft",
            "intake_closed",
            "open",
          ]),
          notes: evidence.optional(),
          transition: z.enum([
            "cancel",
            "close_intake",
            "open_intake",
            "reopen_intake",
          ]),
        })
      )
      .mutation(({ ctx, input }) =>
        transitionMobileAdminFoodPurchaseCycle({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
    workspace: permissionProcedure("view_admin_work_queue")
      .input(
        z.object({
          cursor: z.string().max(2_000).optional(),
          cycleId: z.string().uuid().optional(),
          lane: z.enum(mobileAdminFoodPurchaseLanes),
          search: z.string().trim().max(120).optional(),
        })
      )
      .query(({ ctx, input }) => {
        const capabilities = assertMobileAdminFoodPurchaseView(
          ctx.auth.activeMembership.role
        )
        return getMobileAdminFoodPurchaseWorkspace({
          ...input,
          capabilities,
          tenantId: ctx.tenant.current.id,
        })
      }),
  }),
}
