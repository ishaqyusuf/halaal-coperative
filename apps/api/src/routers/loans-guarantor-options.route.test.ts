import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
  createSignedSessionToken,
  platformSessionScope,
} from "@halaalvest/auth"
import type { CooperativeRole } from "@halaalvest/auth/roles"
import { buildRequestContext } from "../context"
import { createCallerFactory } from "../lib.trpc"
import { guarantorOptionsOutputSchema } from "../schemas/loans"
import { loansRouter } from "./loans.route"

const caller = createCallerFactory(loansRouter)
const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"

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

describe("loans.guarantorOptions (members choosing guarantors)", () => {
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
    expect(await code(anonymous.guarantorOptions({}))).toBe("UNAUTHORIZED")
  })

  test("members and staff may search", async () => {
    for (const role of [
      "member",
      "tenant_admin",
      "finance_officer",
      "operations_officer",
    ] as CooperativeRole[]) {
      const result = await code((await asRole(role)).guarantorOptions({}))
      expect(result, role).not.toBe("FORBIDDEN")
      expect(result, role).not.toBe("UNAUTHORIZED")
    }
  })

  test("a member cannot widen the search", async () => {
    const member = await asRole("member")
    // No other tenant, member, number or field filters are accepted.
    for (const input of [
      { tenantId: id },
      { excludeMemberId: null },
      { memberNumber: "KAD-001" },
      { status: "suspended" },
      { ids: [id, id, id] },
      { ids: ["not-an-id"] },
      { q: "x".repeat(101) },
    ]) {
      expect(
        await code(member.guarantorOptions(input as never)),
        JSON.stringify(input)
      ).toBe("BAD_REQUEST")
    }
  })

  test("only names and ids leave the API", () => {
    const parsed = guarantorOptionsOutputSchema.parse([
      {
        email: "aisha@example.test",
        fullName: "Aisha Bello",
        id,
        memberNumber: "KAD-001",
        phone: "+2348000000000",
        totalSavingsSnapshot: 250_000,
      },
    ])
    expect(parsed).toEqual([{ fullName: "Aisha Bello", id }])
  })
})
