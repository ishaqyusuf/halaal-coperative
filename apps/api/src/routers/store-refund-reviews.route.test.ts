import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
  createSignedSessionToken,
  platformSessionScope,
} from "@halaalvest/auth"
import { buildRequestContext } from "../context"
import { createCallerFactory } from "../lib.trpc"
import { storeRefundReviewsRouter } from "./store-refund-reviews.route"

describe("store refund-review API authorization", () => {
  const databaseUrl = process.env.HALAALVEST_DATABASE_URL
  beforeAll(() => {
    delete process.env.HALAALVEST_DATABASE_URL
  })
  afterAll(() => {
    if (databaseUrl) process.env.HALAALVEST_DATABASE_URL = databaseUrl
  })

  test("rejects unauthenticated and non-platform-owner queue reads", async () => {
    const headers = new Headers({ host: "api.halaalvest.localhost" })
    const factory = createCallerFactory(storeRefundReviewsRouter)
    const anonymous = factory(await buildRequestContext(headers))
    await expect(anonymous.queue({})).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    })

    const token = await createSignedSessionToken({
      membershipId: "membership-amanah-admin-member",
      scope: platformSessionScope,
      tenantId: "tenant-amanah-demo",
      userId: "user-tenant-admin-amanah",
    })
    headers.set("authorization", `Bearer ${token}`)
    const tenantAdmin = factory(await buildRequestContext(headers))
    await expect(tenantAdmin.queue({})).rejects.toMatchObject({
      code: "FORBIDDEN",
    })
  })
})
