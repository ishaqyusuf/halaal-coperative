import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
  createSignedSessionToken,
  platformSessionScope,
} from "@halaalvest/auth"
import { buildRequestContext } from "../context"
import { createCallerFactory } from "../lib.trpc"
import { filtersRouter } from "./filters.route"

const caller = createCallerFactory(filtersRouter)

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

describe("filters.repayments", () => {
  const prior = process.env.HALAALVEST_DATABASE_URL
  beforeAll(() => {
    delete process.env.HALAALVEST_DATABASE_URL
  })
  afterAll(() => {
    if (prior) process.env.HALAALVEST_DATABASE_URL = prior
  })

  test("gives finance staff plain repayment filters", async () => {
    const finance = caller(
      await context({
        membershipId: "membership-barakah-finance",
        tenantId: "tenant-barakah-demo",
        userId: "user-finance-barakah",
      })
    )
    const filters = await finance.repayments()

    expect(filters.map((filter) => filter.label)).toEqual([
      "Member",
      "Who follows up",
      "Status",
      "Follow-up",
      "Open or sorted",
      "Due date",
    ])
  })

  test("refuses a member: the list names borrowers and staff", async () => {
    const member = caller(
      await context({
        membershipId: "membership-amanah-admin-member",
        tenantId: "tenant-amanah-demo",
        userId: "user-tenant-admin-amanah",
      })
    )

    await expect(member.repayments()).rejects.toMatchObject({
      code: "FORBIDDEN",
    })
  })
})
