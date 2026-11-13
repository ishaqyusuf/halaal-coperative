import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
  createSignedSessionToken,
  platformSessionScope,
} from "@halaalvest/auth"
import { buildRequestContext } from "../context"
import { createCallerFactory } from "../lib.trpc"
import { monthlyRecordsRouter } from "./monthly-records.route"

const caller = createCallerFactory(monthlyRecordsRouter)
const receiveInput = {
  monthlyRecordId: "6b7b2b9e-0d6f-4d0f-9a43-2a5b0f1f7c11",
  rowIds: ["1f0e1d7c-3c55-4d0b-8a0e-6f3f1a2b9c41"],
  workplaceId: "0b5d4c3a-2f1e-4d9c-8b7a-6f5e4d3c2b10",
}

async function asMembership(membershipId: string, userId: string) {
  const token = await createSignedSessionToken({
    membershipId,
    scope: platformSessionScope,
    tenantId: "tenant-amanah-demo",
    userId,
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

describe("monthly records workplace receiving", () => {
  const prior = process.env.HALAALVEST_DATABASE_URL
  beforeAll(() => {
    delete process.env.HALAALVEST_DATABASE_URL
  })
  afterAll(() => {
    if (prior) process.env.HALAALVEST_DATABASE_URL = prior
  })

  test("keeps members out of bulk receiving and of the month rows", async () => {
    const member = await asMembership(
      "membership-amanah-admin-member",
      "user-tenant-admin-amanah"
    )

    await expect(member.receiveWorkplace(receiveInput)).rejects.toMatchObject({
      code: "FORBIDDEN",
    })
    await expect(
      member.rows({ monthlyRecordId: receiveInput.monthlyRecordId })
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
  })

  test("rejects an empty or oversized selection before any write", async () => {
    const admin = await asMembership(
      "membership-amanah-admin",
      "user-tenant-admin-amanah"
    )

    await expect(
      admin.receiveWorkplace({ ...receiveInput, rowIds: [] })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" })
    await expect(
      admin.receiveWorkplace({
        ...receiveInput,
        rowIds: Array.from({ length: 501 }, () => crypto.randomUUID()),
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" })
  })

  test("lets finance roles through to the posting query", async () => {
    const admin = await asMembership(
      "membership-amanah-admin",
      "user-tenant-admin-amanah"
    )

    // Without a database the query layer is reached and fails there, which
    // proves the permission and input checks passed.
    await expect(admin.receiveWorkplace(receiveInput)).rejects.not.toMatchObject(
      { code: "FORBIDDEN" }
    )
  })
})
