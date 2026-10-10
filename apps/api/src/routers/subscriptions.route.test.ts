import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
  createSignedSessionToken,
  platformSessionScope,
} from "@halaalvest/auth"

import { buildRequestContext } from "../context"
import { createCallerFactory } from "../lib.trpc"
import { appRouter } from "./_app"

describe("subscriptionsRouter", () => {
  const originalDatabaseUrl = process.env.HALAALVEST_DATABASE_URL
  const createCaller = createCallerFactory(appRouter)

  beforeAll(() => {
    delete process.env.HALAALVEST_DATABASE_URL
  })

  afterAll(() => {
    if (originalDatabaseUrl)
      process.env.HALAALVEST_DATABASE_URL = originalDatabaseUrl
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

  test("returns an explicit tenant-scoped fail-safe snapshot to an admin", async () => {
    const caller = await callerFor({
      membershipId: "membership-amanah-admin",
      userId: "user-tenant-admin-amanah",
    })

    const snapshot = await caller.subscriptions.snapshot()

    expect(snapshot.tenantId).toBe("tenant-amanah-demo")
    expect(snapshot.sourceState.fallbackApplied).toBe(true)
    expect(snapshot.enforcement.canActivateMember).toBe(false)
    expect(snapshot.enforcement.memberLoginEnabled).toBe(false)
    expect(snapshot.enforcement.reason).toBe(
      "billing_infrastructure_unavailable"
    )
    expect(snapshot.invoices).toEqual([])
  })

  test("does not disclose subscription commercial data to members", async () => {
    const caller = await callerFor({
      membershipId: "membership-amanah-admin-member",
      userId: "user-tenant-admin-amanah",
    })

    await expect(caller.subscriptions.snapshot()).rejects.toThrow(
      "Subscription administration access is required"
    )
  })
})
