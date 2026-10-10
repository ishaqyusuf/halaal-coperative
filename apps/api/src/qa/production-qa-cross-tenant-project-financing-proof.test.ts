import { describe, expect, test } from "bun:test"
import {
  createProductionQaHarnessPlan,
  executeProductionQaNegativeJourneys,
} from "@halaalvest/domain"
import { PRODUCTION_QA_LOCAL_PROJECT_FINANCING_FIXTURE } from "@halaalvest/db"
import { TRPCError } from "@trpc/server"

import { createProductionQaCrossTenantProjectFinancingAdapter } from "./production-qa-cross-tenant-project-financing-proof"

const plan = createProductionQaHarnessPlan({
  environment: "local",
  qaDomain: "ishaq.qa.test",
  runId: "cross-tenant-test",
})

function workspace() {
  return {
    attention: [],
    capabilities: {
      activate: true,
      recordDisbursement: true,
      review: true,
      view: true,
    },
    currencyCode: "NGN",
    generatedAt: "2026-09-06T00:00:00.000Z",
    lane: "needs_action" as const,
    nextCursor: null,
    projects: [
      {
        businessName:
          PRODUCTION_QA_LOCAL_PROJECT_FINANCING_FIXTURE.businessName,
        id: "local-request",
        status: "submitted" as const,
        updatedAt: "2026-09-06T00:00:00.000Z",
      },
    ],
    summary: {
      blockedCount: 1,
      closedCount: 0,
      outstandingPrincipal: 185_000,
      readyCount: 0,
      totalProjects: 1,
    },
    total: 1,
  }
}

function execute(input: {
  android?: boolean
  detail: () => Promise<unknown>
  role?: string
}) {
  return executeProductionQaNegativeJourneys({
    adapter: createProductionQaCrossTenantProjectFinancingAdapter({
      androidCheckpoint: input.android
        ? async () => ({ status: "observed", observedOutcome: "NOT_FOUND" })
        : undefined,
      caller: {
        detail: input.detail,
        workspace: async ({ lane }) => ({ ...workspace(), lane }),
      },
      cooperativeRole: input.role ?? "finance_officer",
      foreignRequestId: "foreign-request",
    }),
    journeyKeys: ["cross-tenant-project-financing-detail"],
    plan,
  })
}

describe("cross-tenant project-financing proof", () => {
  test("requires exact NOT_FOUND plus Android evidence", async () => {
    const receipt = await execute({
      android: true,
      detail: () =>
        Promise.reject(
          new TRPCError({ code: "NOT_FOUND", message: "private detail" })
        ),
    })
    expect(receipt.summary.passedJourneys).toBe(1)
    expect(JSON.stringify(receipt)).not.toContain("private detail")
  })

  test("does not accept an empty success response", async () => {
    const receipt = await execute({ android: true, detail: async () => null })
    expect(receipt.journeys[0]?.status).toBe("failed")
    expect(receipt.journeys[0]?.steps[1]?.status).toBe("skipped")
  })

  for (const code of [
    "FORBIDDEN",
    "UNAUTHORIZED",
    "INTERNAL_SERVER_ERROR",
  ] as const) {
    test(`does not mistake ${code} for tenant isolation`, async () => {
      const receipt = await execute({
        detail: () => Promise.reject(new TRPCError({ code })),
      })
      expect(receipt.journeys[0]?.steps[0]?.code).toBe("OUTCOME_MISMATCH")
    })
  }

  test("does not invoke the API with another role", async () => {
    let calls = 0
    const receipt = await execute({
      detail: async () => {
        calls += 1
      },
      role: "tenant_admin",
    })
    expect(calls).toBe(0)
    expect(receipt.journeys[0]?.steps[0]?.code).toBe("AUTHORIZATION_REQUIRED")
  })
})
