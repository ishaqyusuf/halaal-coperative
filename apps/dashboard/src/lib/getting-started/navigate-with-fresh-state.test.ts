import { describe, expect, test } from "bun:test"
import { navigateWithFreshWizardState } from "./navigate-with-fresh-state"

describe("navigateWithFreshWizardState", () => {
  test("navigates before refreshing the destination wizard snapshot", () => {
    const calls: string[] = []

    navigateWithFreshWizardState(
      {
        push: (href) => calls.push(`push:${href}`),
        refresh: () => calls.push("refresh"),
      },
      "/getting-started?step=charges"
    )

    expect(calls).toEqual(["push:/getting-started?step=charges", "refresh"])
  })
})
