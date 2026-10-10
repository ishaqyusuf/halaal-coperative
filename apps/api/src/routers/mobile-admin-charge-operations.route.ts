import { roleCan, type CooperativeRole } from "@halaalvest/auth"
import {
  applyMobileAdminCharge,
  chargeCollectionModeKeys,
  chargeWorkflowKeys,
  getMobileAdminChargeApplication,
  getMobileAdminChargeFormOptions,
  getMobileAdminChargeWorkspace,
  mobileAdminChargeLanes,
  reverseMobileAdminCharge,
  settleMobileAdminCharge,
  waiveMobileAdminCharge,
  type MobileAdminChargeCapabilities,
} from "@halaalvest/db"
import { z } from "zod"
import { createTRPCRouter, permissionProcedure } from "../lib.trpc"

const commandBase = {
  commandId: z.string().uuid(),
  expectedState: z.string().trim().min(1).max(160),
}

const chargePurpose = z.enum([
  "general",
  "member_share",
  "loan_fee",
  "membership_fee",
  "penalty",
])

const optionalDate = z
  .string()
  .datetime()
  .transform((value) => new Date(value))
  .nullable()
  .optional()

export function getMobileAdminChargeCapabilities(
  role: CooperativeRole
): MobileAdminChargeCapabilities {
  return {
    correct: roleCan(role, "correct_charge_operations"),
    manage: roleCan(role, "manage_charge_operations"),
    view: roleCan(role, "view_charge_operations"),
  }
}

export const mobileAdminChargeProcedures = {
  charges: createTRPCRouter({
    workspace: permissionProcedure("view_charge_operations")
      .input(
        z.object({
          cursor: z.string().trim().min(1).nullable().optional(),
          filters: z
            .object({
              collectionMode: z
                .enum(chargeCollectionModeKeys)
                .nullable()
                .optional(),
              fromDate: optionalDate,
              memberId: z.string().trim().min(1).nullable().optional(),
              purpose: chargePurpose.nullable().optional(),
              status: z
                .enum(["pending", "posted", "reversed", "waived"])
                .nullable()
                .optional(),
              toDate: optionalDate,
              workflow: z.enum(chargeWorkflowKeys).nullable().optional(),
            })
            .optional(),
          lane: z.enum(mobileAdminChargeLanes),
          search: z.string().trim().max(120).optional(),
        })
      )
      .query(({ ctx, input }) =>
        getMobileAdminChargeWorkspace({
          ...input,
          capabilities: getMobileAdminChargeCapabilities(
            ctx.auth.activeMembership.role
          ),
          tenantId: ctx.tenant.current.id,
        })
      ),
    detail: permissionProcedure("view_charge_operations")
      .input(z.object({ applicationId: z.string().trim().min(1) }))
      .query(({ ctx, input }) =>
        getMobileAdminChargeApplication({
          ...input,
          tenantId: ctx.tenant.current.id,
        })
      ),
    formOptions: permissionProcedure("view_charge_operations")
      .input(z.object({ search: z.string().trim().max(120).optional() }))
      .query(({ ctx, input }) =>
        getMobileAdminChargeFormOptions({
          ...input,
          tenantId: ctx.tenant.current.id,
        })
      ),
    applyCharge: permissionProcedure("manage_charge_operations")
      .input(
        z.object({
          ...commandBase,
          assessedAt: z
            .string()
            .datetime()
            .transform((value) => new Date(value)),
          basisAmount: z.number().positive().nullable().optional(),
          chargeDefinitionId: z.string().trim().min(1),
          expectedAmount: z.number().positive(),
          memberId: z.string().trim().min(1),
          notes: z.string().trim().max(1000).nullable().optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        applyMobileAdminCharge({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
    settle: permissionProcedure("manage_charge_operations")
      .input(
        z.object({
          ...commandBase,
          applicationId: z.string().trim().min(1),
          notes: z.string().trim().max(1000).nullable().optional(),
          paidAt: z
            .string()
            .datetime()
            .transform((value) => new Date(value)),
          reference: z.string().trim().min(3).max(160),
        })
      )
      .mutation(({ ctx, input }) =>
        settleMobileAdminCharge({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
    waive: permissionProcedure("correct_charge_operations")
      .input(
        z.object({
          ...commandBase,
          applicationId: z.string().trim().min(1),
          reason: z.string().trim().min(8).max(1000),
        })
      )
      .mutation(({ ctx, input }) =>
        waiveMobileAdminCharge({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
    reverse: permissionProcedure("correct_charge_operations")
      .input(
        z.object({
          ...commandBase,
          applicationId: z.string().trim().min(1),
          reason: z.string().trim().min(8).max(1000),
        })
      )
      .mutation(({ ctx, input }) =>
        reverseMobileAdminCharge({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
  }),
}
