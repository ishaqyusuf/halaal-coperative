import { describe, expect, test } from "bun:test"
import {
  formatJourneyPartCounter,
  formatJourneyStepCounter,
  getJourneyPosition,
  getJourneyStepState,
  isJourneyStepSelectable,
  isOnboardingJourneyStepKey,
  onboardingJourneyParts,
  onboardingJourneySteps,
} from "./onboarding-journey"

describe("One Path onboarding journey map", () => {
  test("numbers steps 1 to 11 contiguously and uniquely", () => {
    expect(onboardingJourneySteps.map((step) => step.number)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
    ])
    expect(new Set(onboardingJourneySteps.map((step) => step.key)).size).toBe(
      11
    )
  })

  test("has three parts whose steps are contiguous", () => {
    expect(onboardingJourneyParts.map((part) => part.key)).toEqual([
      "workspace",
      "setup",
      "members",
    ])
    const order = onboardingJourneySteps.map((step) => step.part)
    const seen: string[] = []
    for (const part of order) {
      if (seen.at(-1) !== part) {
        expect(seen).not.toContain(part)
        seen.push(part)
      }
    }
    expect(seen).toEqual(["workspace", "setup", "members"])
  })

  test("labels match the approved journey", () => {
    expect(onboardingJourneySteps.map((step) => step.label)).toEqual([
      "Sign up",
      "Verify email",
      "Cooperative details",
      "Password",
      "Where records start",
      "Services you offer",
      "Shares and charges",
      "Profit sharing",
      "Review setup",
      "Add members",
      "Go live",
    ])
    expect(onboardingJourneyParts.map((part) => part.estimate)).toEqual([
      "about 4 min",
      "about 10 min",
      "per member",
    ])
  })

  test("resolves a step's position within its part", () => {
    const position = getJourneyPosition("shares-charges")
    expect(position.step.number).toBe(7)
    expect(position.part.title).toBe("Set up how you run")
    expect(position.partStepIndex).toBe(3)
    expect(position.partStepCount).toBe(5)
    expect(position.previous?.key).toBe("operation-profile")
    expect(position.next?.key).toBe("profit")
    expect(getJourneyPosition("sign-up").previous).toBeNull()
    expect(getJourneyPosition("go-live").next).toBeNull()
    expect(formatJourneyStepCounter("setup-mode")).toBe("Step 5 of 11")
    expect(formatJourneyPartCounter("add-members")).toBe(
      "Part 3 of 3 · Bring your members"
    )
  })

  test("locks the workspace steps once the workspace exists", () => {
    expect(
      getJourneyStepState({ currentStepKey: "profit", stepKey: "password" })
    ).toBe("complete")
    expect(
      isJourneyStepSelectable({
        currentStepKey: "profit",
        stepKey: "password",
        workspaceCreated: true,
      })
    ).toBe(false)
    expect(
      isJourneyStepSelectable({
        currentStepKey: "password",
        stepKey: "cooperative-details",
        workspaceCreated: false,
      })
    ).toBe(true)
    expect(
      isJourneyStepSelectable({
        completedStepKeys: ["setup-mode"],
        currentStepKey: "profit",
        stepKey: "operation-profile",
        workspaceCreated: true,
      })
    ).toBe(false)
  })

  test("guards unknown keys", () => {
    expect(isOnboardingJourneyStepKey("profit")).toBe(true)
    expect(isOnboardingJourneyStepKey("charges")).toBe(false)
    expect(isOnboardingJourneyStepKey(null)).toBe(false)
  })
})
