import {
  getTenantOperationProfile,
  tenantServiceAccessModes,
  tenantServiceKeys,
  updateTenantOperationProfileService,
  type TenantOperationProfileReadModel,
} from "@halaalvest/db"
import { z } from "zod"

import { createTRPCRouter, permissionProcedure } from "../lib.trpc"

const updateServiceInput = z.object({
  changeReason: z.string().trim().max(1000).optional(),
  expectedAccessMode: z.enum(tenantServiceAccessModes),
  nextAccessMode: z.enum(tenantServiceAccessModes),
  serviceKey: z.enum(tenantServiceKeys),
})

/**
 * Triage 2.8 retired the old tenant plan, so no subscription state limits a
 * service: the effective access is always what the cooperative configured.
 * `subscription` stays in the response, always allowed, because installed
 * mobile builds still read `subscription.accessEnabled` before allowing edits.
 */
export const MOBILE_OPERATION_PROFILE_SUBSCRIPTION = {
  accessEnabled: true,
  planCode: "halaalvest",
  planName: "Halaalvest",
  reason: null,
  status: "active",
} as const

export function buildMobileOperationProfileSnapshot(input: {
  now?: Date
  profile: TenantOperationProfileReadModel
  tenantName: string
}) {
  return {
    policy: input.profile.policy,
    reviewedAt: input.profile.reviewedAt?.toISOString() ?? null,
    reviewedByUserId: input.profile.reviewedByUserId,
    services: tenantServiceKeys.map((serviceKey) => {
      const configured = input.profile.services[serviceKey]

      return {
        ...configured,
        effectiveAccessMode: configured.accessMode,
        effectiveCanMemberCreate: configured.canMemberCreate,
        effectiveCanStaffCreate: configured.canStaffCreate,
      }
    }),
    subscription: MOBILE_OPERATION_PROFILE_SUBSCRIPTION,
    tenant: {
      id: input.profile.tenantId,
      name: input.tenantName,
    },
    updatedAt: (input.now ?? new Date()).toISOString(),
  }
}

export const mobileOperationProfileProcedures = {
  operationProfile: createTRPCRouter({
    overview: permissionProcedure("manage_operation_profile").query(
      async ({ ctx }) => {
        const profile = await getTenantOperationProfile(ctx.tenant.current.id)

        return buildMobileOperationProfileSnapshot({
          profile,
          tenantName: ctx.tenant.current.name,
        })
      }
    ),
    updateService: permissionProcedure("manage_operation_profile")
      .input(updateServiceInput)
      .mutation(async ({ ctx, input }) => {
        const profile = await updateTenantOperationProfileService({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })

        return buildMobileOperationProfileSnapshot({
          profile,
          tenantName: ctx.tenant.current.name,
        })
      }),
  }),
}
