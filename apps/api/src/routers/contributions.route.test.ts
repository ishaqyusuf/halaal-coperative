import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
  createSignedSessionToken,
  platformSessionScope,
} from "@halaalvest/auth"
import { buildRequestContext } from "../context"
import { createCallerFactory } from "../lib.trpc"
import { contributionsRouter } from "./contributions.route"

const caller = createCallerFactory(contributionsRouter)

async function asMembership(membershipId: string) {
  const token = await createSignedSessionToken({
    membershipId,
    scope: platformSessionScope,
    tenantId: "tenant-amanah-demo",
    userId: "user-tenant-admin-amanah",
  })
  return caller(
    await buildRequestContext(
      new Headers({
        authorization: `Bearer ${token}`,
        host: "api.halaalvest.localhost",
      })
    )
  )
}

describe("contribution plan options for the payment form", () => {
  const prior = process.env.HALAALVEST_DATABASE_URL
  beforeAll(() => {
    delete process.env.HALAALVEST_DATABASE_URL
  })
  afterAll(() => {
    if (prior) process.env.HALAALVEST_DATABASE_URL = prior
  })

  test("keeps members from reading another member's plans", async () => {
    const member = await asMembership("membership-amanah-admin-member")

    await expect(
      member.memberPlanOptions({ memberId: crypto.randomUUID() })
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
  })

  test("needs a member id", async () => {
    const admin = await asMembership("membership-amanah-admin")

    await expect(
      admin.memberPlanOptions({ memberId: "not-a-uuid" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" })
  })
})
