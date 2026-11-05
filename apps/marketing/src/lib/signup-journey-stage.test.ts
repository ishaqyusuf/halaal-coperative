import { describe, expect, test } from "bun:test"

describe("public setup journey presentation", () => {
  test("advances client-side One Path steps in the shared setup shell", async () => {
    const signupSource = await Bun.file(
      new URL("../components/signup/signup-form.tsx", import.meta.url)
    ).text()
    const onboardingSource = await Bun.file(
      new URL("../components/signup/onboarding-form.tsx", import.meta.url)
    ).text()
    const journeySource = await Bun.file(
      new URL("../components/signup/signup-journey-state.tsx", import.meta.url)
    ).text()
    const shellSource = await Bun.file(
      new URL("../components/signup/signup-shell.tsx", import.meta.url)
    ).text()

    expect(journeySource).toContain("SignupJourneyContext.Provider")
    // The rail and mobile bar read the shared domain map, not a local list.
    expect(journeySource).toContain("onboardingJourneySteps")
    expect(journeySource).toContain(
      'aria-current={state === "current" ? "step" : undefined}'
    )
    expect(journeySource).toContain("All steps")
    expect(shellSource).toContain("<SignupJourneyMobileBar />")
    expect(shellSource).toContain("<SignupJourneyProgress />")
    expect(signupSource).toContain(
      'useSignupJourneyStage(result ? "verify-email" : "sign-up"'
    )
    expect(onboardingSource).toContain(
      'useSignupJourneyStage(result ? "setup-mode" : subStep'
    )
    expect(onboardingSource).toContain("workspaceCreated: Boolean(result)")
  })

  test("keeps sign-up copy, the verify actions and the member-code card", async () => {
    const signupSource = await Bun.file(
      new URL("../components/signup/signup-form.tsx", import.meta.url)
    ).text()

    expect(signupSource).toContain('title="We sent you a link"')
    expect(signupSource).toContain("Send it again")
    expect(signupSource).toContain("Wrong email? Change it")
    // Resend reuses the existing /api/signup contract with the same values.
    expect(signupSource).toContain("void requestVerification(submittedValues)")
    expect(signupSource).toContain("You will sign in with")
    expect(signupSource).toContain("From your approved request")
    expect(signupSource).toContain("readOnly={approvalLocked}")
    expect(signupSource).toContain('"Send verification email"')
  })

  test("splits onboarding into details then password with one submission", async () => {
    const onboardingSource = await Bun.file(
      new URL("../components/signup/onboarding-form.tsx", import.meta.url)
    ).text()

    expect(onboardingSource).toContain("When did the cooperative start?")
    expect(onboardingSource).toContain('setSubStep("password")')
    expect(onboardingSource).toContain('"Create workspace"')
    expect(onboardingSource.match(/fetch\("\/api\/onboarding"/g)).toHaveLength(
      1
    )
  })
})
