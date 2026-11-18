import { describe, expect, it } from "bun:test"

import { getRecoveryPresentation } from "./recovery-presentation"

describe("recovery presentation", () => {
  it("maps each recovery step to its number, title and action", () => {
    expect(getRecoveryPresentation("request")).toMatchObject({
      actionLabel: "Send code",
      stepNumber: 1,
      title: "Recover account",
    })
    expect(getRecoveryPresentation("code")).toMatchObject({
      actionLabel: "Continue",
      stepNumber: 2,
      title: "Enter recovery code",
    })
    expect(getRecoveryPresentation("password")).toMatchObject({
      actionLabel: "Update password",
      busyLabel: "Updating password",
      stepNumber: 3,
      title: "Set a new password",
    })
  })
})
