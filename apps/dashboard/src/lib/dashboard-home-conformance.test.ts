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

    expect(route).toContain('title: "Home | Halaalvest"')
    expect(route).toContain(
      "prefetch(trpc.overview.summary.queryOptions())"
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

  test("keeps the member home lean and phone friendly", () => {
    const overview = read("../components/member-portal-overview.tsx")
    const loader = read("./dashboard/load-tenant-home-page.ts")
    const skeleton = read("../components/widgets/overview-skeleton.tsx")

    // One snapshot read, not the full statement.
    expect(loader).toContain("getMemberHomeSnapshot")
    expect(loader).not.toContain("getMemberStatementDetail")
    // One column of numbers on phones, no nested <main>.
    expect(overview).toContain("grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4")
    expect(overview).not.toContain("DashboardPageFrame")
    expect(
      overview.match(/href="\/member-statement-export"/g)?.length
    ).toBe(1)
    expect(overview).toContain("min-h-14")
    expect(skeleton).toContain("SummaryCardSkeleton")
  })

  test("staff overview shows one title and plain, role-aware work", () => {
    const view = read("../components/widgets/overview-view.tsx")

    expect(view).not.toContain("<h1")
    expect(view).toContain("getOverviewAttentionItems(data.actionQueue, role)")
  })
})
