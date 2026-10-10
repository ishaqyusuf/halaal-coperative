import {
  getTenantOperationProfile,
  getTenantSubscriptionSnapshot,
  SubscriptionEntitlementError,
  tenantServiceAccessModes,
  tenantServiceKeys,
  updateTenantOperationProfileService,
  type TenantOperationProfileReadModel,
  type TenantServiceAccessMode,
} from "@halaalvest/db"
import { z } from "zod"

import { createTRPCRouter, permissionProcedure } from "../lib.trpc"

const updateServiceInput = z.object({
  changeReason: z.string().trim().max(1000).optional(),
  expectedAccessMode: z.enum(tenantServiceAccessModes),
  nextAccessMode: z.enum(tenantServiceAccessModes),
  serviceKey: z.enum(tenantServiceKeys),
})

export function resolveEffectiveOperationProfileAccessMode(input: {
  configuredAccessMode: TenantServiceAccessMode
  subscriptionAccessEnabled: boolean
}): TenantServiceAccessMode {
  if (input.subscriptionAccessEnabled) return input.configuredAccessMode
  return input.configuredAccessMode === "disabled" ? "disabled" : "read_only"
}

function buildMobileOperationProfileSnapshot(input: {
  profile: TenantOperationProfileReadModel
  subscription: Awaited<ReturnType<typeof getTenantSubscriptionSnapshot>>
  tenantName: string
}) {
  return {
    policy: input.profile.policy,
    reviewedAt: input.profile.reviewedAt?.toISOString() ?? null,
    reviewedByUserId: input.profile.reviewedByUserId,
    services: tenantServiceKeys.map((serviceKey) => {
      const configured = input.profile.services[serviceKey]
      const effectiveAccessMode = resolveEffectiveOperationProfileAccessMode({
        configuredAccessMode: configured.accessMode,
        subscriptionAccessEnabled: input.subscription.enforcement.accessEnabled,
      })

      return {
        ...configured,
        effectiveAccessMode,
        effectiveCanMemberCreate:
          input.subscription.enforcement.accessEnabled &&
          configured.canMemberCreate,
        effectiveCanStaffCreate:
          input.subscription.enforcement.accessEnabled &&
          configured.canStaffCreate,
      }
    }),
    subscription: {
      accessEnabled: input.subscription.enforcement.accessEnabled,
      planCode: input.subscription.plan.code,
      planName: input.subscription.plan.displayName,
      reason: input.subscription.enforcement.reason,
      status: input.subscription.status,
    },
    tenant: {
      id: input.profile.tenantId,
      name: input.tenantName,
    },
    updatedAt: new Date().toISOString(),
  }
}

export const mobileOperationProfileProcedures = {
  operationProfile: createTRPCRouter({
    overview: permissionProcedure("manage_operation_profile").query(
      async ({ ctx }) => {
        const [profile, subscription] = await Promise.all([
          getTenantOperationProfile(ctx.tenant.current.id),
          getTenantSubscriptionSnapshot({ tenantId: ctx.tenant.current.id }),
        ])

        return buildMobileOperationProfileSnapshot({
          profile,
          subscription,
          tenantName: ctx.tenant.current.name,
        })
      }
    ),
    updateService: permissionProcedure("manage_operation_profile")
      .input(updateServiceInput)
      .mutation(async ({ ctx, input }) => {
        const subscription = await getTenantSubscriptionSnapshot({
          tenantId: ctx.tenant.current.id,
        })

        if (!subscription.enforcement.accessEnabled) {
          throw new SubscriptionEntitlementError(
            subscription.enforcement.reason ??
              "operation_profile_changes_not_entitled",
            "Operation Profile changes are unavailable while subscription access is restricted."
          )
        }

        const profile = await updateTenantOperationProfileService({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })

        return buildMobileOperationProfileSnapshot({
          profile,
          subscription,
          tenantName: ctx.tenant.current.name,
        })
      }),
  }),
}
