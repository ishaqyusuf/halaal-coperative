import { describe, expect, test } from "bun:test"
import {
  getMemberBackfillAdjacentSteps,
  getMemberBackfillStepsForMode,
  memberBackfillStepHref,
  resolveMemberBackfillStep,
} from "./member-backfill-steps"

describe("member backfill steps", () => {
  test("resolves valid and invalid step query values", () => {
    expect(resolveMemberBackfillStep("loans")).toBe("loans")
    expect(resolveMemberBackfillStep(["review"])).toBe("review")
    expect(resolveMemberBackfillStep("unknown")).toBe("baseline")
    expect(resolveMemberBackfillStep(undefined)).toBe("baseline")
  })

  test("resolves steps against the tenant setup mode", () => {
    expect(resolveMemberBackfillStep("baseline", "brought_forward")).toBe(
      "brought-forward"
    )
    expect(resolveMemberBackfillStep("brought-forward", "brought_forward")).toBe(
      "brought-forward"
    )
    expect(
      resolveMemberBackfillStep("brought-forward", "historical_backfill")
    ).toBe("baseline")
  })

  test("returns mode-specific visible steps", () => {
    expect(
      getMemberBackfillStepsForMode("brought_forward").map((step) => step.key)
    ).toEqual(["brought-forward"])
    expect(
      getMemberBackfillStepsForMode("historical_backfill").map(
        (step) => step.key
      )
    ).toEqual([
      "baseline",
      "commitments",
      "activity",
      "loans",
      "profit",
      "review",
      "apply",
    ])
  })

  test("returns adjacent workflow steps", () => {
    expect(getMemberBackfillAdjacentSteps("baseline")).toEqual({
      nextStep: "commitments",
      previousStep: null,
    })
    expect(getMemberBackfillAdjacentSteps("apply")).toEqual({
      nextStep: null,
      previousStep: "review",
    })
    expect(
      getMemberBackfillAdjacentSteps("brought-forward", "brought_forward")
    ).toEqual({
      nextStep: null,
      previousStep: null,
    })
  })

  test("builds member-scoped page hrefs", () => {
    expect(memberBackfillStepHref("member-1", "activity")).toBe(
      "/members/member-1/backfill?step=activity"
    )
    expect(memberBackfillStepHref("member-1", "brought-forward")).toBe(
      "/members/member-1/backfill?step=brought-forward"
    )
  })
})
