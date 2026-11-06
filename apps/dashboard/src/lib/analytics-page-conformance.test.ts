import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8")
}

describe("analytics workspace conformance", () => {
  test("lets top metric cards grow with their descriptions", () => {
    const view = read("../components/analytics/analytics-view.tsx")

    expect(view).toContain("!h-auto min-h-[160px]")
    expect(view).toContain("mt-2 min-h-10 text-xs leading-5")
    expect(view).not.toContain("h-full min-h-[112px]")
  })

  test("keeps the period in the URL and streams the summary", () => {
    const page = read("../app/(app)/(sidebar)/analytics/page.tsx")
    const view = read("../components/analytics/analytics-view.tsx")

    expect(page).toContain("loadAnalyticsParams(await searchParams)")
    expect(page).toContain(
      "prefetch(trpc.analytics.summary.queryOptions({ period }))"
    )
    expect(page).not.toContain("await prefetch")
    expect(view).toContain("useAnalyticsParams()")
    expect(view).not.toContain("useState")
    expect(view).toContain("<Suspense fallback={<AnalyticsContentSkeleton />}>")
  })
})
