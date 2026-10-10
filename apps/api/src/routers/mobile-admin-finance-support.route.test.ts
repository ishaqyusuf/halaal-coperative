import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
  createSignedSessionToken,
  platformSessionScope,
} from "@halaalvest/auth"

import { buildRequestContext } from "../context"
import { createCallerFactory } from "../lib.trpc"
import { appRouter } from "./_app"
import { getMobileAdminFinanceSupportCapabilities } from "./mobile-admin-finance-support.route"

describe("mobile admin finance and support router", () => {
  const originalDatabaseUrl = process.env.HALAALVEST_DATABASE_URL
  const createCaller = createCallerFactory(appRouter)

  beforeAll(() => {
    delete process.env.HALAALVEST_DATABASE_URL
  })

  afterAll(() => {
    if (originalDatabaseUrl)
      process.env.HALAALVEST_DATABASE_URL = originalDatabaseUrl
  })

  async function callerFor(
    membershipId: string,
    tenantId = "tenant-amanah-demo"
  ) {
    const token = await createSignedSessionToken({
      membershipId,
      scope: platformSessionScope,
      tenantId,
      userId: "user-tenant-admin-amanah",
    })
    const context = await buildRequestContext(
      new Headers({
        authorization: `Bearer ${token}`,
        host: "api.halaalvest.localhost",
      })
    )

    return createCaller(context)
  }

  test("returns a feature-owned empty queue when the DB runtime is unavailable", async () => {
    const caller = await callerFor("membership-amanah-admin")
    const overview = await caller.mobile.admin.finance.overview()

    expect(overview.state).toBe("database_unavailable")
    expect(overview.items).toEqual([])
    expect(overview.capabilities.reviewReceipts).toBe(true)
    expect(overview.capabilities.manageSupport).toBe(true)
  })

  test("rejects the staff work queue from a member workspace", async () => {
    const caller = await callerFor("membership-amanah-admin-member")

    await expect(caller.mobile.admin.finance.overview()).rejects.toThrow(
      "You do not have permission"
    )
  })

  test("fails closed when the signed tenant does not own the active membership", async () => {
    const caller = await callerFor(
      "membership-amanah-admin",
      "tenant-outside-active-membership"
    )

    await expect(caller.mobile.admin.finance.overview()).rejects.toThrow()
  })

  test("requires explicit expected state and command id", async () => {
    const caller = await callerFor("membership-amanah-admin")

    await expect(
      caller.mobile.admin.finance.reviewReceipt({
        decision: "approved",
        receiptId: "receipt-1",
        reviewNotes: "Evidence reconciled.",
      } as never)
    ).rejects.toThrow()
  })

  test("requires evidence for a final decision", async () => {
    const caller = await callerFor("membership-amanah-admin")

    await expect(
      caller.mobile.admin.finance.reviewFinancingRequest({
        commandId: "00000000-0000-4000-8000-000000000808",
        expectedState: "submitted",
        loanRequestId: "loan-request-1",
        status: "approved",
      })
    ).rejects.toThrow("Review the information provided")
  })

  test("keeps operations capabilities separate from finance approvals", () => {
    const capabilities =
      getMobileAdminFinanceSupportCapabilities("operations_officer")

    expect(capabilities.manageSupport).toBe(true)
    expect(capabilities.recordCollectionFollowUp).toBe(true)
    expect(capabilities.reviewFoodPurchase).toBe(true)
    expect(capabilities.reviewReceipts).toBe(false)
    expect(capabilities.reviewFinancing).toBe(false)
    expect(capabilities.approveMoneyImpactSupport).toBe(false)
  })
})
