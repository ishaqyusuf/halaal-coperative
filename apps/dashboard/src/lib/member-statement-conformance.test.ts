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
    expect(loader).toContain("getMemberStatementDetail")
    expect(loader).toContain("allStaffRoles")
    expect(loader).not.toContain("getMemberOperationalReadiness")
  })

  test("keeps document actions, hierarchy, and summaries phone responsive", () => {
    const view = read("../components/member-statement-view.tsx")
    const section = read("../components/dashboard/section.tsx")

    expect(view).toContain("statement-export")
    expect(view.match(/h-11 w-full md:h-9 md:w-auto/g)?.length).toBe(2)
    expect(view).toContain(
      "grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-5"
    )
    expect(view.match(/headingLevel=\{2\}/g)?.length).toBe(3)
    expect(section).toContain('const Heading = headingLevel === 2 ? "h2" : "h3"')
  })
})
