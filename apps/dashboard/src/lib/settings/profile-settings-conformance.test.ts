import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8")
}

describe("cooperative profile Midday conformance", () => {
  test("keeps the route compositional with metadata and recovery boundaries", () => {
    const page = read("../../app/(app)/(sidebar)/settings/profile/page.tsx")
    const loading = read(
      "../../app/(app)/(sidebar)/settings/profile/loading.tsx"
    )
    const error = read("../../app/(app)/(sidebar)/settings/profile/error.tsx")

    expect(page).toContain('title: "Cooperative profile | Halaalvest"')
    expect(page).toContain("await loadProfileSettingsParams")
    expect(page).toContain("loadProfileSettingsPage")
    expect(page).not.toContain("getDashboardPageData")
    expect(page).not.toContain("getDashboardServerContext")
    expect(loading).toContain("ProfileSettingsPageSkeleton")
    expect(error).toContain("ProfileSettingsError")
    expect(error).toContain("reset")
  })

  test("loads one tenant profile and resolves role-aware edit access", () => {
    const loader = read("./load-profile-settings-page.ts")

    expect(loader).toContain("getDashboardServerContext")
    expect(loader).toContain("workspaceConfigurationRoles")
    expect(loader).toContain("canShowQuickFill(context)")
    expect(loader).toContain('status: "unavailable"')
    expect(loader).toContain('key: "identity"')
    expect(loader).toContain('key: "location"')
    expect(loader).toContain('key: "regional"')
    expect(loader).toContain('label: "Finance start date"')
  })

  test("renders a flat responsive snapshot with a page-level edit action", () => {
    const view = read("../../components/profile-settings-view.tsx")
    const openButton = read("../../components/open-profile-settings-sheet.tsx")

    expect(view).toContain("actions={canManageProfile")
    expect(view).toContain('className="hidden gap-4 md:grid md:grid-cols-4"')
    expect(view).toContain("profileSections.map")
    expect(view).toContain("data-profile-section")
    expect(view).toContain("data-profile-field")
    expect(view).toContain("divide-y divide-border/70 border-y")
    expect(view).not.toContain("DashboardSectionCard")
    expect(view).not.toContain("<details")
    expect(openButton).toContain('className="h-11 w-full md:h-10 md:w-auto"')
  })

  test("owns the edit sheet in the URL and refreshes after a successful save", () => {
    const params = read("../../hooks/use-profile-settings-params.ts")
    const sheet = read("../../components/sheets/profile-settings-sheet.tsx")
    const content = read("../../components/profile-settings-content.tsx")
    const presentations = read("../workflow-presentations.ts")

    expect(params).toContain("profileSettingsSheetType")
    expect(sheet).toContain('profileSettingsSheetType === "edit"')
    expect(sheet).toContain("setParams(null)")
    expect(content).toContain("await setParams(null)")
    expect(content).toContain("router.refresh()")
    expect(presentations).toContain("profile: {")
    expect(presentations).toContain('edit: sheet("form")')
  })

  test("uses sectional editing, keeps the finance start date read-only, and audits saves", () => {
    const form = read("../../components/forms/settings-forms.tsx")
    const action = read(
      "../../../../api/src/routers/dashboard-actions.route.ts"
    )
    const tenantQuery = read(
      "../../../../../packages/db/src/queries/tenants.ts"
    )

    expect(form).toContain('id="profile-identity-form-title"')
    expect(form).toContain('id="profile-location-form-title"')
    expect(form).toContain('id="profile-regional-form-title"')
    expect(form).toContain("Managed from Finance Setup")
    expect(form).not.toContain('name="startDate"')
    expect(form).toContain("await onSuccess?.()")
    expect(form).toContain('className="h-11 w-full sm:h-9 sm:w-auto"')
    expect(action).toContain('revalidatePath("/settings/profile")')
    expect(tenantQuery).toContain('action: "tenant.profile_updated"')
  })
})
