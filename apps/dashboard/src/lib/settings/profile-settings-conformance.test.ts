import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8")
}

describe("cooperative profile (thread 15)", () => {
  test("keeps the route compositional with metadata and recovery boundaries", () => {
    const page = read("../../app/(app)/(sidebar)/settings/profile/page.tsx")
    const loading = read("../../app/(app)/(sidebar)/settings/profile/loading.tsx")
    const error = read("../../app/(app)/(sidebar)/settings/profile/error.tsx")

    expect(page).toContain('title: "Cooperative profile | Halaalvest"')
    expect(page).toContain("await loadProfileSettingsParams")
    expect(page).toContain("loadProfileSettingsPage")
    expect(page).not.toContain("getDashboardServerContext")
    expect(loading).toContain("ProfileSettingsPageSkeleton")
    expect(error).toContain("ProfileSettingsError")
    expect(error).toContain("reset")
  })

  test("edit access matches the admin-only page and API", () => {
    const loader = read("./load-profile-settings-page.ts")
    const action = read("../../../../api/src/routers/dashboard-actions.route.ts")
    const save = action.slice(
      action.indexOf("export async function updateCooperativeProfileAction"),
      action.indexOf("export async function updateTenantTrustProfileAction")
    )

    expect(loader).toContain("workspaceAdminRoles")
    expect(loader).not.toContain("workspaceConfigurationRoles")
    expect(save).toContain("requireDashboardActor(workspaceAdminRoles)")
    expect(save).toContain('revalidatePath("/settings/profile")')
  })

  test("plain facts with one action and no own heading", () => {
    const view = read("../../components/profile-settings-view.tsx")

    expect(view).toContain("action={canManageProfile")
    expect(view).toContain("SettingsFacts")
    expect(view).not.toContain("WorkspacePageShell")
    expect(view).not.toContain("DashboardStatCard")
  })

  test("the form never edits the records start date", () => {
    const form = read("../../components/workspace-settings/profile-form.tsx")

    expect(form).not.toContain('name="startDate"')
    expect(form).toContain("changed in Finance setup")
    expect(form).toContain("await onSuccess?.()")
  })
})
