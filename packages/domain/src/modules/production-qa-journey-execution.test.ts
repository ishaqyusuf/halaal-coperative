import { describe, expect, test } from "bun:test"
import { createProductionQaHarnessPlan } from "./production-qa-harness"
import {
  createProductionQaJourneyExecutionReport,
  executeProductionQaPositiveJourneys,
  type ProductionQaJourneyExecutionAdapter,
} from "./production-qa-journey-execution"

const NOW = new Date("2026-09-04T16:00:00.000Z")

function createPlan() {
  return createProductionQaHarnessPlan({
    environment: "preview",
    now: NOW,
    qaDomain: "ishaq.qa.test",
    runId: "release-42",
  })
}

describe("production-contract positive journey execution", () => {
  test("executes selected production API and Android steps in contract order", async () => {
    const observed: string[] = []
    const adapter: ProductionQaJourneyExecutionAdapter = {
      executeStep: async ({ journey, step }) => {
        observed.push(`${journey.key}:${step.key}`)
        return { status: "passed" }
      },
    }

    const receipt = await executeProductionQaPositiveJourneys({
      adapter,
      journeyKeys: ["member-core-reads"],
      now: () => NOW,
      plan: createPlan(),
    })

    expect(observed).toEqual([
      "member-core-reads:home",
      "member-core-reads:commitments",
      "member-core-reads:shares",
      "member-core-reads:statement",
      "member-core-reads:android-member-reads",
    ])
    expect(receipt.summary).toEqual({
      blockedJourneys: 0,
      failedJourneys: 0,
      passedJourneys: 1,
      passedSteps: 5,
      skippedSteps: 0,
      totalJourneys: 1,
      totalSteps: 5,
    })
    expect(receipt.journeys[0]?.status).toBe("passed")
  })

  test("stops a journey after a bounded failure and skips its remaining steps", async () => {
    const adapter: ProductionQaJourneyExecutionAdapter = {
      executeStep: async ({ step }) =>
        step.key === "password-sign-in"
          ? { code: "AUTHORIZATION_REQUIRED", status: "blocked" }
          : { status: "passed" },
    }

    const receipt = await executeProductionQaPositiveJourneys({
      adapter,
      journeyKeys: ["mobile-session-entry"],
      now: () => NOW,
      plan: createPlan(),
    })

    expect(receipt.journeys[0]?.status).toBe("blocked")
    expect(receipt.journeys[0]?.steps[2]).toMatchObject({
      code: "AUTHORIZATION_REQUIRED",
      status: "blocked",
    })
    expect(
      receipt.journeys[0]?.steps
        .slice(3)
        .every(({ status }) => status === "skipped")
    ).toBe(true)
    expect(receipt.summary.blockedJourneys).toBe(1)
    expect(receipt.summary.skippedSteps).toBe(5)
  })

  test("rejects unknown or duplicate journey selections before calling the adapter", async () => {
    let calls = 0
    const adapter: ProductionQaJourneyExecutionAdapter = {
      executeStep: async () => {
        calls += 1
        return { status: "passed" }
      },
    }

    await expect(
      executeProductionQaPositiveJourneys({
        adapter,
        journeyKeys: ["missing-journey"],
        plan: createPlan(),
      })
    ).rejects.toThrow("Unknown production QA journey")
    await expect(
      executeProductionQaPositiveJourneys({
        adapter,
        journeyKeys: ["member-core-reads", "member-core-reads"],
        plan: createPlan(),
      })
    ).rejects.toThrow("Duplicate production QA journey selection")
    expect(calls).toBe(0)
  })

  test("creates a bounded report without adapter errors, identities, or session material", async () => {
    const receipt = await executeProductionQaPositiveJourneys({
      adapter: {
        executeStep: async ({ step }) =>
          step.key === "authorize"
            ? { code: "AUTHORIZATION_REQUIRED", status: "blocked" }
            : { status: "passed" },
      },
      journeyKeys: ["mobile-session-entry"],
      now: () => NOW,
      plan: createPlan(),
    })
    const report = createProductionQaJourneyExecutionReport(receipt)

    expect(report).toContain("Blocked journeys: 1")
    expect(report).toContain("AUTHORIZATION_REQUIRED")
    expect(report).not.toContain("QSH-")
    expect(report).not.toContain("@ishaq.qa.test")
    expect(report).not.toMatch(
      /password|otp|credential|authorizationToken|sessionToken/i
    )
  })

  test("converts thrown transport details into a bounded failure code", async () => {
    const receipt = await executeProductionQaPositiveJourneys({
      adapter: {
        executeStep: async () => {
          throw new Error("private-session-token-should-never-escape")
        },
      },
      journeyKeys: ["member-core-reads"],
      now: () => NOW,
      plan: createPlan(),
    })
    const report = createProductionQaJourneyExecutionReport(receipt)

    expect(receipt.journeys[0]?.steps[0]).toMatchObject({
      code: "TRANSPORT_UNAVAILABLE",
      status: "failed",
    })
    expect(receipt.summary.failedJourneys).toBe(1)
    expect(report).toContain("TRANSPORT_UNAVAILABLE")
    expect(report).not.toContain("private-session-token-should-never-escape")
  })
})
