import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
  createSignedSessionToken,
  platformSessionScope,
} from "@halaalvest/auth"
import { buildRequestContext } from "../context"
import { createCallerFactory } from "../lib.trpc"
import { accountPrivacyRouter } from "./account-privacy.route"
import { qaMaintenanceRouter } from "./qa-maintenance.route"
import { storeRefundReviewsRouter } from "./store-refund-reviews.route"

// Platform-operator pages (/platform/privacy-requests, /platform/refund-reviews,
// /platform/qa-maintenance): every procedure behind them must refuse anyone
// who is not a platform owner, before any database work.
const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"

const operatorCalls = {
  privacy: [
    ["operatorQueue", { direction: "forward" }],
    ["operatorRequest", { requestId: id }],
    ["processingInventory", { requestId: id }],
    [
      "recordProcessingNote",
      {
        requestId: id,
        category: "external_processors_backups",
        evidence: "Processor request and outcome evidence recorded.",
      },
    ],
    [
      "verify",
      { requestId: id, verificationEvidence: "Identity and scope verified" },
    ],
    ["revocationScope", { requestId: id }],
    [
      "revokeAccess",
      {
        requestId: id,
        confirmed: true,
        handoverAndRetentionEvidence: "Handover and retention review noted.",
        reviewedMemberships: [],
      },
    ],
  ],
  refunds: [
    ["queue", { direction: "forward" }],
    ["review", { reviewId: id }],
  ],
  qa: [
    ["candidates", undefined],
    ["adopt", { tenantIds: [id] }],
    ["preview", undefined],
    [
      "startPurge",
      { confirmation: "PURGE ALL QA DATA", previewToken: "preview-token" },
    ],
    ["run", { runId: id }],
  ],
} as const

type Session = { membershipId: string; tenantId: string; userId: string }

const people: Record<string, Session> = {
  "cooperative admin": {
    membershipId: "membership-amanah-admin",
    tenantId: "tenant-amanah-demo",
    userId: "user-tenant-admin-amanah",
  },
  "finance officer": {
    membershipId: "membership-barakah-finance",
    tenantId: "tenant-barakah-demo",
    userId: "user-finance-barakah",
  },
  member: {
    membershipId: "membership-amanah-admin-member",
    tenantId: "tenant-amanah-demo",
    userId: "user-tenant-admin-amanah",
  },
}

async function headersFor(session: Session | null) {
  const headers = new Headers({ host: "api.halaalvest.localhost" })
  if (session) {
    const token = await createSignedSessionToken({
      ...session,
      scope: platformSessionScope,
    })
    headers.set("authorization", `Bearer ${token}`)
  }
  return headers
}

async function callers(session: Session | null) {
  const ctx = await buildRequestContext(await headersFor(session))
  return {
    privacy: createCallerFactory(accountPrivacyRouter)(ctx),
    qa: createCallerFactory(qaMaintenanceRouter)(ctx),
    refunds: createCallerFactory(storeRefundReviewsRouter)(ctx),
  } as unknown as Record<
    keyof typeof operatorCalls,
    Record<string, (input: unknown) => Promise<unknown>>
  >
}

async function expectEveryCallRefused(session: Session | null, code: string) {
  const api = await callers(session)
  for (const [router, calls] of Object.entries(operatorCalls)) {
    for (const [procedure, input] of calls) {
      const call = api[router as keyof typeof operatorCalls][procedure]
      await expect(call(input), `${router}.${procedure}`).rejects.toMatchObject(
        { code }
      )
    }
  }
}

describe("platform-operator procedures", () => {
  const databaseUrl = process.env.HALAALVEST_DATABASE_URL
  beforeAll(() => {
    delete process.env.HALAALVEST_DATABASE_URL
  })
  afterAll(() => {
    if (databaseUrl) process.env.HALAALVEST_DATABASE_URL = databaseUrl
  })

  test("refuse people who are not signed in", async () => {
    await expectEveryCallRefused(null, "UNAUTHORIZED")
  })

  for (const [label, session] of Object.entries(people)) {
    test(`refuse a ${label}`, async () => {
      await expectEveryCallRefused(session, "FORBIDDEN")
    })
  }

  test("accept the cursor input tRPC infinite queries send", async () => {
    // The pages use infinite queries, which add `direction` to the input.
    // Before this was allowed the strict inputs refused every page load.
    const api = await callers({
      membershipId: "membership-platform-owner",
      tenantId: "tenant-amanah-demo",
      userId: "user-platform-owner",
    })
    for (const call of [
      () => api.privacy.operatorQueue({ cursor: null, direction: "forward" }),
      () => api.refunds.queue({ cursor: null, direction: "forward" }),
    ]) {
      const error = await call().then(
        () => null,
        (caught: { code?: string }) => caught
      )
      expect(error?.code).not.toBe("BAD_REQUEST")
    }
  })
})
