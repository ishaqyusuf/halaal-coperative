import { describe, expect, test } from "bun:test"
import { createProductionQaHarnessPlan } from "./production-qa-harness"
import {
  assertProductionQaPositiveJourneyDefinitions,
  createProductionQaJourneyCoverageReport,
  createProductionQaPositiveJourneyPlan,
  PRODUCTION_QA_POSITIVE_JOURNEYS,
  type ProductionQaJourneyDefinition,
} from "./production-qa-journeys"

const NOW = new Date("2026-09-04T12:00:00.000Z")

function createPlan() {
  return createProductionQaHarnessPlan({
    environment: "preview",
    now: NOW,
    qaDomain: "ishaq.qa.test",
    runId: "release-42",
  })
}

describe("production-contract positive journey plan", () => {
  test("covers every required product area with production contracts and Android checkpoints", () => {
    expect(() => assertProductionQaPositiveJourneyDefinitions()).not.toThrow()

    const journeys = createProductionQaPositiveJourneyPlan(createPlan())
    expect(journeys).toHaveLength(18)
    expect(new Set(journeys.map(({ productArea }) => productArea)).size).toBe(
      16
    )
    expect(
      journeys.every(({ steps }) =>
        steps.some(({ surface }) => surface === "android")
      )
    ).toBe(true)
    expect(
      journeys.every(({ steps }) =>
        steps
          .filter(({ surface }) => surface === "api")
          .every(({ contract }) => contract.includes("."))
      )
    ).toBe(true)
  })

  test("binds every journey to an exact planned scenario and role identity", () => {
    const journeys = createProductionQaPositiveJourneyPlan(createPlan())

    expect(
      journeys.every(
        ({ cooperativeNumber, email, tenantSlug }) =>
          /^[A-Z]{3,5}-\d{4}$/.test(cooperativeNumber) &&
          email.endsWith("@ishaq.qa.test") &&
          tenantSlug.startsWith("qa-harness-v1-")
      )
    ).toBe(true)
    expect(
      journeys.find(({ key }) => key === "workspace-role-switch")
        ?.fixturePrerequisites
    ).toContain("multi_role_identity")
  })

  test("rejects duplicate journeys, missing Android proof, and incomplete area coverage", () => {
    const duplicate = [
      PRODUCTION_QA_POSITIVE_JOURNEYS[0],
      PRODUCTION_QA_POSITIVE_JOURNEYS[0],
    ] as unknown as readonly ProductionQaJourneyDefinition[]
    expect(() =>
      assertProductionQaPositiveJourneyDefinitions(duplicate)
    ).toThrow("Duplicate production QA journey key")

    const noAndroid = PRODUCTION_QA_POSITIVE_JOURNEYS.map((journey, index) =>
      index === 0
        ? {
            ...journey,
            steps: journey.steps.filter(({ surface }) => surface !== "android"),
          }
        : journey
    ) as readonly ProductionQaJourneyDefinition[]
    expect(() =>
      assertProductionQaPositiveJourneyDefinitions(noAndroid)
    ).toThrow("has no Android checkpoint")

    expect(() =>
      assertProductionQaPositiveJourneyDefinitions(
        PRODUCTION_QA_POSITIVE_JOURNEYS.filter(
          ({ productArea }) => productArea !== "subscription"
        )
      )
    ).toThrow("missing product areas: subscription")
  })

  test("produces a bounded coverage report without credentials or session material", () => {
    const report = createProductionQaJourneyCoverageReport({
      generatedAt: NOW,
      plan: createPlan(),
    })

    expect(report).toContain("Journeys: 18")
    expect(report).toContain("Product areas: 16/16")
    expect(report).toContain(
      "This is a coverage contract, not execution evidence"
    )
    expect(report).not.toMatch(
      /passwordHash|testerCredential|authorizationToken|sessionToken|providerToken/
    )
  })
})
