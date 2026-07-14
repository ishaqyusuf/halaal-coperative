import { describe, expect, test } from "bun:test"
import { getVisibleDashboardNav } from "./lib"

function visibleHrefs(
  hiddenPaths: string[] = [],
  role:
    | "finance_officer"
    | "member"
    | "operations_officer"
    | "super_admin"
    | "tenant_admin" = "tenant_admin"
) {
  return getVisibleDashboardNav(role, hiddenPaths).flatMap((module) =>
    module.sections.flatMap((section) =>
      section.links.filter((link) => link.show).map((link) => link.href)
    )
  )
}

describe("dashboard navigation operation profile filtering", () => {
  test("hides operation-profile-disabled service paths without removing core nav", () => {
    const hrefs = visibleHrefs([
      "/food-purchase",
      "/payment-receipts",
      "/procurement",
      "/support",
    ])

    expect(hrefs).not.toContain("/food-purchase")
    expect(hrefs).not.toContain("/payment-receipts")
    expect(hrefs).not.toContain("/procurement")
    expect(hrefs).not.toContain("/support")
    expect(hrefs).toContain("/contributions")
    expect(hrefs).toContain("/reports")
    expect(hrefs).toContain("/settings/operation-profile")
  })

  test("shows loans to member users for self-service requests", () => {
    const hrefs = visibleHrefs([], "member")

    expect(hrefs).toContain("/loans")
  })
})
