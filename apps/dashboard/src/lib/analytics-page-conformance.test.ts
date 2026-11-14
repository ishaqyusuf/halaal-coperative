import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8")
}

describe("analytics workspace conformance", () => {
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

  test("uses the top bar as the only page title and plain shared pieces", () => {
    const view = read("../components/analytics/analytics-view.tsx")

    expect(view).not.toContain("<h1")
    expect(view).toContain("<SummaryCard")
    expect(view).toContain("<PeriodButtons")
    expect(view).toContain("<MonthColumnsChart")
  })

  test("charts carry a legend and a numbers table, and never scroll sideways", () => {
    const chart = read("../components/analytics/month-columns-chart.tsx")

    expect(chart).toContain('aria-label="Key"')
    expect(chart).toContain("Show the numbers")
    expect(chart).toContain("<table")
    expect(chart).toContain("formatCompactNaira")
    expect(chart).not.toContain("overflow-x")
  })

  test("sums in SQL and reads late payments at read time", () => {
    const query = read("../../../../packages/db/src/queries/analytics.ts")
    const figures = read(
      "../../../../packages/db/src/queries/report-figures.ts"
    )

    expect(query).not.toContain("getOverviewSummary")
    expect(query).not.toContain("findMany")
    expect(figures).toContain("$queryRaw")
    expect(figures).toContain("s.due_at < ${asOf}::timestamptz")
    expect(figures).not.toContain("findMany")
  })
})
