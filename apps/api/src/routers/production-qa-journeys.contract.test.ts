import { describe, expect, test } from "bun:test"
import {
  PRODUCTION_QA_NEGATIVE_JOURNEYS,
  PRODUCTION_QA_POSITIVE_JOURNEYS,
} from "@halaalvest/domain"
import { appRouter } from "./_app"

describe("production QA journey API contracts", () => {
  test("references only procedures published by the production router", () => {
    const procedures = Object.keys(
      (
        appRouter as unknown as {
          _def: { procedures: Record<string, unknown> }
        }
      )._def.procedures
    )
    const referenced = [
      ...PRODUCTION_QA_POSITIVE_JOURNEYS,
      ...PRODUCTION_QA_NEGATIVE_JOURNEYS,
    ].flatMap(({ steps }) =>
      steps
        .filter(({ surface }) => surface === "api")
        .map(({ contract }) => contract)
    )

    expect(
      [...new Set(referenced)].filter((path) => !procedures.includes(path))
    ).toEqual([])
  })
})
