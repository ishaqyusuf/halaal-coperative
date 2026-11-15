import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8")
}

describe("getting started Midday conformance", () => {
  test("keeps the route compositional with metadata and recovery boundaries", () => {
    const route = read("../../app/(app)/(sidebar)/getting-started/page.tsx")
    const loading = read(
      "../../app/(app)/(sidebar)/getting-started/loading.tsx"
    )
    const error = read("../../app/(app)/(sidebar)/getting-started/error.tsx")
    const states = read("../../components/getting-started-page-states.tsx")

    expect(route).toContain('title: "Getting started | Halaalvest"')
    expect(route).toContain("GettingStartedPageContent")
    expect(route).not.toContain("getDashboardServerContext")
    expect(route).not.toContain("getTenantFinanceSetup")
    expect(loading).toContain("GettingStartedPageSkeleton")
    expect(states).toContain('role="status"')
    expect(states).toContain('aria-label="Loading migration setup"')
    expect(states).toContain("lg:hidden")
    expect(error).toContain("reset")
    expect(error).toContain(
      "No cooperative finance or member records were changed"
    )
  })

  test("loads tenant-scoped setup data and hands member history to step 10", () => {
    const content = read("./getting-started-page-content.tsx")

    expect(content).toContain("getDashboardServerContext")
    expect(content).toContain("createDbRuntime")
    // Each step reads only the setup parts it shows (Phase 4.4).
    expect(content).toContain("getTenantFinanceSetup(tenantId, undefined, {")
    expect(content).toContain("gettingStartedStepParts(")
    // Request-cached: the sidebar layout's setup gate already read both.
    expect(content).toContain(
      "getRequestInitialMigrationState(context.tenant.id)"
    )
    expect(content).toContain(
      "getRequestTenantOperationProfile(context.tenant.id)"
    )
    expect(content).not.toContain("getTenantInitialMigrationState(")
    // Member history now lives on the step 10 members checklist, so Getting
    // Started no longer loads per-member backfill data.
    expect(content).not.toContain("listLegacyLoanMigrationDrafts")
    expect(content).not.toContain("buildBackfillDraftInputForMember")
    expect(content).toContain('if (activeStep === "admin-member")')
    expect(content).toContain('tenantRedirect("/")')
    expect(content).toContain('tenantRedirect("/onboarding-success")')
    // Old ?step= ids redirect; resume lands on the first step not done.
    expect(content).toContain("resolveLegacyGettingStartedStep(")
    expect(content).toContain("resolveGettingStartedResumeStep(progress)")
  })

  test("keeps steps URL-owned and renders the One Path rail", () => {
    const params = read("../../hooks/use-getting-started-params.ts")
    const view = read("../../components/getting-started-page-view.tsx")
    const rail = read("../../components/one-path/one-path-rail.tsx")
    const step = read("../../components/one-path/one-path-step.tsx")
    const model = read("./getting-started-step-model.ts")

    expect(params).toContain("...gettingStartedStepKeys,")
    expect(params).toContain("...legacyGettingStartedStepKeys,")
    expect(params).toContain("migrationMemberId")
    // The rail reads the shared journey map and stays visible on every step.
    expect(rail).toContain('aria-label="Setup steps"')
    expect(rail).toContain(
      'aria-current={state === "current" ? "step" : undefined}'
    )
    expect(rail).toContain("onboardingJourneySteps")
    expect(rail).toContain("lg:hidden")
    expect(rail).toContain("lg:sticky")
    expect(rail).toContain("All steps")
    expect(view).toContain("<OnePathRail")
    expect(view).not.toContain(
      'props.activeStep === "operation-profile" ? null'
    )
    expect(view).toContain("max-md:[&_button]:min-h-11")
    // The "Step N of 11" eyebrow comes from the map; Back stays 44px tall.
    expect(step).toContain("formatJourneyStepCounter(stepKey)")
    expect(step).toContain('"h-11"')
    expect(step).toContain("<details")
    expect(model).toContain("getOrderedGettingStartedStepKeys")
    expect(model).toContain("getGettingStartedStepHref")
    expect(model).toContain('return "/onboarding-success"')
  })

  test("keeps transport types and step rules outside the main view", () => {
    const view = read("../../components/getting-started-page-view.tsx")
    const types = read("./getting-started-page-types.ts")

    expect(view).toContain("getting-started-page-types")
    expect(view).toContain("getting-started-step-model")
    expect(view).not.toContain("type GettingStartedPageViewProps =")
    expect(view).not.toContain("const setupStepKeys")
    expect(types).toContain("export type GettingStartedPageViewProps")
  })
})
