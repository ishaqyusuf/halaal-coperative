import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const dashboardRoot = resolve(import.meta.dir, "../..")

function read(relativePath: string) {
  return readFileSync(resolve(dashboardRoot, relativePath), "utf8")
}

describe("contributions workspace conformance", () => {
  test("prefetches only the active ledger through the shared input contract", () => {
    const route = read("app/(app)/(sidebar)/contributions/page.tsx")

    expect(route).toContain("getContributionListInput(filters, sort)")
    expect(route).toContain('if (activeView === "ledger")')
    expect(route).toContain("await batchPrefetch")
    expect(route).not.toContain("getServerCaller")
    expect(route).not.toContain("getQueryClient")
    expect(route).not.toContain("setQueryData")
  })

  test("renders one URL-owned workspace view with responsive ledger presentation", () => {
    const pageView = read("components/contributions-page-view.tsx")
    const dataView = read("components/tables/contributions/data-view.tsx")
    const dataTable = read("components/tables/contributions/data-table.tsx")
    const filterDrawer = read("components/contributions-filter-drawer.tsx")
    const emptyState = read("components/tables/contributions/empty-states.tsx")

    expect(pageView).toContain('["ledger", "commitments", "collections"]')
    expect(pageView).toContain('id="contributions-active-view"')
    expect(pageView).toContain(
      "aria-labelledby={`contributions-${activeView}-tab`}"
    )
    expect(pageView).toContain("<ContributionsMobileToolbar")
    expect(pageView).toContain("<ContributionsDataView")
    expect(dataView).toContain("<ResponsiveDataView")
    expect(dataView).toContain("<ContributionsMobileSkeleton")
    expect(dataTable).not.toContain("refetchInterval")
    expect(dataTable).not.toContain("refetchOnMount")
    expect(filterDrawer).toContain(
      "divide-y divide-border border-y border-border"
    )
    expect(filterDrawer).not.toContain("border border-border px-3")
    expect(filterDrawer).toContain("await Promise.all")
    expect(emptyState).not.toContain("NoResults")
    expect(emptyState).not.toContain('actionLabel="Clear filters"')
  })

  test("keeps contribution workflows full-screen on mobile", () => {
    const sheet = read("components/sheets/contribution-sheet.tsx")
    const forms = read("components/forms/finance-forms.tsx")

    expect(sheet).toContain("mobileFullScreen")
    expect(forms).toContain('totalAmount: loanId ? "50000" : "30000"')
    expect(forms).toContain(
      'scheduledLoanServicingAmount: loanId ? "15000" : ""'
    )
    expect(forms).toContain('form.watch("loanId")')
    expect(forms).toContain('form.setValue("extraLoanPaymentAmount", "")')
  })
})
