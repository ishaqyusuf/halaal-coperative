import { describe, expect, test } from "bun:test"
import { getVisibleDashboardNav } from "./lib"

function visibleHrefs(hiddenPaths: string[] = []) {
  return getVisibleDashboardNav("tenant_admin", hiddenPaths).flatMap((module) =>
    module.sections.flatMap((section) =>
      section.links
        .filter((link) => link.show)
        .map((link) => link.href)
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
})
