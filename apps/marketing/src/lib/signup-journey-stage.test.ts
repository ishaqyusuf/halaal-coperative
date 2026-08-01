import { describe, expect, test } from "bun:test"

describe("public setup journey presentation", () => {
  test("advances client-side success states in the shared setup shell", async () => {
    const signupSource = await Bun.file(
      new URL("../components/signup/signup-form.tsx", import.meta.url)
    ).text()
    const onboardingSource = await Bun.file(
      new URL("../components/signup/onboarding-form.tsx", import.meta.url)
    ).text()
    const journeySource = await Bun.file(
      new URL("../components/signup/signup-journey-state.tsx", import.meta.url)
    ).text()

    expect(journeySource).toContain("SignupJourneyContext.Provider")
    expect(signupSource).toContain(
      'useSignupJourneyStage(result ? "verify" : "workspace")'
    )
    expect(onboardingSource).toContain(
      'useSignupJourneyStage(result ? "ready" : "profile")'
    )
  })
})
