import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { getSignupLinkAvailability } from "./member-signup-links"

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8")
}

describe("member signup links Midday conformance", () => {
  test("keeps the route compositional with metadata and recovery boundaries", () => {
    const page = read("../../app/(app)/(sidebar)/member-signup-links/page.tsx")
    const loading = read(
      "../../app/(app)/(sidebar)/member-signup-links/loading.tsx"
    )
    const error = read(
      "../../app/(app)/(sidebar)/member-signup-links/error.tsx"
    )

    expect(page).toContain('title: "Member signup links | Halaalvest"')
    expect(page).toContain("await loadMemberSignupLinkParams")
    expect(page).toContain("loadMemberSignupLinksPage")
    expect(page).not.toContain("createMemberSignupLinkToken")
    expect(page).not.toContain("listMemberSignupLinks")
    expect(page).not.toContain("getDashboardServerContext")
    expect(loading).toContain("MemberSignupLinksPageSkeleton")
    expect(error).toContain("MemberSignupLinksError")
    expect(error).toContain("reset")
  })

  test("loads and serializes tenant links only after role and runtime guards", () => {
    const loader = read("./load-member-signup-links-page.ts")

    expect(loader).toContain("memberManagementRoles")
    expect(loader).toContain('status !== "database-configured"')
    expect(loader.indexOf("hasAnyRole")).toBeLessThan(
      loader.indexOf("listMemberSignupLinks(tenant.id)")
    )
    expect(loader).toContain("createMemberSignupLinkToken")
    expect(loader).toContain("buildTenantDashboardUrl")
    expect(loader).toContain('availability === "available"')
  })

  test("derives availability from every enforceable link blocker", () => {
    const future = new Date("2026-09-01T00:00:00.000Z")
    const past = new Date("2026-07-01T00:00:00.000Z")
    const now = new Date("2026-08-03T00:00:00.000Z")

    expect(
      getSignupLinkAvailability({
        expiresAt: future,
        isEnabled: true,
        now,
        remainingSlots: 2,
        signupAccessMode: "in_office",
      })
    ).toBe("available")
    expect(
      getSignupLinkAvailability({
        expiresAt: future,
        isEnabled: false,
        now,
        remainingSlots: 2,
        signupAccessMode: "in_office",
      })
    ).toBe("disabled")
    expect(
      getSignupLinkAvailability({
        expiresAt: future,
        isEnabled: true,
        now,
        remainingSlots: 2,
        signupAccessMode: "disabled",
      })
    ).toBe("blocked_by_gate")
    expect(
      getSignupLinkAvailability({
        expiresAt: past,
        isEnabled: true,
        now,
        remainingSlots: 2,
        signupAccessMode: "in_office",
      })
    ).toBe("expired")
    expect(
      getSignupLinkAvailability({
        expiresAt: future,
        isEnabled: true,
        now,
        remainingSlots: 0,
        signupAccessMode: "in_office",
      })
    ).toBe("full")
  })

  test("renders flat responsive controls and link rows", () => {
    const view = read(
      "../../components/signup-links/member-signup-links-view.tsx"
    )
    const manager = read(
      "../../components/signup-links/member-signup-link-manager.tsx"
    )
    const actions = read(
      "../../components/signup-links/member-signup-links-header-actions.tsx"
    )

    expect(view).toContain("<MemberSignupLinksHeaderActions />")
    expect(view).toContain('className="hidden gap-4 md:grid md:grid-cols-4"')
    expect(view).not.toContain("DashboardSectionCard")
    expect(manager).toContain("data-signup-link-row")
    expect(manager).toContain("divide-y divide-border/70 border-y")
    expect(manager).toContain('className="h-11 w-full md:h-10 md:w-auto"')
    expect(manager).toContain("router.refresh()")
    expect(manager).toContain("Regenerate {link.name}?")
    expect(manager).toContain("currently shared URL will stop working")
    expect(manager).not.toContain("rounded-lg border border-border/70")
    expect(actions).toContain('aria-label="Create signup link"')
    expect(actions).toContain("sr-only md:not-sr-only")
  })

  test("owns focused workflows in the URL and closes after success", () => {
    const params = read("../../hooks/use-member-signup-link-params.ts")
    const sheet = read("../../components/sheets/member-signup-link-sheet.tsx")
    const content = read(
      "../../components/signup-links/member-signup-link-content.tsx"
    )

    expect(params).toContain("signupLinkId")
    expect(params).toContain("signupLinkSheetType")
    expect(sheet).toContain("getWorkflowPresentation")
    expect(sheet).toContain('signupLinkSheetType === "edit"')
    expect(content).toContain("await setParams")
    expect(content).toContain("router.refresh()")
    expect(content).toContain("await onSuccess()")
    expect(content).toContain('className="h-11 w-full md:h-9 md:w-auto"')
    expect(content).not.toContain("rounded-lg border border-border/70")
  })
})
