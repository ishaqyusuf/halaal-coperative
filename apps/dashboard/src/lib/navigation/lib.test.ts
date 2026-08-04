import { describe, expect, test } from "bun:test"
import { getDashboardRouteTitle, getVisibleDashboardNav } from "./lib"

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

describe("dashboard navigation route titles", () => {
  test.each([
    ["/settings/imports", "Imports"],
    ["/settings/imports/batches", "Imports"],
    ["/settings/imports/members", "Imports"],
    ["/settings/finance", "Finance setup"],
    ["/settings/finance/business", "Finance setup"],
  ])("uses the parent title for nested route %s", (pathname, title) => {
    const route = getDashboardRouteTitle(pathname, "tenant_admin")

    expect(route.activeItem?.title).toBe(title)
  })
})
