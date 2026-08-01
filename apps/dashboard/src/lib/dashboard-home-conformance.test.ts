import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8")
}

describe("dashboard home Midday conformance", () => {
  test("owns metadata, route boundaries, hydration, and suspense fallbacks", () => {
    const route = read("../app/(home)/page.tsx")
    const loading = read("../app/(home)/loading.tsx")
    const error = read("../app/(home)/error.tsx")
    const states = read("../components/dashboard-home-page-states.tsx")

    expect(route).toContain('title: "Overview | Halaalvest"')
    expect(route).toContain(
      "await prefetch(trpc.overview.summary.queryOptions())"
    )
    expect(route).toContain("<HydrateClient>")
    expect(route).toContain("fallback={<OverviewSkeleton />}")
    expect(route).toContain("fallback={<DashboardHomeSkeleton />}")
    expect(loading).toContain("<DashboardHomeSkeleton")
    expect(error).toContain("dashboard.home_error_boundary")
    expect(error).toContain("reset")
    expect(states).toContain('role="status"')
  })

  test("preserves staff and member role branches behind one server loader", () => {
    const route = read("../app/(home)/page.tsx")
    const loader = read("./dashboard/load-tenant-home-page.ts")

    expect(route).toContain('data.state === "member-ready"')
    expect(route).toContain("<MemberPortalOverview")
    expect(route).toContain("<OverviewView")
    expect(loader).toContain('state: "staff-ready"')
    expect(loader).toContain('state: "member-ready"')
    expect(loader).toContain("getMemberOperationalReadiness")
  })

  test("keeps member overview actions and summaries phone responsive", () => {
    const overview = read("../components/member-portal-overview.tsx")
    const actions = read("../components/member-portal-actions.tsx")
    const overviewUi = read("../components/widgets/overview-ui.tsx")
    const skeleton = read("../components/widgets/overview-skeleton.tsx")

    expect(overview).toContain("<MemberPortalActions")
    expect(overview).toContain("grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-6")
    expect(overview).toContain("sm:flex-row sm:items-center sm:gap-4")
    expect(
      overview.match(
        /<MemberLink href="\/member-statement-export">Download<\/MemberLink>/g
      )?.length
    ).toBe(1)
    expect(actions).toContain("<MobileActionsDrawer")
    expect(actions).toContain('aria-label="More member dashboard actions"')
    expect(actions).toContain('className="flex w-full gap-2 md:hidden"')
    expect(overviewUi).toContain("md:h-7 md:px-2.5")
    expect(skeleton).toContain('className="h-11 w-32 md:h-7"')
  })
})
