import { describe, expect, test } from "bun:test"

describe("dashboard topbar policy", () => {
  test("does not duplicate sidebar destinations as header quick links", async () => {
    const topbar = await Bun.file(
      new URL("../components/dashboard/topbar.tsx", import.meta.url),
    ).text()
    const shell = await Bun.file(
      new URL("../components/dashboard-shell.tsx", import.meta.url),
    ).text()

    expect(topbar).not.toContain("quickLinks")
    expect(shell).not.toContain("getDashboardQuickLinks")
    expect(topbar).toContain("onOpenMobileNav")
    expect(topbar).toContain("<DashboardThemeToggle />")
    expect(topbar).toContain('href="/auth/logout"')
  })
})
