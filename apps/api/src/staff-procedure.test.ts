import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
  createSignedSessionToken,
  platformSessionScope,
} from "@halaalvest/auth"
import { buildRequestContext } from "./context"
import {
  createCallerFactory,
  createTRPCRouter,
  staffProcedure,
} from "./lib.trpc"

const router = createTRPCRouter({
  tenantWide: staffProcedure.query(() => "cooperative numbers"),
})
const caller = createCallerFactory(router)

describe("staffProcedure", () => {
  const prior = process.env.HALAALVEST_DATABASE_URL
  beforeAll(() => {
    delete process.env.HALAALVEST_DATABASE_URL
  })
  afterAll(() => {
    if (prior) process.env.HALAALVEST_DATABASE_URL = prior
  })

  async function context(input: {
    membershipId: string
    tenantId: string
    userId: string
  }) {
    const token = await createSignedSessionToken({
      ...input,
      scope: platformSessionScope,
    })

    return buildRequestContext(
      new Headers({
        authorization: `Bearer ${token}`,
        host: "api.halaalvest.localhost",
      })
    )
  }

  test("lets cooperative staff read tenant-wide data", async () => {
    const admin = caller(
      await context({
        membershipId: "membership-amanah-admin",
        tenantId: "tenant-amanah-demo",
        userId: "user-tenant-admin-amanah",
      })
    )
    const finance = caller(
      await context({
        membershipId: "membership-barakah-finance",
        tenantId: "tenant-barakah-demo",
        userId: "user-finance-barakah",
      })
    )

    expect(await admin.tenantWide()).toBe("cooperative numbers")
    expect(await finance.tenantWide()).toBe("cooperative numbers")
  })

  test("refuses a member", async () => {
    const member = caller(
      await context({
        membershipId: "membership-amanah-admin-member",
        tenantId: "tenant-amanah-demo",
        userId: "user-tenant-admin-amanah",
      })
    )

    await expect(member.tenantWide()).rejects.toMatchObject({
      code: "FORBIDDEN",
    })
  })
})
