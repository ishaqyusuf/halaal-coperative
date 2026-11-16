import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
  createSignedSessionToken,
  platformSessionScope,
} from "@halaalvest/auth"

import { buildRequestContext } from "../context"
import { createCallerFactory } from "../lib.trpc"
import { appRouter } from "./_app"
import { tenantServiceKeys } from "@halaalvest/db"
import {
  buildMobileOperationProfileSnapshot,
  MOBILE_OPERATION_PROFILE_SUBSCRIPTION,
} from "./mobile-operation-profile.route"

describe("mobile Operation Profile route", () => {
  const originalDatabaseUrl = process.env.HALAALVEST_DATABASE_URL
  const createCaller = createCallerFactory(appRouter)

  beforeAll(() => {
    delete process.env.HALAALVEST_DATABASE_URL
  })

  afterAll(() => {
    if (originalDatabaseUrl) {
      process.env.HALAALVEST_DATABASE_URL = originalDatabaseUrl
    }
  })

  async function callerFor(input: { membershipId: string; userId: string }) {
    const token = await createSignedSessionToken({
      membershipId: input.membershipId,
      scope: platformSessionScope,
      tenantId: "tenant-amanah-demo",
      userId: input.userId,
    })
    const context = await buildRequestContext(
      new Headers({
        authorization: `Bearer ${token}`,
        host: "api.halaalvest.localhost",
      })
    )
    return createCaller(context)
  }

  const accessModes = [
    "disabled",
    "office_only",
    "member_self_service",
    "read_only",
  ] as const

  function profileWith(
    accessMode: (typeof accessModes)[number]
  ): Parameters<typeof buildMobileOperationProfileSnapshot>[0]["profile"] {
    return {
      policy: {
        foodPurchaseMaximumActiveObligationsPerMember: 1,
        foodPurchaseRequiresOpenCycle: true,
        procurementMaximumActiveObligationsPerMember: 1,
      },
      reviewedAt: null,
      reviewedByUserId: null,
      services: Object.fromEntries(
        tenantServiceKeys.map((serviceKey) => [
          serviceKey,
          {
            accessMode,
            canMemberCreate: accessMode === "member_self_service",
            canSettleExisting: true,
            canStaffCreate:
              accessMode === "office_only" ||
              accessMode === "member_self_service",
            canViewExisting: true,
            serviceKey,
            shouldShowInMemberNav: accessMode === "member_self_service",
            shouldShowInStaffNav: accessMode !== "disabled",
          },
        ])
      ) as never,
      tenantId: "tenant-amanah-demo",
    }
  }

  test("effective access always equals the configured access (no plan gate)", () => {
    for (const accessMode of accessModes) {
      const snapshot = buildMobileOperationProfileSnapshot({
        profile: profileWith(accessMode),
        tenantName: "Amanah",
      })

      for (const service of snapshot.services) {
        expect(service.effectiveAccessMode).toBe(accessMode)
        expect(service.effectiveCanMemberCreate).toBe(service.canMemberCreate)
        expect(service.effectiveCanStaffCreate).toBe(service.canStaffCreate)
      }
    }
  })

  test("keeps an always-allowed subscription block for installed mobile builds", () => {
    const snapshot = buildMobileOperationProfileSnapshot({
      profile: profileWith("office_only"),
      tenantName: "Amanah",
    })

    expect(snapshot.subscription).toEqual(MOBILE_OPERATION_PROFILE_SUBSCRIPTION)
    expect(snapshot.subscription).toEqual({
      accessEnabled: true,
      planCode: "halaalvest",
      planName: "Halaalvest",
      reason: null,
      status: "active",
    })
  })

  test("does not disclose Operation Profile settings to member workspaces", async () => {
    const caller = await callerFor({
      membershipId: "membership-amanah-admin-member",
      userId: "user-tenant-admin-amanah",
    })

    await expect(
      caller.mobile.admin.operationProfile.overview()
    ).rejects.toThrow("permission")
  })

  test("validates service update modes before database access", async () => {
    const caller = await callerFor({
      membershipId: "membership-amanah-admin",
      userId: "user-tenant-admin-amanah",
    })

    await expect(
      caller.mobile.admin.operationProfile.updateService({
        expectedAccessMode: "office_only",
        nextAccessMode: "invalid" as never,
        serviceKey: "procurement",
      })
    ).rejects.toThrow()
  })
})
