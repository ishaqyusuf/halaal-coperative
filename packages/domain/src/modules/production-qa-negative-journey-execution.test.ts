import { describe, expect, test } from "bun:test"
import { createProductionQaHarnessPlan } from "./production-qa-harness"
import {
  createProductionQaNegativeJourneyExecutionReport,
  executeProductionQaNegativeJourneys,
  type ProductionQaNegativeJourneyExecutionAdapter,
} from "./production-qa-negative-journey-execution"

const NOW = new Date("2026-09-04T19:00:00.000Z")

function createPlan() {
  return createProductionQaHarnessPlan({
    environment: "preview",
    now: NOW,
    qaDomain: "ishaq.qa.test",
    runId: "negative-execution",
  })
}

function createPassingAdapter(): ProductionQaNegativeJourneyExecutionAdapter {
  return {
    executeInvokedStep: async ({ step }) => ({
      observedOutcome: step.expectation,
      status: "observed",
    }),
    verifySuppressedStep: async () => ({
      observedOutcome: "TRANSPORT_SUPPRESSED",
      status: "observed",
      transportCalls: 0,
    }),
  }
}

describe("production-contract negative journey execution", () => {
  test("executes invoked API and Android steps sequentially", async () => {
    const observed: string[] = []
    const adapter = createPassingAdapter()
    adapter.executeInvokedStep = async ({ journey, step }) => {
      observed.push(`${journey.key}:${step.key}:${step.expectation}`)
      return { observedOutcome: step.expectation, status: "observed" }
    }

    const receipt = await executeProductionQaNegativeJourneys({
      adapter,
      journeyKeys: ["duplicate-charge-command"],
      now: () => NOW,
      plan: createPlan(),
    })

    expect(observed).toEqual([
      "duplicate-charge-command:apply-charge:SUCCESS",
      "duplicate-charge-command:replay-charge:IDEMPOTENT_REPLAY",
      "duplicate-charge-command:android-idempotency:IDEMPOTENT_REPLAY",
    ])
    expect(receipt.summary).toEqual({
      blockedJourneys: 0,
      failedJourneys: 0,
      passedJourneys: 1,
      passedSteps: 3,
      skippedSteps: 0,
      suppressedSteps: 0,
      totalJourneys: 1,
      totalSteps: 3,
    })
  })

  test("routes an offline write only through the zero-transport verifier", async () => {
    const invoked: string[] = []
    const suppressed: string[] = []
    const adapter: ProductionQaNegativeJourneyExecutionAdapter = {
      executeInvokedStep: async ({ step }) => {
        invoked.push(step.key)
        return { observedOutcome: step.expectation, status: "observed" }
      },
      verifySuppressedStep: async ({ step }) => {
        suppressed.push(step.key)
        return {
          observedOutcome: "TRANSPORT_SUPPRESSED",
          status: "observed",
          transportCalls: 0,
        }
      },
    }

    const receipt = await executeProductionQaNegativeJourneys({
      adapter,
      journeyKeys: ["offline-procurement-write"],
      now: () => NOW,
      plan: createPlan(),
    })

    expect(suppressed).toEqual(["suppress-request"])
    expect(invoked).toEqual(["android-offline"])
    expect(receipt.journeys[0]?.status).toBe("passed")
    expect(receipt.summary.suppressedSteps).toBe(1)
  })

  test("fails closed when a suppressed write records any transport call", async () => {
    const adapter = createPassingAdapter()
    adapter.verifySuppressedStep = async () => ({
      observedOutcome: "TRANSPORT_SUPPRESSED",
      status: "observed",
      transportCalls: 1,
    })

    const receipt = await executeProductionQaNegativeJourneys({
      adapter,
      journeyKeys: ["offline-procurement-write"],
      now: () => NOW,
      plan: createPlan(),
    })

    expect(receipt.journeys[0]?.steps[0]).toMatchObject({
      code: "TRANSPORT_WAS_CALLED",
      status: "failed",
    })
    expect(receipt.journeys[0]?.steps[1]?.status).toBe("skipped")
    expect(receipt.summary.failedJourneys).toBe(1)
  })

  test("fails on an unexpected server outcome and skips later proof", async () => {
    const adapter = createPassingAdapter()
    adapter.executeInvokedStep = async () => ({
      observedOutcome: "SUCCESS",
      status: "observed",
    })

    const receipt = await executeProductionQaNegativeJourneys({
      adapter,
      journeyKeys: ["stale-operation-profile-command"],
      now: () => NOW,
      plan: createPlan(),
    })

    expect(receipt.journeys[0]?.steps[0]).toMatchObject({
      code: "OUTCOME_MISMATCH",
      expectedOutcome: "CONFLICT",
      observedOutcome: "SUCCESS",
      status: "failed",
    })
    expect(receipt.journeys[0]?.steps[1]?.status).toBe("skipped")
  })

  test("rejects unknown and duplicate selections before adapter execution", async () => {
    let calls = 0
    const adapter = createPassingAdapter()
    adapter.executeInvokedStep = async ({ step }) => {
      calls += 1
      return { observedOutcome: step.expectation, status: "observed" }
    }

    await expect(
      executeProductionQaNegativeJourneys({
        adapter,
        journeyKeys: ["missing-negative-journey"],
        plan: createPlan(),
      })
    ).rejects.toThrow("Unknown production QA negative journey")
    await expect(
      executeProductionQaNegativeJourneys({
        adapter,
        journeyKeys: ["duplicate-charge-command", "duplicate-charge-command"],
        plan: createPlan(),
      })
    ).rejects.toThrow("Duplicate production QA negative journey selection")
    expect(calls).toBe(0)
  })

  test("converts private adapter failures into bounded report codes", async () => {
    const adapter = createPassingAdapter()
    adapter.executeInvokedStep = async () => {
      throw new Error("private-session-token-should-never-escape")
    }

    const receipt = await executeProductionQaNegativeJourneys({
      adapter,
      journeyKeys: ["member-capacity-limit"],
      now: () => NOW,
      plan: createPlan(),
    })
    const report = createProductionQaNegativeJourneyExecutionReport(receipt)

    expect(receipt.journeys[0]?.steps[0]).toMatchObject({
      code: "TRANSPORT_UNAVAILABLE",
      status: "failed",
    })
    expect(report).toContain("TRANSPORT_UNAVAILABLE")
    expect(report).not.toContain("private-session-token-should-never-escape")
    expect(report).not.toContain("@ishaq.qa.test")
    expect(report).not.toContain("QSH-")
  })
})
