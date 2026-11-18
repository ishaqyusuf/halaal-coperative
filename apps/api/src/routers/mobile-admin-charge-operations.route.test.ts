import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
  createSignedSessionToken,
  platformSessionScope,
} from "@halaalvest/auth"
import type { CooperativeRole } from "@halaalvest/auth/roles"
import { buildRequestContext } from "../context"
import { createCallerFactory } from "../lib.trpc"
import { mobileAdminChargeProcedures } from "./mobile-admin-charge-operations.route"

const caller = createCallerFactory(mobileAdminChargeProcedures.charges)

async function asRole(role?: CooperativeRole) {
  const headers = new Headers({ host: "api.halaalvest.localhost" })
  if (role) {
    const token = await createSignedSessionToken({
      membershipId: "membership-amanah-admin",
      scope: platformSessionScope,
      tenantId: "tenant-amanah-demo",
      userId: "user-tenant-admin-amanah",
    })
    headers.set("authorization", `Bearer ${token}`)
  }
  const context = await buildRequestContext(headers)
  if (!role) return caller(context)
  const membership = context.auth.activeMembership
  if (!membership) throw new Error("Seeded admin has no active membership.")
  return caller({
    ...context,
    auth: { ...context.auth, activeMembership: { ...membership, role } },
  })
}

describe("mobile.admin.charges read permissions", () => {
  const databaseUrl = process.env.HALAALVEST_DATABASE_URL
  beforeAll(() => {
    delete process.env.HALAALVEST_DATABASE_URL
  })
  afterAll(() => {
    if (databaseUrl) process.env.HALAALVEST_DATABASE_URL = databaseUrl
  })

  test("summary and page are staff reads", async () => {
    const anonymous = await asRole()
    const member = await asRole("member")
    await expect(anonymous.summary()).rejects.toHaveProperty(
      "code",
      "UNAUTHORIZED"
    )
    await expect(member.page({ lane: "applications" })).rejects.toHaveProperty(
      "code",
      "FORBIDDEN"
    )
  })

  test("apply picker search requires charge management and rejects oversized search", async () => {
    const viewer = await asRole("operations_officer")
    const officer = await asRole("finance_officer")
    await expect(viewer.members({ search: "Aisha" })).rejects.toHaveProperty(
      "code",
      "FORBIDDEN"
    )
    await expect(
      viewer.rulesForApply({ assessedAt: "2026-11-17T12:00:00.000Z" })
    ).rejects.toHaveProperty("code", "FORBIDDEN")
    await expect(
      officer.members({ search: "a".repeat(121) })
    ).rejects.toHaveProperty("code", "BAD_REQUEST")
  })
})
