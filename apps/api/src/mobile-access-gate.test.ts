import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
  createSignedSessionToken,
  platformSessionScope,
} from "@halaalvest/auth"
import { buildRequestContext } from "./context"
import {
  createCallerFactory,
  createTRPCRouter,
  mobileAccessPathAllowed,
  publicProcedure,
} from "./lib.trpc"

const router = createTRPCRouter({
  ordinary: publicProcedure.query(() => "dashboard data"),
  support: createTRPCRouter({
    contact: publicProcedure.query(() => "support available"),
  }),
})
const caller = createCallerFactory(router)

describe("personal mobile access boundary", () => {
  const prior = process.env.HALAALVEST_DATABASE_URL
  beforeAll(() => {
    delete process.env.HALAALVEST_DATABASE_URL
  })
  afterAll(() => {
    if (prior) process.env.HALAALVEST_DATABASE_URL = prior
  })

  async function context(sessionKind?: "mobile", mobileHeader = false) {
    const token = await createSignedSessionToken({
      membershipId: "membership-amanah-admin",
      scope: platformSessionScope,
      ...(sessionKind ? { sessionKind } : {}),
      tenantId: "tenant-amanah-demo",
      userId: "user-tenant-admin-amanah",
    })
    return buildRequestContext(
      new Headers({
        authorization: `Bearer ${token}`,
        host: "api.halaalvest.localhost",
        ...(sessionKind
          ? { "x-mobile-device-id": "mobile-personal-access-test" }
          : {}),
        ...(mobileHeader ? { "x-trpc-source": "mobile" } : {}),
      })
    )
  }

  test("locks normal mobile procedures even if the source header is omitted", async () => {
    for (const header of [false, true]) {
      const mobile = caller(await context("mobile", header))
      await expect(mobile.ordinary()).rejects.toMatchObject({
        code: "FORBIDDEN",
      })
      expect(await mobile.support.contact()).toBe("support available")
    }
  })

  test("keeps free web procedures outside the mobile subscription gate", async () => {
    const web = caller(await context())
    expect(await web.ordinary()).toBe("dashboard data")
  })

  test("keeps only named recovery and legal paths open", () => {
    expect(mobileAccessPathAllowed("mobileAppAccess.verifyPurchase")).toBe(true)
    expect(mobileAccessPathAllowed("auth.mobile.signOut")).toBe(true)
    expect(mobileAccessPathAllowed("accountPrivacy.requestDeletion")).toBe(true)
    expect(mobileAccessPathAllowed("mobile.member.support.create")).toBe(true)
    expect(mobileAccessPathAllowed("mobile.member.financing.create")).toBe(
      false
    )
    expect(mobileAccessPathAllowed("subscriptions.verifyStorePurchase")).toBe(
      false
    )
  })
})
