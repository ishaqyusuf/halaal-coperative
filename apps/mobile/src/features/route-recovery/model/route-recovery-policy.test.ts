import { describe, expect, it } from "bun:test"

import { getRouteRecoveryContent } from "./route-recovery-policy"

describe("mobile route recovery", () => {
  it.each([
    ["member", "Return to member home"],
    ["admin", "Return to admin overview"],
    [null, "Return to sign in"],
  ] as const)("provides the safe %s destination", (role, actionLabel) => {
    expect(getRouteRecoveryContent(role).actionLabel).toBe(actionLabel)
  })

  it("does not imply that an unavailable route changed authenticated data", () => {
    expect(getRouteRecoveryContent("member").reassurance).toBe(
      "Your signed-in account and records are unchanged."
    )
    expect(getRouteRecoveryContent("admin").description).not.toMatch(
      /permission|denied/i
    )
  })

  it("uses guest-safe copy without claiming an authenticated workspace", () => {
    const guestRecovery = getRouteRecoveryContent(null)

    expect(guestRecovery.description).not.toMatch(/workspace|signed-in/i)
    expect(guestRecovery.reassurance).toBe("No account changes were made.")
  })
})
