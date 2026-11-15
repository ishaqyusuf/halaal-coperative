import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
  createSignedSessionToken,
  platformSessionScope,
} from "@halaalvest/auth"
import type { CooperativeRole } from "@halaalvest/auth/roles"
import { buildRequestContext } from "../context"
import { createCallerFactory } from "../lib.trpc"
import { loansRouter } from "./loans.route"

const caller = createCallerFactory(loansRouter)

async function asRole(role: CooperativeRole) {
  const token = await createSignedSessionToken({
    membershipId: "membership-amanah-admin",
    scope: platformSessionScope,
    tenantId: "tenant-amanah-demo",
    userId: "user-tenant-admin-amanah",
  })
  const ctx = await buildRequestContext(
    new Headers({
      authorization: `Bearer ${token}`,
      host: "api.halaalvest.localhost",
    })
  )
  const membership = ctx.auth.activeMembership
  if (!membership) throw new Error("Seeded admin has no active membership.")
  return caller({
    ...ctx,
    auth: { ...ctx.auth, activeMembership: { ...membership, role } },
  })
}

async function code(call: Promise<unknown>) {
  return call.then(
    () => "ok",
    (error: { code?: string }) => error.code ?? "ERROR"
  )
}

describe("loans.chargeOptions (charges on Ask for a loan)", () => {
  const databaseUrl = process.env.HALAALVEST_DATABASE_URL
  beforeAll(() => {
    delete process.env.HALAALVEST_DATABASE_URL
  })
  afterAll(() => {
    if (databaseUrl) process.env.HALAALVEST_DATABASE_URL = databaseUrl
  })

  test("a signed-out caller gets nothing", async () => {
    const anonymous = caller(
      await buildRequestContext(
        new Headers({ host: "api.halaalvest.localhost" })
      )
    )
    expect(await code(anonymous.chargeOptions())).toBe("UNAUTHORIZED")
  })

  test("members and staff may read the submission charges", async () => {
    for (const role of [
      "member",
      "tenant_admin",
      "finance_officer",
      "operations_officer",
    ] as CooperativeRole[]) {
      const result = await code((await asRole(role)).chargeOptions())
      expect(result, role).not.toBe("FORBIDDEN")
      expect(result, role).not.toBe("UNAUTHORIZED")
    }
  })
})
