import { describe, expect, test } from "bun:test"
import {
  getMemberBackfillAdjacentSteps,
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

  test("returns adjacent workflow steps", () => {
    expect(getMemberBackfillAdjacentSteps("baseline")).toEqual({
      nextStep: "commitments",
      previousStep: null,
    })
    expect(getMemberBackfillAdjacentSteps("apply")).toEqual({
      nextStep: null,
      previousStep: "review",
    })
  })

  test("builds member-scoped page hrefs", () => {
    expect(memberBackfillStepHref("member-1", "activity")).toBe(
      "/members/member-1/backfill?step=activity"
    )
  })
})
