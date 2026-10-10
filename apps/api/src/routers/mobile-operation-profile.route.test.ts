import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
  createSignedSessionToken,
  platformSessionScope,
} from "@halaalvest/auth"

import { buildRequestContext } from "../context"
import { createCallerFactory } from "../lib.trpc"
import { appRouter } from "./_app"
import { resolveEffectiveOperationProfileAccessMode } from "./mobile-operation-profile.route"

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

  test("keeps configured access when subscription access is enabled", () => {
    for (const configuredAccessMode of [
      "disabled",
      "office_only",
      "member_self_service",
      "read_only",
    ] as const) {
      expect(
        resolveEffectiveOperationProfileAccessMode({
          configuredAccessMode,
          subscriptionAccessEnabled: true,
        })
      ).toBe(configuredAccessMode)
    }
  })

  test("uses the stricter read-only subscription mode without hiding disabled services", () => {
    expect(
      resolveEffectiveOperationProfileAccessMode({
        configuredAccessMode: "disabled",
        subscriptionAccessEnabled: false,
      })
    ).toBe("disabled")

    for (const configuredAccessMode of [
      "office_only",
      "member_self_service",
      "read_only",
    ] as const) {
      expect(
        resolveEffectiveOperationProfileAccessMode({
          configuredAccessMode,
          subscriptionAccessEnabled: false,
        })
      ).toBe("read_only")
    }
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
