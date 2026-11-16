import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8")
}

describe("table residue (WP15)", () => {
  test("the imports table recovers from a failed read", () => {
    const view = read("../components/imports-settings-view.tsx")
    const boundary = read("../components/tables/imports/error-boundary.tsx")

    expect(view).toMatch(
      /<ImportsDataErrorBoundary>\s*<Suspense fallback={<ImportTableLoading \/>}>/
    )
    expect(boundary).toContain("QueryErrorResetBoundary")
    expect(boundary).toContain("Try again")
  })

  test("loans search uses the shared search filter input", () => {
    const toolbar = read("../components/loans-mobile-toolbar.tsx")

    // Phones: the filter button opens the drawer; wider: the dropdown.
    expect(toolbar.match(/<SearchFilterDropdownInput/g)).toHaveLength(2)
    expect(toolbar).toContain("onFilterClick={() => setMobileFilterOpen(true)}")
    expect(toolbar).not.toContain("<InputGroup")
  })

  test("a contributions row opens its details sheet without a new read", () => {
    const table = read("../components/tables/contributions/data-table.tsx")
    const mobile = read("../components/tables/contributions/mobile-item.tsx")
    const view = read("../components/tables/contributions/data-view.tsx")
    const sheet = read("../components/sheets/contribution-detail-sheet.tsx")
    const registry = read("./workflow-presentations.ts")

    expect(table).toContain("onCellClick={openEntry}")
    expect(mobile).toContain('contributionSheetType: "details"')
    expect(view).toContain("<ContributionDetailSheet />")
    expect(registry).toContain("details: sheet(),\n    editPlan: sheet(),")
    // The sheet reads the rows the ledger query already loaded.
    expect(sheet).toContain("useContributionsQuery()")
    expect(sheet).not.toMatch(/trpc\.contributions\.(get|ledger)\.queryOptions/)
  })
})
