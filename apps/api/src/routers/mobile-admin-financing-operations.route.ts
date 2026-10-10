import { roleCan, type CooperativeRole } from "@halaalvest/auth"
import {
  disburseMobileAdminFinancing,
  getMobileAdminFinancingOperationsWorkspace,
  mobileAdminFinancingLanes,
  updateMobileAdminFinancingCycle,
  type MobileAdminFinancingCapabilities,
} from "@halaalvest/db"
import { z } from "zod"
import { createTRPCRouter, permissionProcedure } from "../lib.trpc"

const commandBase = {
  commandId: z.string().uuid(),
  expectedState: z.string().trim().min(1).max(80),
}

export function getMobileAdminFinancingCapabilities(
  role: CooperativeRole
): MobileAdminFinancingCapabilities {
  return {
    disburse: roleCan(role, "review_financing"),
    manageCycle: roleCan(role, "review_financing"),
    review: roleCan(role, "review_financing"),
    view: roleCan(role, "view_admin_work_queue"),
  }
}

export const mobileAdminFinancingOperationsProcedures = {
  financingOperations: createTRPCRouter({
    workspace: permissionProcedure("view_admin_work_queue")
      .input(
        z.object({
          lane: z.enum(mobileAdminFinancingLanes),
          cursor: z.string().min(1).max(1024).nullable().optional(),
          entityId: z.string().uuid().optional(),
          search: z.string().trim().max(120).optional(),
        })
      )
      .query(({ ctx, input }) =>
        getMobileAdminFinancingOperationsWorkspace({
          ...input,
          capabilities: getMobileAdminFinancingCapabilities(
            ctx.auth.activeMembership.role
          ),
          tenantId: ctx.tenant.current.id,
        })
      ),
    updateCycle: permissionProcedure("review_financing")
      .input(
        z.object({
          ...commandBase,
          expectedState: z.enum([
            "closed",
            "draft",
            "missing",
            "open",
            "paused",
          ]),
          financingCycleId: z.string().uuid().nullable().optional(),
          status: z.enum(["closed", "open", "paused"]),
          statusNote: z.string().trim().min(4).max(1000).nullable().optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        updateMobileAdminFinancingCycle({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
    disburse: permissionProcedure("review_financing")
      .input(
        z.object({
          ...commandBase,
          firstRepaymentDueAt: z.string().date().nullable().optional(),
          loanId: z.string().uuid(),
        })
      )
      .mutation(({ ctx, input }) =>
        disburseMobileAdminFinancing({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
  }),
}
