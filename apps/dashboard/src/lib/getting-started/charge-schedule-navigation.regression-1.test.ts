import { describe, expect, test } from "bun:test"
import { navigateWithFreshWizardState } from "./navigate-with-fresh-state"

describe("Getting Started charge schedule navigation", () => {
  // Regression: ISSUE-005 — the charge step refreshed its stale route after saving
  // Found by /qa on 2026-07-31
  // Report: .gstack/qa-reports/qa-report-halaalvest-localhost-2026-07-31.md
  test("can navigate to the next step without refreshing the previous route", () => {
    const calls: string[] = []

    navigateWithFreshWizardState(
      {
        push: (href) => calls.push(`push:${href}`),
        refresh: () => calls.push("refresh"),
      },
      "/getting-started?step=shares",
      { refreshDestination: false }
    )

    expect(calls).toEqual(["push:/getting-started?step=shares"])
  })
})
