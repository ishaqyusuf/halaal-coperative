import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
  createSignedSessionToken,
  platformSessionScope,
} from "@halaalvest/auth"
import { buildRequestContext } from "../context"
import { createCallerFactory } from "../lib.trpc"
import { workplacesRouter } from "./workplaces.route"

const caller = createCallerFactory(workplacesRouter)

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

describe("workplaces", () => {
  const prior = process.env.HALAALVEST_DATABASE_URL
  beforeAll(() => {
    delete process.env.HALAALVEST_DATABASE_URL
  })
  afterAll(() => {
    if (prior) process.env.HALAALVEST_DATABASE_URL = prior
  })

  test("keeps members from reading or changing the workplace list", async () => {
    const member = await asMembership("membership-amanah-admin-member")

    await expect(member.list()).rejects.toMatchObject({ code: "FORBIDDEN" })
    await expect(member.create({ name: "City Council" })).rejects.toMatchObject(
      { code: "FORBIDDEN" }
    )
  })

  test("rejects a blank workplace name", async () => {
    const admin = await asMembership("membership-amanah-admin")

    await expect(admin.create({ name: " " })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    })
  })
})
