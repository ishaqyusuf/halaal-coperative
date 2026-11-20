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
    expect(route).toContain("<HydrateClient>")
    expect(params).toContain("useQueryStates(reportsFilterParamsSchema")
    expect(loading).toContain("<ReportsPageSkeleton")
    expect(states).toContain('role="status"')
    expect(states).toContain('aria-label="Loading reports"')
    expect(error).toContain("dashboard.reports_error_boundary")
    expect(error).toContain("reset")
  })

  test("downloads open a modal; the page itself owns no form or table", () => {
    const view = read("../components/reports/reports-view.tsx")
    const dialog = read("../components/sheets/report-export-dialog.tsx")
    const registry = read("./workflow-presentations.ts")

    expect(view).toContain("<ReportExportDialog")
    expect(view).toContain("data-report-export")
    expect(view).not.toContain("<DataTable")
    expect(view).not.toContain("<form")
    expect(view).not.toContain("useMutation")
    expect(view).not.toContain("<h1")
    expect(dialog).toContain('getWorkflowPresentation(\n        "reportExport"')
    expect(registry).toContain('download: dialog("compact")')
  })

  test("the summary reads sums in SQL, never the home overview", () => {
    const query = read("../../../../packages/db/src/queries/reports.ts")

    expect(query).not.toContain("getOverviewSummary")
    expect(query).toContain("getMoneyMovement")
    expect(query).toContain(
      "{ fromDate: input.fromDate, limit: 5, toDate: input.toDate }"
    )
  })
})

describe("activity log conformance", () => {
  test("a plain paged list with a URL sheet per entry, no polling", () => {
    const route = read("../app/(app)/(sidebar)/reports/audit/page.tsx")
    const list = read("../components/activity/activity-list.tsx")
    const filter = read("../components/audit-search-filter.tsx")
    const sheet = read("../components/sheets/activity-entry-sheet.tsx")
    const registry = read("./workflow-presentations.ts")

    expect(route).toContain("getActivityListInput(filters)")
    expect(route).toContain("trpc.reports.auditTimeline.infiniteQueryOptions")
    expect(list).toContain("trpc.reports.auditTimeline.infiniteQueryOptions")
    expect(filter).toContain("setFilters(patch, { ...options, shallow: true })")
    expect(list).toContain("Show more")
    expect(list).not.toContain("refetchInterval")
    expect(list).not.toContain("useLiveTablePollInterval")
    expect(sheet).toContain("useActivityEntryParams()")
    expect(sheet).toContain('getWorkflowPresentation("activityEntry"')
    expect(registry).toContain('activityEntry: {\n    details: sheet("form")')
  })

  test("counts the total once and filters by plain area", () => {
    const router = read("../../../api/src/routers/reports.route.ts")
    const filters = read("../../../../packages/db/src/filter-metadata.ts")

    expect(router).toContain("filters.cursor")
    expect(router).not.toContain('actorType: "user"')
    expect(filters).toContain('optionFilter(\n      "area"')
  })
})
