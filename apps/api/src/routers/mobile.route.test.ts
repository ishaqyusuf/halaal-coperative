import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
  createSignedSessionToken,
  platformSessionScope,
} from "@halaalvest/auth"

import { buildRequestContext } from "../context"
import { createCallerFactory } from "../lib.trpc"
import { appRouter } from "./_app"

describe("mobileRouter", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL
  const createCaller = createCallerFactory(appRouter)

  beforeAll(() => {
    delete process.env.DATABASE_URL
  })

  afterAll(() => {
    if (originalDatabaseUrl) {
      process.env.DATABASE_URL = originalDatabaseUrl
    }
  })

  async function createMobileCaller(input: {
    membershipId: string
    tenantId?: string
    userId?: string
  }) {
    const token = await createSignedSessionToken({
      membershipId: input.membershipId,
      scope: platformSessionScope,
      tenantId: input.tenantId ?? "tenant-amanah-demo",
      userId: input.userId ?? "user-tenant-admin-amanah",
    })
    const context = await buildRequestContext(
      new Headers({
        authorization: `Bearer ${token}`,
        host: "api.halaalvest.localhost",
      })
    )

    return createCaller(context)
  }

  test("returns member home for the active member workspace", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    const home = await caller.mobile.member.home()

    expect(home.readiness.status).toBe("missing_profile")
    expect(home.member).toBeNull()
    expect(home.stats.map((stat) => stat.key)).toEqual([
      "commitment",
      "savings",
      "financing",
    ])
  })

  test("rejects member home when the active workspace is staff", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    await expect(caller.mobile.member.home()).rejects.toThrow(
      "Switch to the member workspace"
    )
  })

  test("returns admin overview for staff workspaces", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin",
    })

    const overview = await caller.mobile.admin.overview()

    expect(overview.stats.map((stat) => stat.key)).toEqual([
      "deployable-funds",
      "collection-coverage",
      "action-queue",
    ])
    expect(overview.generatedAt).toEqual(expect.any(String))
  })

  test("rejects admin overview from the member workspace", async () => {
    const caller = await createMobileCaller({
      membershipId: "membership-amanah-admin-member",
    })

    await expect(caller.mobile.admin.overview()).rejects.toThrow(
      "This action requires operations_officer role or above."
    )
  })
})
