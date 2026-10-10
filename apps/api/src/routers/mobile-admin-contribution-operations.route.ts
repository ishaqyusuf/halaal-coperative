import { roleCan, type CooperativeRole } from "@halaalvest/auth"
import {
  closeMobileMemberContributionPlan,
  getMobileAdminContributionBatch,
  getMobileAdminContributionMemberWorkspace,
  getMobileAdminContributionWorkspace,
  mobileAdminContributionLanes,
  postMobileCollectionSourceBatchRows,
  recordMobileMemberContributionPayment,
  setMobileMemberContributionPlan,
  stageMobileCollectionSourceBatch,
  updateMobileCollectionSourceBatchRows,
  updateMobileMemberAllocationPreference,
  type MobileAdminContributionCapabilities,
} from "@halaalvest/db"
import { z } from "zod"
import { createTRPCRouter, permissionProcedure } from "../lib.trpc"

const commandBase = {
  commandId: z.string().uuid(),
  expectedState: z.string().trim().min(1).max(160),
}

const optionalEvidence = z.string().trim().max(1000).nullable().optional()

export function getMobileAdminContributionCapabilities(
  role: CooperativeRole
): MobileAdminContributionCapabilities {
  return {
    manageBatches: roleCan(role, "manage_collection_source_batches"),
    manageMemberContributions: roleCan(role, "manage_member_contributions"),
    view: roleCan(role, "view_contribution_operations"),
  }
}

const workspaceInput = z.object({
  cursor: z.string().nullable().optional(),
  lane: z.enum(mobileAdminContributionLanes),
  search: z.string().trim().max(120).optional(),
})

const rowUpdate = z
  .object({
    exceptionReason: optionalEvidence,
    paidAmount: z.number().positive().nullable().optional(),
    rowId: z.string().trim().min(1),
    status: z.enum(["collected", "exception", "skipped", "staged"]),
  })
  .superRefine((input, ctx) => {
    if (input.status === "exception" && !input.exceptionReason) {
      ctx.addIssue({
        code: "custom",
        message: "Enter an exception reason.",
        path: ["exceptionReason"],
      })
    }
  })

export const mobileAdminContributionProcedures = {
  contributions: createTRPCRouter({
    workspace: permissionProcedure("view_contribution_operations")
      .input(workspaceInput)
      .query(({ ctx, input }) =>
        getMobileAdminContributionWorkspace({
          ...input,
          capabilities: getMobileAdminContributionCapabilities(
            ctx.auth.activeMembership.role
          ),
          tenantId: ctx.tenant.current.id,
        })
      ),
    member: permissionProcedure("view_contribution_operations")
      .input(z.object({ memberId: z.string().trim().min(1) }))
      .query(({ ctx, input }) =>
        getMobileAdminContributionMemberWorkspace({
          ...input,
          tenantId: ctx.tenant.current.id,
        })
      ),
    batch: permissionProcedure("view_contribution_operations")
      .input(z.object({ batchId: z.string().trim().min(1) }))
      .query(({ ctx, input }) =>
        getMobileAdminContributionBatch({
          ...input,
          tenantId: ctx.tenant.current.id,
        })
      ),
    setPlan: permissionProcedure("manage_member_contributions")
      .input(
        z.object({
          ...commandBase,
          amount: z.number().positive(),
          memberId: z.string().trim().min(1),
          name: z.string().trim().min(2).max(120).optional(),
          startsAt: z
            .string()
            .datetime()
            .transform((value) => new Date(value)),
        })
      )
      .mutation(({ ctx, input }) =>
        setMobileMemberContributionPlan({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
    closePlan: permissionProcedure("manage_member_contributions")
      .input(
        z.object({
          ...commandBase,
          endsAt: z
            .string()
            .datetime()
            .transform((value) => new Date(value)),
          planId: z.string().trim().min(1),
        })
      )
      .mutation(({ ctx, input }) =>
        closeMobileMemberContributionPlan({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
    updateAllocationPreference: permissionProcedure(
      "manage_member_contributions"
    )
      .input(
        z.object({
          ...commandBase,
          memberId: z.string().trim().min(1),
          preference: z.enum(["manual_split", "savings_first", "loan_first"]),
        })
      )
      .mutation(({ ctx, input }) =>
        updateMobileMemberAllocationPreference({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
    recordPayment: permissionProcedure("manage_member_contributions")
      .input(
        z.object({
          ...commandBase,
          channel: z.enum(["payroll", "transfer", "cash", "manual"]),
          committedSavingsAmount: z.number().min(0),
          contributionPlanId: z.string().trim().min(1).optional(),
          extraLoanPaymentAmount: z.number().min(0).optional(),
          extraSavingsAmount: z.number().min(0).optional(),
          loanId: z.string().trim().min(1).optional(),
          memberId: z.string().trim().min(1),
          periodLabel: z.string().trim().max(80).optional(),
          postedAt: z
            .string()
            .datetime()
            .transform((value) => new Date(value)),
          reference: z.string().trim().max(160).optional(),
          scheduledLoanServicingAmount: z.number().min(0).optional(),
          totalAmount: z.number().positive().optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        recordMobileMemberContributionPayment({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
    stageBatch: permissionProcedure("manage_collection_source_batches")
      .input(
        z.object({
          ...commandBase,
          deductionSourceId: z.string().trim().min(1),
          month: z.number().int().min(1).max(12),
          notes: optionalEvidence,
          reference: z.string().trim().max(160).nullable().optional(),
          year: z.number().int().min(2000).max(2100),
        })
      )
      .mutation(({ ctx, input }) =>
        stageMobileCollectionSourceBatch({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
    updateBatchRows: permissionProcedure("manage_collection_source_batches")
      .input(
        z.object({
          ...commandBase,
          batchId: z.string().trim().min(1),
          rows: z.array(rowUpdate).min(1).max(100),
        })
      )
      .mutation(({ ctx, input }) =>
        updateMobileCollectionSourceBatchRows({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
    postBatchRows: permissionProcedure("manage_collection_source_batches")
      .input(
        z.object({
          ...commandBase,
          batchId: z.string().trim().min(1),
          notes: optionalEvidence,
          postedAt: z
            .string()
            .datetime()
            .transform((value) => new Date(value))
            .optional(),
          reference: z.string().trim().max(160).nullable().optional(),
          rowIds: z.array(z.string().trim().min(1)).min(1).max(100),
        })
      )
      .mutation(({ ctx, input }) =>
        postMobileCollectionSourceBatchRows({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
  }),
}
