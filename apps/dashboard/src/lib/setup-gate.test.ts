import { describe, expect, test } from "bun:test"
import {
  isInitialMigrationSetupPath,
  resolveInitialMigrationLayoutRedirect,
} from "./setup-gate"
import { getVisibleDashboardNav } from "./navigation/lib"

describe("initial migration setup gate", () => {
  test("allows operation profile settings during initial setup", () => {
    expect(isInitialMigrationSetupPath("/settings/operation-profile")).toBe(
      true
    )
  })

  test("allows member backfill workflow during initial setup", () => {
    expect(isInitialMigrationSetupPath("/members")).toBe(true)
    expect(isInitialMigrationSetupPath("/members/member-123")).toBe(true)
    expect(
      isInitialMigrationSetupPath("/members/member-123/backfill")
    ).toBe(true)
    expect(
      isInitialMigrationSetupPath("/members/member-123/backfill/review")
    ).toBe(true)
  })

  test("does not treat unrelated settings pages as setup paths", () => {
    expect(isInitialMigrationSetupPath("/settings/roles")).toBe(false)
  })

  test("does not allow unrelated member sub-workspaces during initial setup", () => {
    expect(
      isInitialMigrationSetupPath("/members/member-123/activity")
    ).toBe(false)
  })

  test("does not trap completed setup admins on onboarding success", () => {
    const destinations = [
      "/membership-approvals",
      "/member-signup-links",
      "/reports",
      "/loans",
      "/settings/roles",
    ]

    for (const pathname of destinations) {
      expect(
        resolveInitialMigrationLayoutRedirect({
          pathname,
          shouldRedirectAdminToSetup: false,
          shouldRedirectAdminToSuccess: true,
        })
      ).toBeNull()
    }
  })

  test("allows every role-authorized admin navigation link after setup", () => {
    for (const role of ["super_admin", "tenant_admin"] as const) {
      const destinations = getVisibleDashboardNav(role).flatMap((module) =>
        module.sections.flatMap((section) =>
          section.links.flatMap((link) => (link.href ? [link.href] : []))
        )
      )

      expect(destinations.length).toBeGreaterThan(0)

      for (const pathname of destinations) {
        expect(
          resolveInitialMigrationLayoutRedirect({
            pathname,
            shouldRedirectAdminToSetup: false,
            shouldRedirectAdminToSuccess: true,
          })
        ).toBeNull()
      }
    }
  })

  test("still sends incomplete setup to getting started", () => {
    expect(
      resolveInitialMigrationLayoutRedirect({
        pathname: "/membership-approvals",
        shouldRedirectAdminToSetup: true,
        shouldRedirectAdminToSuccess: false,
      })
    ).toBe("/getting-started")
  })
})
