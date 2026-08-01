import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8")
}

describe("reports Midday conformance", () => {
  test("owns metadata, URL filters, hydration, loading, and retryable error isolation", () => {
    const route = read("../app/(app)/(sidebar)/reports/page.tsx")
    const loading = read("../app/(app)/(sidebar)/reports/loading.tsx")
    const error = read("../app/(app)/(sidebar)/reports/error.tsx")
    const states = read("../components/reports/reports-page-states.tsx")
    const params = read("../hooks/use-reports-filter-params.ts")

    expect(route).toContain('title: "Reports | Halaalvest"')
    expect(route).toContain("loadReportsFilterParams")
    expect(route).toContain("trpc.reports.summary.queryOptions")
    expect(route).toContain("trpc.filters.reports.queryOptions")
    expect(route).toContain("<HydrateClient>")
    expect(params).toContain("useQueryStates(reportsFilterParamsSchema")
    expect(loading).toContain("<ReportsPageSkeleton")
    expect(states).toContain('role="status"')
    expect(states).toContain('aria-label="Loading reports"')
    expect(error).toContain("dashboard.reports_error_boundary")
    expect(error).toContain("reset")
  })

  test("keeps the governance overview compact and phone responsive", () => {
    const view = read("../components/reports/reports-view.tsx")
    const filters = read("../components/reports-search-filter.tsx")
    const reportsQuery = read("../../../../packages/db/src/queries/reports.ts")

    expect(view).toContain("md:grid-cols-2")
    expect(view).toContain("md:hidden")
    expect(view).toContain("divide-y divide-border")
    expect(view).toContain("item.actionLabel")
    expect(view).toContain("break-words")
    expect(view).toContain("max-md:[&_a]:min-h-11")
    expect(view).toContain("max-md:[&_button]:min-h-11")
    expect(filters).toContain("max-md:[&_button]:min-h-11")
    expect(reportsQuery).toContain("listActivityReportEvents")
    expect(reportsQuery).toContain(
      "{ fromDate: input.fromDate, limit: 5, toDate: input.toDate }"
    )
    expect(view.indexOf("<FinanceSnapshot")).toBeLessThan(
      view.indexOf("<AuditTrail")
    )
    expect(view.indexOf("<AuditTrail")).toBeLessThan(
      view.indexOf("<ExportCatalog")
    )
    expect(view).toContain("lg:grid-cols-5")
    expect(view).toContain("items-start gap-4 xl:grid-cols-2")
    expect(view.match(/!block !h-auto min-h-11/g)?.length).toBe(2)
    expect(view.match(/className="!h-auto"/g)?.length).toBe(2)
  })

  test("keeps this overview free of table, form, and mutation ownership", () => {
    const view = read("../components/reports/reports-view.tsx")

    expect(view).not.toContain("<DataTable")
    expect(view).not.toContain("<form")
    expect(view).not.toContain("useMutation")
    expect(view).not.toContain("Sheet")
  })
})
