import { describe, expect, test } from "bun:test"
import { createProductionQaHarnessPlan } from "./production-qa-harness"
import {
  assertProductionQaNegativeJourneyDefinitions,
  createProductionQaNegativeJourneyCoverageReport,
  createProductionQaNegativeJourneyPlan,
  PRODUCTION_QA_NEGATIVE_CATEGORIES,
  PRODUCTION_QA_NEGATIVE_JOURNEYS,
  type ProductionQaNegativeJourneyDefinition,
} from "./production-qa-negative-journeys"

const NOW = new Date("2026-09-04T18:00:00.000Z")

function createPlan() {
  return createProductionQaHarnessPlan({
    environment: "preview",
    now: NOW,
    qaDomain: "ishaq.qa.test",
    runId: "negative-journeys",
  })
}

describe("production-contract negative journey plan", () => {
  test("covers every required denial and idempotency category", () => {
    expect(() => assertProductionQaNegativeJourneyDefinitions()).not.toThrow()
    expect(PRODUCTION_QA_NEGATIVE_JOURNEYS).toHaveLength(7)
    expect(
      new Set(PRODUCTION_QA_NEGATIVE_JOURNEYS.map(({ category }) => category))
        .size
    ).toBe(PRODUCTION_QA_NEGATIVE_CATEGORIES.length)
    expect(
      PRODUCTION_QA_NEGATIVE_JOURNEYS.every(({ steps }) =>
        steps.some(({ surface }) => surface === "android")
      )
    ).toBe(true)
  })

  test("binds each denial to a real scenario and role identity", () => {
    const journeys = createProductionQaNegativeJourneyPlan(createPlan())

    expect(journeys).toHaveLength(7)
    expect(
      journeys.every(
        ({ cooperativeNumber, email, tenantSlug }) =>
          /^[A-Z]{3,5}-\d{4}$/.test(cooperativeNumber) &&
          email.endsWith("@ishaq.qa.test") &&
          tenantSlug.startsWith("qa-harness-v1-")
      )
    ).toBe(true)
    expect(
      journeys.find(({ category }) => category === "offline_write_blocking")
        ?.steps[0]
    ).toMatchObject({
      expectation: "TRANSPORT_SUPPRESSED",
      invocation: "suppress",
    })
  })

  test("rejects duplicate categories, missing Android proof, and unsafe suppression", () => {
    const duplicate = [
      PRODUCTION_QA_NEGATIVE_JOURNEYS[0],
      PRODUCTION_QA_NEGATIVE_JOURNEYS[0],
    ] as unknown as readonly ProductionQaNegativeJourneyDefinition[]
    expect(() =>
      assertProductionQaNegativeJourneyDefinitions(duplicate)
    ).toThrow("Duplicate production QA negative journey key")

    const noAndroid = PRODUCTION_QA_NEGATIVE_JOURNEYS.map((journey, index) =>
      index === 0
        ? {
            ...journey,
            steps: journey.steps.filter(({ surface }) => surface !== "android"),
          }
        : journey
    ) as readonly ProductionQaNegativeJourneyDefinition[]
    expect(() =>
      assertProductionQaNegativeJourneyDefinitions(noAndroid)
    ).toThrow("has no Android checkpoint")

    const unsafeSuppression = PRODUCTION_QA_NEGATIVE_JOURNEYS.map(
      (journey, index) =>
        index === 0
          ? {
              ...journey,
              steps: journey.steps.map((step, stepIndex) =>
                stepIndex === 0
                  ? { ...step, expectation: "CONFLICT" as const }
                  : step
              ),
            }
          : journey
    ) as readonly ProductionQaNegativeJourneyDefinition[]
    expect(() =>
      assertProductionQaNegativeJourneyDefinitions(unsafeSuppression)
    ).toThrow("suppressed step must expect TRANSPORT_SUPPRESSED")
  })

  test("reports coverage without identities or private execution material", () => {
    const report = createProductionQaNegativeJourneyCoverageReport({
      generatedAt: NOW,
      plan: createPlan(),
    })

    expect(report).toContain("Negative journeys: 7")
    expect(report).toContain("Categories: 7/7")
    expect(report).not.toContain("QSH-")
    expect(report).not.toContain("@ishaq.qa.test")
    expect(report).not.toMatch(/password|otp|credential|sessionToken/i)
  })
})
