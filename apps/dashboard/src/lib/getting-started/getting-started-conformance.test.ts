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
    expect(states).toContain("xl:hidden")
    expect(error).toContain("reset")
    expect(error).toContain(
      "No cooperative finance or member records were changed"
    )
  })

  test("loads tenant-scoped setup data and defers member history to its step", () => {
    const content = read("./getting-started-page-content.tsx")
    const memberBranch = content.slice(
      content.indexOf('activeStep === "admin-member"')
    )

    expect(content).toContain("getDashboardServerContext")
    expect(content).toContain("createDbRuntime")
    expect(content).toContain("getTenantFinanceSetup(context.tenant.id)")
    expect(content).toContain(
      "getTenantInitialMigrationState(context.tenant.id)"
    )
    expect(content).toContain("getTenantOperationProfile(context.tenant.id)")
    expect(memberBranch).toContain("listLegacyLoanMigrationDrafts")
    expect(memberBranch).toContain("listMembers")
    expect(memberBranch).toContain("listInitialMigrationMemberReview")
    expect(memberBranch).toContain("listMemberAmountLogs")
    expect(memberBranch).toContain("listMemberActivityEvents")
    expect(memberBranch).toContain("listMigrationProfitAdjustmentOptions")
    expect(content).toContain('tenantRedirect("/")')
    expect(content).toContain('tenantRedirect("/onboarding-success")')
  })

  test("keeps steps URL-owned and renders responsive migration navigation", () => {
    const params = read("../../hooks/use-getting-started-params.ts")
    const view = read("../../components/getting-started-page-view.tsx")
    const model = read("./getting-started-step-model.ts")

    expect(params).toContain("parseAsStringEnum([...gettingStartedStepKeys])")
    expect(params).toContain("migrationMemberId")
    expect(params).toContain("profileStep")
    expect(view).toContain('aria-label="Migration setup steps"')
    expect(view).toContain('aria-current={isActive ? "step" : undefined}')
    expect(view).toContain("xl:hidden")
    expect(view).toContain("xl:sticky")
    expect(view).toContain("max-md:[&_button]:min-h-11")
    expect(view).toContain('"h-11 w-full md:h-10 md:w-auto"')
    expect(view).toContain('"h-11 w-full lg:h-10 lg:w-auto"')
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
