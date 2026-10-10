import { roleCan, type CooperativeRole } from "@halaalvest/auth"
import {
  activateMobileAdminProjectFinancing,
  getMobileAdminProjectFinancingDetail,
  getMobileAdminProjectFinancingWorkspace,
  mobileAdminProjectFinancingLanes,
  recordMobileAdminProjectFinancingDisbursement,
  reviewMobileAdminProjectFinancingOperation,
  type MobileAdminProjectFinancingCapabilities,
} from "@halaalvest/db"
import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { createTRPCRouter, permissionProcedure } from "../lib.trpc"

const commandId = z.string().uuid()
const evidence = z.string().trim().min(2).max(2_000)
const structure = z.enum([
  "investment_partnership",
  "profit_sharing",
  "repayable_facility",
])

export function getMobileAdminProjectFinancingCapabilities(
  role: CooperativeRole
): MobileAdminProjectFinancingCapabilities {
  const canOperate = roleCan(role, "review_project_financing")
  return {
    activate: canOperate,
    recordDisbursement: canOperate,
    review: canOperate,
    view: roleCan(role, "view_admin_work_queue"),
  }
}

function assertMobileAdminProjectFinancingView(role: CooperativeRole) {
  const capabilities = getMobileAdminProjectFinancingCapabilities(role)
  if (!capabilities.view) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Project financing operations access is required.",
    })
  }
  return capabilities
}

export const mobileAdminProjectFinancingOperationsProcedures = {
  projectFinancingOperations: createTRPCRouter({
    activate: permissionProcedure("review_project_financing")
      .input(
        z.object({
          commandId,
          expectedState: z.literal("approved"),
          notes: evidence,
          projectFinancingRequestId: z.string().uuid(),
        })
      )
      .mutation(({ ctx, input }) =>
        activateMobileAdminProjectFinancing({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
    detail: permissionProcedure("view_admin_work_queue")
      .input(z.object({ projectFinancingRequestId: z.string().uuid() }))
      .query(({ ctx, input }) => {
        const capabilities = assertMobileAdminProjectFinancingView(
          ctx.auth.activeMembership.role
        )
        return getMobileAdminProjectFinancingDetail({
          ...input,
          capabilities,
          tenantId: ctx.tenant.current.id,
        })
      }),
    recordDisbursement: permissionProcedure("review_project_financing")
      .input(
        z.object({
          commandId,
          disbursedAt: z.string().date(),
          expectedState: z.literal("active"),
          notes: evidence.optional(),
          projectFinancingRequestId: z.string().uuid(),
          reference: z.string().trim().min(2).max(160),
        })
      )
      .mutation(({ ctx, input }) =>
        recordMobileAdminProjectFinancingDisbursement({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
    review: permissionProcedure("review_project_financing")
      .input(
        z
          .object({
            approvedAmount: z.number().positive().finite().optional(),
            approvedPaybackMonths: z.number().int().positive().optional(),
            approvedStructure: structure.optional(),
            commandId,
            expectedState: z.enum(["submitted", "under_review"]),
            notes: evidence.optional(),
            projectFinancingRequestId: z.string().uuid(),
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
              (!input.approvedAmount || !input.approvedStructure)
            ) {
              ctx.addIssue({
                code: "custom",
                message: "Approved amount and structure are required.",
                path: ["approvedAmount"],
              })
            }
            if (
              input.status === "approved" &&
              input.approvedStructure === "repayable_facility" &&
              !input.approvedPaybackMonths
            ) {
              ctx.addIssue({
                code: "custom",
                message: "Repayable facilities require an approved term.",
                path: ["approvedPaybackMonths"],
              })
            }
            if (
              input.approvedStructure &&
              input.approvedStructure !== "repayable_facility" &&
              input.approvedPaybackMonths
            ) {
              ctx.addIssue({
                code: "custom",
                message: "Only repayable facilities can have a payback term.",
                path: ["approvedPaybackMonths"],
              })
            }
          })
      )
      .mutation(({ ctx, input }) =>
        reviewMobileAdminProjectFinancingOperation({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
    workspace: permissionProcedure("view_admin_work_queue")
      .input(
        z.object({
          cursor: z.string().max(2_000).optional(),
          lane: z.enum(mobileAdminProjectFinancingLanes),
          search: z.string().trim().max(120).optional(),
        })
      )
      .query(({ ctx, input }) => {
        const capabilities = assertMobileAdminProjectFinancingView(
          ctx.auth.activeMembership.role
        )
        return getMobileAdminProjectFinancingWorkspace({
          ...input,
          capabilities,
          tenantId: ctx.tenant.current.id,
        })
      }),
  }),
}
