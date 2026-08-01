import { describe, expect, test } from "bun:test"

describe("workspace-ready onboarding handoff", () => {
  // Regression: ISSUE-003 — the primary Get Started control only opened a dev menu
  // Found by /qa on 2026-07-31
  // Report: .gstack/qa-reports/qa-report-halaalvest-localhost-2026-07-31.md
  test("keeps the dashboard link primary when URL variants are available", async () => {
    const source = await Bun.file(
      new URL("../components/signup/onboarding-form.tsx", import.meta.url)
    ).text()
    const dashboardLink = source.indexOf("href={result.dashboardUrl}")
    const variantMenu = source.indexOf(
      "quickFill.enabled && devDashboardUrlVariants.length"
    )

    expect(dashboardLink).toBeGreaterThan(-1)
    expect(variantMenu).toBeGreaterThan(dashboardLink)
    expect(source).toContain("Tenant URL variants")
    expect(source).toContain("URL variants")
  })
})
