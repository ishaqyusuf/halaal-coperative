import { describe, expect, it } from "bun:test"

import { getRecoveryPresentation } from "./recovery-presentation"

describe("recovery presentation", () => {
  it("maps each recovery state to one numbered first-gate step", () => {
    expect(getRecoveryPresentation("request")).toMatchObject({
      stepNumber: 1,
      title: "Recover account",
    })
    expect(getRecoveryPresentation("code")).toMatchObject({
      stepNumber: 2,
      title: "Enter recovery code",
    })
    expect(getRecoveryPresentation("password")).toMatchObject({
      stepNumber: 3,
      title: "Set a new password",
    })
  })
})
