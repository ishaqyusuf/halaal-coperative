import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8")
}

describe("loans workspace Midday conformance", () => {
  test("prefetches only the active URL-owned view", () => {
    const route = read("../../app/(app)/(sidebar)/loans/page.tsx")

    expect(route).toContain('activeView === "portfolio"')
    expect(route).toContain("getLoanPortfolioListInput(filter, sort, memberId)")
    expect(route).toContain("getLoanRequestListInput(filter, sort, memberId)")
    expect(route).toContain("await batchPrefetch([")
    expect(route).not.toContain("getServerCaller")
    expect(route).not.toContain("setQueryData")
  })

  test("mounts one active responsive table behind flat line tabs", () => {
    const pageView = read("../../components/loans-page-view.tsx")
    const dataView = read("../../components/tables/loans/data-view.tsx")
    const tabs = read("../../components/tables/loans/view-tabs.tsx")

    expect(pageView).toContain("<LoansDataView")
    expect(pageView).not.toContain("TabsContent")
    expect(pageView).toContain('activeView === "requests"')
    expect(dataView).toContain('view === "requests" ?')
    expect(dataView).toContain("<ResponsiveDataView")
    expect(dataView).toContain('id="loans-active-view"')
    expect(tabs).toContain('role="tablist"')
    expect(tabs).toContain('role="tab"')
    expect(tabs).toContain("border-b-2 border-transparent")
    expect(tabs).toContain("portfolioStatus: null")
    expect(tabs).toContain("requestStatus: null")
    expect(tabs).toContain("setSortParams({ sort: null })")
    expect(tabs).toContain("{ shallow: false }")
  })

  test("keeps filter presentation responsive and sorting view-specific", () => {
    const toolbar = read("../../components/loans-mobile-toolbar.tsx")
    const drawer = read("../../components/loans-filter-drawer.tsx")

    expect(toolbar).toContain("<DropdownMenu")
    expect(toolbar).toContain("isMobile && mobileFilterOpen")
    expect(toolbar).toContain("getLoanSortOptions(activeView)")
    expect(drawer).toContain('id: "requestedAt,desc"')
    expect(drawer).toContain('id: "loanProductName,asc"')
    expect(drawer).toContain('id: "estimatedMonthlyServicing,desc"')
    expect(drawer).toContain("divide-y divide-border border-y border-border")
    expect(drawer).not.toContain("border border-border px-3")
    expect(drawer).toContain("await Promise.all")
  })

  test("explains blocked intake and distinguishes empty from filtered mobile views", () => {
    const pageView = read("../../components/loans-page-view.tsx")
    const toolbar = read("../../components/loans-mobile-toolbar.tsx")
    const requests = read(
      "../../components/tables/loans/mobile-request-list.tsx"
    )
    const portfolio = read(
      "../../components/tables/loans/mobile-portfolio-list.tsx"
    )

    expect(pageView).toContain('id="loan-intake-blocker"')
    expect(pageView).toContain("md:hidden")
    expect(toolbar).toContain("aria-describedby={")
    expect(toolbar).toContain('intakeDisabled ? "loan-intake-blocker"')
    expect(requests).toContain('"No loan requests yet"')
    expect(requests).toContain('"No matching loan requests"')
    expect(portfolio).toContain('"No loans yet"')
    expect(portfolio).toContain('"No matching loans"')
  })
})
