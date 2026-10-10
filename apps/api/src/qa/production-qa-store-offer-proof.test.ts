import { describe, expect, test } from "bun:test"
import {
  createProductionQaHarnessPlan,
  executeProductionQaPositiveJourneys,
} from "@halaalvest/domain"

import { createProductionQaStoreOfferAdapter } from "./production-qa-store-offer-proof"

function createPlan() {
  return createProductionQaHarnessPlan({
    environment: "local",
    now: new Date("2026-09-04T20:30:00.000Z"),
    qaDomain: "ishaq.qa.test",
    runId: "subscription-adapter",
  })
}

function createCaller(input?: {
  invalidProduct?: boolean
  noCatalog?: boolean
  target?: boolean
}) {
  const catalogReads: string[] = []
  const target = input?.target ?? true
  return {
    caller: {
      subscriptions: {
        storeCatalog: async ({ store }: { store: "google" }) => {
          catalogReads.push(store)
          return {
            accountBinding: input?.noCatalog
              ? null
              : "b947f1c9-f376-4693-a7fe-862e673bd826",
            products: input?.noCatalog
              ? []
              : [
                  {
                    store: "google" as const,
                    productId: input?.invalidProduct ? "" : "standard-monthly",
                    planCode: "standard",
                    basePlanId: "monthly",
                  },
                ],
          }
        },
        snapshot: async () => ({
          availablePlans: [
            {
              activeMemberLimit: 50,
              code: "starter",
              displayName: "Starter",
              entitlements: { coreFinance: true },
              isPublic: true,
            },
            ...(target
              ? [
                  {
                    activeMemberLimit: 250,
                    code: "standard",
                    displayName: "Standard",
                    entitlements: { coreFinance: true },
                    isPublic: true,
                  },
                ]
              : []),
          ],
          entitlements: { coreFinance: true },
          invoices: [],
          plan: {
            activeMemberLimit: 50,
            code: "starter",
            displayName: "Starter",
            entitlements: { coreFinance: true },
            isPublic: true,
          },
          tenantId: "tenant-starter",
          usage: { activeMemberCount: 12, activeMemberLimit: 50 },
        }),
      },
    },
    catalogReads,
  }
}

describe("production QA subscription store offer adapter", () => {
  test("proves the subscription snapshot and configured Google offer before Android", async () => {
    const { caller, catalogReads } = createCaller()
    const checkpoints: string[] = []
    const receipt = await executeProductionQaPositiveJourneys({
      adapter: createProductionQaStoreOfferAdapter({
        androidCheckpoint: async (evidence) => {
          checkpoints.push(
            `${evidence.currentPlanName}:${evidence.requestedPlanName}`
          )
          return { status: "passed" }
        },
        caller,
      }),
      journeyKeys: ["subscription-store-offer"],
      plan: createPlan(),
    })

    expect(catalogReads).toEqual(["google"])
    expect(checkpoints).toEqual(["Starter:Standard"])
    expect(receipt.summary).toMatchObject({
      blockedJourneys: 0,
      failedJourneys: 0,
      passedJourneys: 1,
      passedSteps: 3,
    })
  })

  test("fails closed when the target plan is missing", async () => {
    const { caller, catalogReads } = createCaller({ target: false })
    const receipt = await executeProductionQaPositiveJourneys({
      adapter: createProductionQaStoreOfferAdapter({
        caller,
      }),
      journeyKeys: ["subscription-store-offer"],
      plan: createPlan(),
    })

    expect(catalogReads).toEqual([])
    expect(receipt.journeys[0]?.steps[0]).toMatchObject({
      code: "ASSERTION_FAILED",
      status: "failed",
    })
  })

  test("blocks when the sandbox catalog is not configured", async () => {
    const { caller } = createCaller({ noCatalog: true })
    const receipt = await executeProductionQaPositiveJourneys({
      adapter: createProductionQaStoreOfferAdapter({
        caller,
      }),
      journeyKeys: ["subscription-store-offer"],
      plan: createPlan(),
    })

    expect(receipt.journeys[0]?.steps[1]).toMatchObject({
      code: "FIXTURE_MISSING",
      status: "blocked",
    })
  })

  test("fails when the configured product lacks an identifier", async () => {
    const { caller } = createCaller({ invalidProduct: true })
    const receipt = await executeProductionQaPositiveJourneys({
      adapter: createProductionQaStoreOfferAdapter({ caller }),
      journeyKeys: ["subscription-store-offer"],
      plan: createPlan(),
    })

    expect(receipt.journeys[0]?.steps[1]).toMatchObject({
      code: "ASSERTION_FAILED",
      status: "failed",
    })
  })
})
