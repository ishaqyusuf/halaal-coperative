import { roleCan, type CooperativeRole } from "@halaalvest/auth"
import {
  activateMobileAdminProcurementPurchase,
  getMobileAdminProcurementDetail,
  getMobileAdminProcurementWorkspace,
  mobileAdminProcurementLanes,
  reviewMobileAdminProcurementOperation,
  submitMobileAdminProcurementPayment,
  type MobileAdminProcurementCapabilities,
} from "@halaalvest/db"
import { z } from "zod"
import { createTRPCRouter, permissionProcedure } from "../lib.trpc"

const commandId = z.string().uuid()
const dateOnly = z.string().date()
const evidence = z.string().trim().min(2).max(2_000)

export function getMobileAdminProcurementCapabilities(
  role: CooperativeRole
): MobileAdminProcurementCapabilities {
  return {
    activate: roleCan(role, "review_procurement"),
    review: roleCan(role, "review_procurement"),
    submitPayment: roleCan(role, "review_receipts"),
    view: roleCan(role, "view_admin_work_queue"),
  }
}

export const mobileAdminProcurementOperationsProcedures = {
  procurementOperations: createTRPCRouter({
    activate: permissionProcedure("review_procurement")
      .input(
        z
          .object({
            commandId,
            expectedState: z.literal("approved"),
            firstDueDate: dateOnly,
            procurementRequestId: z.string().uuid(),
            purchaseDate: dateOnly,
            purchaseNotes: evidence.optional(),
            purchaseReference: z.string().trim().min(2).max(120),
          })
          .superRefine((input, ctx) => {
            if (input.firstDueDate < input.purchaseDate) {
              ctx.addIssue({
                code: "custom",
                message:
                  "First due date cannot be before the purchase date.",
                path: ["firstDueDate"],
              })
            }
          })
      )
      .mutation(({ ctx, input }) =>
        activateMobileAdminProcurementPurchase({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
    detail: permissionProcedure("view_admin_work_queue")
      .input(z.object({ procurementRequestId: z.string().uuid() }))
      .query(({ ctx, input }) =>
        getMobileAdminProcurementDetail({
          ...input,
          tenantId: ctx.tenant.current.id,
        })
      ),
    review: permissionProcedure("review_procurement")
      .input(
        z
          .object({
            approvedCost: z.number().positive().finite().optional(),
            approvedRepaymentMonths: z.number().int().positive().optional(),
            commandId,
            expectedState: z.enum(["submitted", "under_review"]),
            notes: evidence.optional(),
            procurementRequestId: z.string().uuid(),
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
          })
      )
      .mutation(({ ctx, input }) =>
        reviewMobileAdminProcurementOperation({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
    submitPayment: permissionProcedure("review_receipts")
      .input(
        z.object({
          amount: z.number().positive().finite().max(1_000_000_000),
          commandId,
          expectedState: z.enum([
            "due",
            "overdue",
            "partially_paid",
            "pending",
          ]),
          memberId: z.string().uuid(),
          notes: evidence.optional(),
          paidAt: dateOnly,
          paymentReference: z.string().trim().min(2).max(120),
          procurementRepaymentScheduleItemId: z.string().uuid(),
        })
      )
      .mutation(({ ctx, input }) =>
        submitMobileAdminProcurementPayment({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
    workspace: permissionProcedure("view_admin_work_queue")
      .input(
        z.object({
          lane: z.enum(mobileAdminProcurementLanes),
          search: z.string().trim().max(120).optional(),
        })
      )
      .query(({ ctx, input }) =>
        getMobileAdminProcurementWorkspace({
          ...input,
          capabilities: getMobileAdminProcurementCapabilities(
            ctx.auth.activeMembership.role
          ),
          tenantId: ctx.tenant.current.id,
        })
      ),
  }),
}
