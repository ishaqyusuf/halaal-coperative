import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8")
}

describe("member statement Midday conformance", () => {
  test("owns a focused route loader and statement-specific boundaries", () => {
    const route = read(
      "../app/(app)/(sidebar)/members/[memberId]/statement/page.tsx"
    )
    const loading = read(
      "../app/(app)/(sidebar)/members/[memberId]/statement/loading.tsx"
    )
    const error = read(
      "../app/(app)/(sidebar)/members/[memberId]/statement/error.tsx"
    )
    const loader = read("../lib/members/load-member-statement-page.ts")
    const states = read("../components/member-statement-page-states.tsx")

    expect(route).toContain('title: "Member statement | Halaalvest"')
    expect(route).toContain("loadMemberStatementPageData")
    expect(route).toContain("<MemberStatementUnavailableView")
    expect(loading).toContain("<MemberStatementSkeleton")
    expect(states).toContain('role="status"')
    expect(states).toContain('aria-label="Loading member statement"')
    expect(error).toContain("dashboard.member_statement_error_boundary")
    expect(error).toContain("reset")
    // Lean statement read: no full detail fan-out or unused charge includes.
    expect(loader).toContain("getMemberStatementView")
    expect(loader).toContain("allStaffRoles")
    expect(loader).not.toContain("getMemberOperationalReadiness")
  })

  test("keeps document actions, hierarchy, and summaries phone responsive", () => {
    const view = read("../components/member-statement-view.tsx")
    const section = read("../components/dashboard/section.tsx")
    const balances = read("../components/member-balance-stat-cards.tsx")

    expect(view).toContain("statement-export")
    expect(view).toContain("<PrintPageButton />")
    expect(view).toContain("buildMemberStatementLines")
    // Shared with the staff member detail so both show opening balances.
    expect(view).toContain(
      "<MemberBalanceStatCards summary={detail.summary} />"
    )
    expect(balances).toContain("grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4")
    for (const label of ["Special savings", "Shares", "Procurement and food"]) {
      expect(balances).toContain(`label="${label}"`)
    }
    expect(view.match(/headingLevel=\{2\}/g)?.length).toBe(3)
    expect(view).toContain('title="Money in and out"')
    expect(section).toContain(
      'const Heading = headingLevel === 2 ? "h2" : "h3"'
    )
  })
})
