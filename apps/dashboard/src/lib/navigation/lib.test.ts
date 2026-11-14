import { describe, expect, test } from "bun:test"
import {
  canAccessDashboardPath,
  getDashboardRouteTitle,
  getVisibleDashboardNav,
  shouldShowPageHeaderTitle,
} from "./lib"

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

  test("makes current platform documents reachable to members and staff", () => {
    for (const role of [
      "member",
      "finance_officer",
      "operations_officer",
      "tenant_admin",
      "super_admin",
    ] as const) {
      expect(visibleHrefs([], role)).toContain("/settings/platform-documents")
      expect(canAccessDashboardPath("/settings/platform-documents", role)).toBe(
        true
      )
    }
  })
})

describe("dashboard navigation route titles", () => {
  test("keeps the route title when operation-profile navigation is hidden", () => {
    const route = getDashboardRouteTitle("/procurement", "tenant_admin", [
      "/procurement",
    ])

    expect(route.activeItem?.title).toBe("Procurement")
    expect(route.currentModule?.subtitle).toBe("Contributions and controls")
    expect(
      route.modules.flatMap((module) =>
        module.sections.flatMap((section) =>
          section.links.filter((link) => link.show).map((link) => link.href)
        )
      )
    ).not.toContain("/procurement")
  })

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

  test.each(["/getting-started", "/onboarding-success", "/onboarding"])(
    "titles the setup route %s Getting started, not the first module",
    (pathname) => {
      const route = getDashboardRouteTitle(pathname, "tenant_admin")

      expect(route.pageTitle).toBe("Getting started")
      expect(route.pageSubtitle).toBe("Set up your cooperative")
    }
  )

  test("keeps registry titles for sidebar routes", () => {
    const route = getDashboardRouteTitle("/members", "tenant_admin")

    expect(route.pageTitle).toBe("Member registry")
  })

  test("marks a section's own page as the section root, not its records", () => {
    expect(
      getDashboardRouteTitle("/members", "tenant_admin").isSectionRoot
    ).toBe(true)
    expect(
      getDashboardRouteTitle("/members/abc", "tenant_admin").isSectionRoot
    ).toBe(false)
    expect(
      getDashboardRouteTitle("/settings/finance/business", "tenant_admin")
        .isSectionRoot
    ).toBe(false)
  })

  test("drops the module subtitle so the top bar shows one title", () => {
    expect(
      getDashboardRouteTitle("/members", "tenant_admin").pageSubtitle
    ).toBeNull()
  })
})

describe("shouldShowPageHeaderTitle", () => {
  test("hides a page header title on a section's own page", () => {
    expect(
      shouldShowPageHeaderTitle({
        isSectionRoot: true,
        routeTitle: "Repayments",
        title: "Repayment tracking",
      })
    ).toBe(false)
  })

  test("hides a title that repeats the top bar", () => {
    expect(
      shouldShowPageHeaderTitle({
        isSectionRoot: false,
        routeTitle: "Member registry",
        title: "member registry ",
      })
    ).toBe(false)
  })

  test("shows a record title below a section", () => {
    expect(
      shouldShowPageHeaderTitle({
        isSectionRoot: false,
        routeTitle: "Member registry",
        title: "Aisha Bello",
      })
    ).toBe(true)
  })
})
