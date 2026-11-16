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
    expect(route).toContain("batchPrefetch([")
    expect(route).not.toContain("getServerCaller")
    expect(route).not.toContain("setQueryData")
  })

  test("mounts one active responsive table behind flat line tabs", () => {
    const pageView = read("../../components/loans-page-view.tsx")
    const dataView = read("../../components/tables/loans/data-view.tsx")
    const tabs = read("../../components/tables/loans/view-tabs.tsx")

    expect(pageView).toContain("<LoansDataView")
    expect(pageView).not.toContain("TabsContent")
    expect(dataView).toContain('view === "requests" ?')
    expect(dataView).toContain("<ResponsiveDataView")
    expect(dataView).toContain('id="loans-active-view"')
    // The shared ViewTabs (Tabs primitive) gives role="tablist"/"tab".
    expect(tabs).toContain("<ViewTabs")
    expect(tabs).toContain('idPrefix="loans"')
    expect(tabs).toContain('look="tall"')
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
    // The reason and its fix link show at every width (QA F1/F9).
    expect(pageView).toContain("{intakeFix.label}")
    // The labelled request button (phone and desktop) is off while blocked.
    expect(pageView).toContain("disabled={Boolean(requestBlockedReason)}")
    expect(toolbar).not.toContain("<Plus")
    expect(requests).toContain('"No loan requests yet"')
    expect(requests).toContain('"No requests match"')
    expect(portfolio).toContain('"No loans yet"')
    expect(portfolio).toContain('"No loans match"')
  })

  test("shows capacity, deployable funds and intake on phones (QA F9)", () => {
    const pageView = read("../../components/loans-page-view.tsx")
    const loader = read("./load-loans-page.ts")
    const sectionStart = pageView.indexOf('aria-label="Money to lend"')
    const section = pageView.slice(sectionStart, sectionStart + 400)

    expect(sectionStart).toBeGreaterThan(-1)
    expect(section).not.toContain("hidden")
    expect(section).toContain("grid-cols-2")
    expect(section).toContain("md:grid-cols-3")
    expect(pageView).toContain('label="Can lend now"')
    expect(loader).toContain(
      'missing: "Loan requests are not open for this month yet."'
    )
  })
})
