import { describe, expect, test } from "bun:test"
import {
  getNavigationLockLabel,
  isInitialMigrationSetupPath,
  resolveInitialMigrationLayoutRedirect,
  shouldOpenFirstRunOnboarding,
} from "./setup-gate"
import { getVisibleDashboardNav } from "./navigation/lib"

describe("initial migration setup gate", () => {
  test("allows operation profile settings during initial setup", () => {
    expect(isInitialMigrationSetupPath("/settings/operation-profile")).toBe(
      true
    )
  })

  test("allows platform document review during initial migration", () => {
    expect(isInitialMigrationSetupPath("/settings/platform-documents")).toBe(
      true
    )
    expect(
      resolveInitialMigrationLayoutRedirect({
        pathname: "/settings/platform-documents",
        shouldRedirectAdminToSetup: true,
        shouldRedirectAdminToSuccess: false,
      })
    ).toBeNull()
    expect(
      shouldOpenFirstRunOnboarding({
        alreadyInOnboarding: true,
        canUseLiveWorkspace: true,
        isQaAuthorized: false,
        isWorkspaceAdmin: true,
      })
    ).toBe(false)
  })

  test("allows member backfill workflow during initial setup", () => {
    expect(isInitialMigrationSetupPath("/members")).toBe(true)
    expect(isInitialMigrationSetupPath("/members/member-123")).toBe(true)
    expect(isInitialMigrationSetupPath("/members/member-123/backfill")).toBe(
      true
    )
    expect(
      isInitialMigrationSetupPath("/members/member-123/backfill/review")
    ).toBe(true)
  })

  test("does not treat unrelated settings pages as setup paths", () => {
    expect(isInitialMigrationSetupPath("/settings/roles")).toBe(false)
  })

  test("does not allow unrelated member sub-workspaces during initial setup", () => {
    expect(isInitialMigrationSetupPath("/members/member-123/activity")).toBe(
      false
    )
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

  test("does not hijack QA-authorized workspace verification", () => {
    expect(
      shouldOpenFirstRunOnboarding({
        alreadyInOnboarding: false,
        canUseLiveWorkspace: true,
        isQaAuthorized: true,
        isWorkspaceAdmin: true,
      })
    ).toBe(false)

    expect(
      shouldOpenFirstRunOnboarding({
        alreadyInOnboarding: false,
        canUseLiveWorkspace: true,
        isQaAuthorized: false,
        isWorkspaceAdmin: true,
      })
    ).toBe(true)
  })

  test("labels exactly the navigation destinations the layout would redirect", () => {
    const hrefs = getVisibleDashboardNav("tenant_admin").flatMap((module) =>
      module.sections.flatMap((section) =>
        section.links.flatMap((link) => [
          ...(link.href ? [link.href] : []),
          ...(link.subLinks ?? []).flatMap((subLink) =>
            subLink.href ? [subLink.href] : []
          ),
        ])
      )
    )

    expect(hrefs.length).toBeGreaterThan(0)

    for (const shouldRedirectAdminToSetup of [true, false]) {
      for (const href of hrefs) {
        const redirect = resolveInitialMigrationLayoutRedirect({
          pathname: href,
          shouldRedirectAdminToSetup,
          shouldRedirectAdminToSuccess: !shouldRedirectAdminToSetup,
        })

        expect(
          getNavigationLockLabel({ href, shouldRedirectAdminToSetup })
        ).toBe(redirect ? "After setup" : null)
      }
    }
  })

  test("locks live destinations while setup is incomplete", () => {
    for (const href of ["/", "/loans", "/reports", "/settings/roles"]) {
      expect(
        getNavigationLockLabel({ href, shouldRedirectAdminToSetup: true })
      ).toBe("After setup")
    }

    for (const href of [
      "/getting-started",
      "/members",
      "/settings/imports/members",
      "/settings/finance/migration",
    ]) {
      expect(
        getNavigationLockLabel({ href, shouldRedirectAdminToSetup: true })
      ).toBeNull()
    }
  })

  test("keeps navigation enabled during member migration", () => {
    for (const href of ["/", "/loans", "/reports", "/settings/roles"]) {
      expect(
        getNavigationLockLabel({ href, shouldRedirectAdminToSetup: false })
      ).toBeNull()
    }
  })

  test("reads the path of navigation hrefs with queries or trailing slashes", () => {
    expect(
      getNavigationLockLabel({
        href: "/settings/roles?roleSettingsSheetType=assign",
        shouldRedirectAdminToSetup: true,
      })
    ).toBe("After setup")
    expect(
      getNavigationLockLabel({
        href: "/settings/imports/",
        shouldRedirectAdminToSetup: true,
      })
    ).toBeNull()
  })
})
