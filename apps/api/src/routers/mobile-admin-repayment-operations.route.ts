import { roleCan, type CooperativeRole } from "@halaalvest/auth"
import {
  getMobileAdminRepaymentFacility,
  getMobileAdminRepaymentWorkspace,
  mobileAdminRepaymentLanes,
  postMobileAdminRepayment,
  recordMobileAdminCollectionFollowUp,
  type MobileAdminRepaymentCapabilities,
} from "@halaalvest/db"
import { z } from "zod"
import { createTRPCRouter, permissionProcedure } from "../lib.trpc"

const commandId = z.string().uuid()
const dateOnly = z.string().date()

export function getMobileAdminRepaymentCapabilities(
  role: CooperativeRole
): MobileAdminRepaymentCapabilities {
  return {
    followUp: roleCan(role, "record_collection_follow_up"),
    post: roleCan(role, "review_financing"),
    view: roleCan(role, "view_admin_work_queue"),
  }
}

export const mobileAdminRepaymentOperationsProcedures = {
  repaymentOperations: createTRPCRouter({
    facility: permissionProcedure("view_admin_work_queue")
      .input(z.object({ loanId: z.string().uuid() }))
      .query(({ ctx, input }) =>
        getMobileAdminRepaymentFacility({
          loanId: input.loanId,
          tenantId: ctx.tenant.current.id,
        })
      ),
    workspace: permissionProcedure("view_admin_work_queue")
      .input(
        z.object({
          lane: z.enum(mobileAdminRepaymentLanes),
          cursor: z.string().min(1).max(1024).nullable().optional(),
          search: z.string().trim().max(120).optional(),
        })
      )
      .query(({ ctx, input }) =>
        getMobileAdminRepaymentWorkspace({
          ...input,
          capabilities: getMobileAdminRepaymentCapabilities(
            ctx.auth.activeMembership.role
          ),
          tenantId: ctx.tenant.current.id,
        })
      ),
    post: permissionProcedure("review_financing")
      .input(
        z.object({
          amount: z.number().positive().finite().max(1_000_000_000),
          commandId,
          expectedOutstandingPrincipal: z.number().nonnegative().finite(),
          expectedState: z.enum(["active", "disbursed"]),
          loanId: z.string().uuid(),
          paidAt: dateOnly,
          reference: z.string().trim().min(2).max(120),
        })
      )
      .mutation(({ ctx, input }) =>
        postMobileAdminRepayment({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
    recordFollowUp: permissionProcedure("record_collection_follow_up")
      .input(
        z.object({
          caseStage: z.enum([
            "active",
            "escalated",
            "promise_tracking",
            "resolved",
          ]),
          commandId,
          expectedState: z.enum([
            "due",
            "overdue",
            "partially_paid",
            "pending",
          ]),
          nextActionAt: dateOnly.nullable().optional(),
          note: z.string().trim().min(4).max(2_000),
          priority: z.enum(["high", "low", "normal"]),
          promiseToPayAt: dateOnly.nullable().optional(),
          repaymentScheduleItemId: z.string().uuid(),
          status: z.enum([
            "promise_to_pay",
            "reminded",
            "settled",
            "unreachable",
          ]),
        })
      )
      .mutation(({ ctx, input }) =>
        recordMobileAdminCollectionFollowUp({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
  }),
}
