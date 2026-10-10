import { describe, expect, test } from "bun:test"
import {
  createProductionQaHarnessPlan,
  executeProductionQaPositiveJourneys,
} from "@halaalvest/domain"

import { createProductionQaMemberCoreReadAdapter } from "./production-qa-member-core-read-proof"

function createPlan() {
  return createProductionQaHarnessPlan({
    environment: "local",
    now: new Date("2026-09-04T16:00:00.000Z"),
    qaDomain: "ishaq.qa.test",
    runId: "member-core-adapter",
  })
}

function createCaller(calls: string[]) {
  return {
    mobile: {
      member: {
        commitments: async () => calls.push("commitments"),
        home: async () => calls.push("home"),
        shares: { list: async () => calls.push("shares") },
        statement: async () => calls.push("statement"),
      },
    },
  }
}

describe("production QA member-core read adapter", () => {
  test("runs the four production reads in contract order and blocks only missing Android proof", async () => {
    const calls: string[] = []
    const receipt = await executeProductionQaPositiveJourneys({
      adapter: createProductionQaMemberCoreReadAdapter({
        caller: createCaller(calls),
      }),
      journeyKeys: ["member-core-reads"],
      now: () => new Date("2026-09-04T16:00:00.000Z"),
      plan: createPlan(),
    })

    expect(calls).toEqual(["home", "commitments", "shares", "statement"])
    expect(receipt.summary).toMatchObject({
      blockedJourneys: 1,
      failedJourneys: 0,
      passedJourneys: 0,
      passedSteps: 4,
    })
    expect(receipt.journeys[0]?.steps.at(-1)).toEqual({
      code: "ANDROID_CHECKPOINT_UNAVAILABLE",
      contract: "member/core-read-screens",
      key: "android-member-reads",
      status: "blocked",
      surface: "android",
    })
  })

  test("passes the journey only when an injected Android verifier also passes", async () => {
    const receipt = await executeProductionQaPositiveJourneys({
      adapter: createProductionQaMemberCoreReadAdapter({
        androidCheckpoint: async () => ({ status: "passed" }),
        caller: createCaller([]),
      }),
      journeyKeys: ["member-core-reads"],
      plan: createPlan(),
    })

    expect(receipt.summary).toMatchObject({
      blockedJourneys: 0,
      failedJourneys: 0,
      passedJourneys: 1,
      passedSteps: 5,
    })
  })
})
