import { describe, expect, test } from "bun:test"
import {
  createProductionQaHarnessPlan,
  executeProductionQaPositiveJourneys,
} from "@halaalvest/domain"

import { createProductionQaShareProfitReadAdapter } from "./production-qa-share-profit-read-proof"

function createPlan() {
  return createProductionQaHarnessPlan({
    environment: "local",
    now: new Date("2026-09-04T18:50:00.000Z"),
    qaDomain: "ishaq.qa.test",
    runId: "share-profit-read-adapter",
  })
}

function createCaller(calls: string[], published = true) {
  return {
    mobile: {
      admin: {
        shareProfitGovernance: {
          profitDetail: async ({
            dividendPeriodId,
          }: {
            dividendPeriodId: string
          }) => {
            calls.push(`detail:${dividendPeriodId}`)
            return {
              period: {
                id: dividendPeriodId,
                name: "QA ONLY — 2026 profit",
                status: published ? "published" : "draft",
              },
              periodAllocations: published ? [{ id: "allocation-1" }] : [],
              profitEntries: published
                ? [{ id: "entry-1", status: "completed" }]
                : [],
            }
          },
          workspace: async ({ book }: { book: "profit" }) => {
            calls.push(`workspace:${book}`)
            return {
              profit: {
                periods: [
                  {
                    id: "period-1",
                    name: "QA ONLY — 2026 profit",
                    status: published ? "published" : "draft",
                  },
                ],
              },
            }
          },
        },
      },
    },
  }
}

describe("production QA share/profit read adapter", () => {
  test("reads the published workspace and matching detail before Android", async () => {
    const calls: string[] = []
    const checkpoints: string[] = []
    const receipt = await executeProductionQaPositiveJourneys({
      adapter: createProductionQaShareProfitReadAdapter({
        androidCheckpoint: async ({ periodName }) => {
          checkpoints.push(periodName)
          return { status: "passed" }
        },
        caller: createCaller(calls),
      }),
      journeyKeys: ["share-profit-governance-read"],
      plan: createPlan(),
    })

    expect(calls).toEqual(["workspace:profit", "detail:period-1"])
    expect(checkpoints).toEqual(["QA ONLY — 2026 profit"])
    expect(receipt.summary).toMatchObject({
      blockedJourneys: 0,
      failedJourneys: 0,
      passedJourneys: 1,
      passedSteps: 3,
    })
  })

  test("fails closed when the fixture does not contain published evidence", async () => {
    const calls: string[] = []
    const receipt = await executeProductionQaPositiveJourneys({
      adapter: createProductionQaShareProfitReadAdapter({
        caller: createCaller(calls, false),
      }),
      journeyKeys: ["share-profit-governance-read"],
      plan: createPlan(),
    })

    expect(calls).toEqual(["workspace:profit"])
    expect(receipt.journeys[0]?.steps).toEqual([
      {
        code: "ASSERTION_FAILED",
        contract: "mobile.admin.shareProfitGovernance.workspace",
        key: "share-profit-workspace",
        status: "failed",
        surface: "api",
      },
      {
        contract: "mobile.admin.shareProfitGovernance.profitDetail",
        key: "profit-detail",
        status: "skipped",
        surface: "api",
      },
      {
        contract: "admin/share-profit-governance",
        key: "android-share-profit",
        status: "skipped",
        surface: "android",
      },
    ])
  })
})
