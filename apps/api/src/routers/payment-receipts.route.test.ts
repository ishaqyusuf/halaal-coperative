import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
  createSignedSessionToken,
  platformSessionScope,
} from "@halaalvest/auth"
import { buildRequestContext } from "../context"
import { createCallerFactory } from "../lib.trpc"
import { paymentReceiptsRouter } from "./payment-receipts.route"

const caller = createCallerFactory(paymentReceiptsRouter)

async function asMembership(
  membershipId: string,
  findMemberByUserId?: NonNullable<
    Parameters<typeof buildRequestContext>[1]
  >["findMemberByUserId"]
) {
  const token = await createSignedSessionToken({
    membershipId,
    scope: platformSessionScope,
    tenantId: "tenant-amanah-demo",
    userId: "user-tenant-admin-amanah",
  })
  const context = await buildRequestContext(
    new Headers({
      authorization: `Bearer ${token}`,
      host: "api.halaalvest.localhost",
    })
  )
  return caller({
    ...context,
    lookups: { ...context.lookups, findMemberByUserId },
  })
}

describe("payment receipt member options", () => {
  const prior = process.env.HALAALVEST_DATABASE_URL
  beforeAll(() => {
    delete process.env.HALAALVEST_DATABASE_URL
  })
  afterAll(() => {
    if (prior) process.env.HALAALVEST_DATABASE_URL = prior
  })

  test("keeps members from reading another member's receipt options", async () => {
    const member = await asMembership("membership-amanah-admin-member")

    await expect(
      member.memberOptions({ memberId: crypto.randomUUID() })
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
  })

  test("needs a member id", async () => {
    const admin = await asMembership("membership-amanah-admin")

    await expect(
      admin.memberOptions({ memberId: "not-a-uuid" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" })
  })

  test("rejects staff and caller-supplied member IDs on the own form query", async () => {
    const admin = await asMembership("membership-amanah-admin")
    await expect(admin.ownOptions()).rejects.toMatchObject({
      code: "FORBIDDEN",
    })

    const member = await asMembership("membership-amanah-admin-member")
    // Simulate untyped HTTP input.
    const call = member.ownOptions as (input: unknown) => Promise<unknown>
    await expect(call({ memberId: crypto.randomUUID() })).rejects.toMatchObject(
      {
        code: "BAD_REQUEST",
      }
    )
  })

  test("uses the scoped lookup for own options, list, and detail without a profile", async () => {
    const lookups: unknown[] = []
    const member = await asMembership(
      "membership-amanah-admin-member",
      async (input) => {
        lookups.push(input)
        return null
      }
    )

    await expect(member.ownOptions()).rejects.toMatchObject({
      code: "FORBIDDEN",
    })
    await expect(
      member.list({ memberId: crypto.randomUUID() })
    ).resolves.toEqual({
      data: [],
      meta: { cursor: undefined, total: 0 },
    })
    await expect(
      member.get({ receiptId: crypto.randomUUID() })
    ).resolves.toBeNull()
    expect(lookups).toEqual(
      Array.from({ length: 3 }, () => ({
        tenantId: "tenant-amanah-demo",
        userId: "user-tenant-admin-amanah",
      }))
    )
  })
})
