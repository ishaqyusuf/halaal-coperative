import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
  createSignedSessionToken,
  platformSessionScope,
} from "@halaalvest/auth"
import { buildRequestContext } from "../context"
import { createCallerFactory } from "../lib.trpc"
import { repaymentsRouter } from "./repayments.route"

const caller = createCallerFactory(repaymentsRouter)
const host = "api.halaalvest.localhost"

describe("repayments.postOptions", () => {
  const databaseUrl = process.env.HALAALVEST_DATABASE_URL
  beforeAll(() => {
    delete process.env.HALAALVEST_DATABASE_URL
  })
  afterAll(() => {
    if (databaseUrl) process.env.HALAALVEST_DATABASE_URL = databaseUrl
  })

  test("requires a signed-in finance role", async () => {
    const context = await buildRequestContext(new Headers({ host }))
    await expect(caller(context).postOptions()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    })
  })

  test("members and operations officers cannot read posting balances", async () => {
    const token = await createSignedSessionToken({
      membershipId: "membership-amanah-admin",
      scope: platformSessionScope,
      tenantId: "tenant-amanah-demo",
      userId: "user-tenant-admin-amanah",
    })
    const context = await buildRequestContext(
      new Headers({ authorization: `Bearer ${token}`, host })
    )
    const membership = context.auth.activeMembership
    if (!membership) throw new Error("Seeded admin has no active membership.")

    for (const role of ["member", "operations_officer"] as const) {
      const denied = caller({
        ...context,
        auth: {
          ...context.auth,
          activeMembership: { ...membership, role },
        },
      })

      await expect(denied.postOptions()).rejects.toMatchObject({
        code: "FORBIDDEN",
      })
    }
  })
})
