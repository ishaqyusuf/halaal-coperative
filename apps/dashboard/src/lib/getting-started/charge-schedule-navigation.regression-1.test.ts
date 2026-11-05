import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
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
      "/getting-started?step=profit",
      { refreshDestination: false }
    )

    expect(calls).toEqual(["push:/getting-started?step=profit"])
  })

  test("the shares and charges step leaves without refreshing its route", () => {
    const step = readFileSync(
      new URL(
        "../../components/getting-started/shares-charges-step.tsx",
        import.meta.url
      ),
      "utf8"
    )

    expect(step).toContain(
      "navigateWithFreshWizardState(router, redirectTo, {\n          refreshDestination: false,"
    )
  })
})
