import { roleCan, type CooperativeRole } from "@halaalvest/auth"
import {
  approveMobileAdminProfitEntry,
  getMobileAdminProfitPeriodDetail,
  getMobileAdminShareApplicationDetail,
  getMobileAdminShareProfitWorkspace,
  mobileAdminShareProfitBooks,
  publishMobileAdminProfitEntry,
  reviewMobileAdminShareApplication,
  type MobileAdminShareProfitCapabilities,
} from "@halaalvest/db"
import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { createTRPCRouter, permissionProcedure } from "../lib.trpc"

const commandId = z.string().uuid()
const evidence = z.string().trim().min(2).max(2_000)

export function getMobileAdminShareProfitCapabilities(
  role: CooperativeRole
): MobileAdminShareProfitCapabilities {
  return {
    approveProfit: roleCan(role, "approve_profit_distribution"),
    publishProfit: roleCan(role, "publish_profit_distribution"),
    reviewShares: roleCan(role, "review_share_request"),
    view: roleCan(role, "view_share_profit_governance"),
  }
}

function assertView(role: CooperativeRole) {
  const capabilities = getMobileAdminShareProfitCapabilities(role)
  if (!capabilities.view) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Share and profit governance access is required.",
    })
  }
  return capabilities
}

export const mobileAdminShareProfitGovernanceProcedures = {
  shareProfitGovernance: createTRPCRouter({
    approveProfit: permissionProcedure("approve_profit_distribution")
      .input(
        z.object({
          commandId,
          expectedState: z.literal("reviewed"),
          notes: evidence,
          profitEntryId: z.string().uuid(),
        })
      )
      .mutation(({ ctx, input }) =>
        approveMobileAdminProfitEntry({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
    profitDetail: permissionProcedure("view_share_profit_governance")
      .input(z.object({ dividendPeriodId: z.string().uuid() }))
      .query(({ ctx, input }) =>
        getMobileAdminProfitPeriodDetail({
          ...input,
          capabilities: assertView(ctx.auth.activeMembership.role),
          tenantId: ctx.tenant.current.id,
        })
      ),
    publishProfit: permissionProcedure("publish_profit_distribution")
      .input(
        z.object({
          commandId,
          expectedState: z.literal("approved"),
          profitEntryId: z.string().uuid(),
        })
      )
      .mutation(({ ctx, input }) =>
        publishMobileAdminProfitEntry({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
    reviewShare: permissionProcedure("review_share_request")
      .input(
        z
          .object({
            approvedUnits: z.number().int().positive().optional(),
            commandId,
            decision: z.enum(["approved", "rejected"]),
            expectedState: z.literal("pending"),
            memberShareApplicationId: z.string().uuid(),
            reviewNotes: evidence,
          })
          .superRefine((input, ctx) => {
            if (input.decision === "approved" && !input.approvedUnits) {
              ctx.addIssue({
                code: "custom",
                message: "Approved units are required for approval.",
                path: ["approvedUnits"],
              })
            }
            if (input.decision === "rejected" && input.approvedUnits) {
              ctx.addIssue({
                code: "custom",
                message: "Rejected applications cannot approve units.",
                path: ["approvedUnits"],
              })
            }
          })
      )
      .mutation(({ ctx, input }) =>
        reviewMobileAdminShareApplication({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
    shareDetail: permissionProcedure("view_share_profit_governance")
      .input(z.object({ memberShareApplicationId: z.string().uuid() }))
      .query(({ ctx, input }) =>
        getMobileAdminShareApplicationDetail({
          ...input,
          capabilities: assertView(ctx.auth.activeMembership.role),
          tenantId: ctx.tenant.current.id,
        })
      ),
    workspace: permissionProcedure("view_share_profit_governance")
      .input(
        z.object({
          book: z.enum(mobileAdminShareProfitBooks),
          cursor: z.string().uuid().optional(),
          search: z.string().trim().max(120).optional(),
        })
      )
      .query(({ ctx, input }) =>
        getMobileAdminShareProfitWorkspace({
          ...input,
          capabilities: assertView(ctx.auth.activeMembership.role),
          tenantId: ctx.tenant.current.id,
        })
      ),
  }),
}
