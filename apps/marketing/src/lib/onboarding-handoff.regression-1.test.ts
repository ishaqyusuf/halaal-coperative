import { describe, expect, test } from "bun:test"

describe("workspace-ready onboarding handoff", () => {
  test("signs the admin in with a top-level POST to the tenant dashboard", async () => {
    const source = await Bun.file(
      new URL("../components/signup/onboarding-form.tsx", import.meta.url)
    ).text()

    expect(source).toContain("action={result.sessionHandoff.action}")
    expect(source).toContain('method="post"')
    expect(source).toMatch(
      /name="token"\s+type="hidden"\s+value=\{result\.sessionHandoff\.token\}/
    )
    expect(source).toContain("Opening your workspace…")
    // Never navigate with the token in a query string.
    expect(source).not.toMatch(/token=\$\{/)
  })

  // Regression: ISSUE-003 — the primary Get Started control only opened a dev menu
  // Found by /qa on 2026-07-31
  // Report: .gstack/qa-reports/qa-report-halaalvest-localhost-2026-07-31.md
  test("keeps the dashboard link primary in the workspace-ready fallback", async () => {
    const source = await Bun.file(
      new URL("../components/signup/onboarding-form.tsx", import.meta.url)
    ).text()
    const fallback = source.indexOf('title="Your workspace is ready"')
    const dashboardLink = source.indexOf("href={result.dashboardUrl}")
    const variantMenu = source.indexOf(
      "quickFill.enabled && devDashboardUrlVariants.length"
    )

    expect(fallback).toBeGreaterThan(-1)
    expect(dashboardLink).toBeGreaterThan(-1)
    expect(variantMenu).toBeGreaterThan(dashboardLink)
    expect(source).toContain("Tenant URL variants")
    expect(source).toContain("URL variants")
  })

  test("mints the handoff only in the onboarding response, never in email or QA previews", async () => {
    const route = await Bun.file(
      new URL("../../app/api/onboarding/route.ts", import.meta.url)
    ).text()
    const emailCall = route.indexOf("createWorkspaceReadyEmail({")
    const deliveryCall = route.indexOf("notificationService.tryEmail(")
    const handoffCall = route.indexOf("await createSessionHandoff({")

    expect(emailCall).toBeGreaterThan(-1)
    expect(handoffCall).toBeGreaterThan(deliveryCall)
    expect(handoffCall).toBeGreaterThan(emailCall)
    // The token is only read inside the helper and the response field.
    expect(route.match(/handoff\.token/g)).toHaveLength(1)
    expect(route).toContain('"Cache-Control": "no-store"')
    expect(route).toContain("buildWorkspaceSessionHandoffAction({")
    expect(route).not.toMatch(/console\.(log|info|error)\([^)]*token/)
  })
})
