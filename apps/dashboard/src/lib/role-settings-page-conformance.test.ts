import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8")
}

describe("roles page (thread 15)", () => {
  test("owns metadata and recovery boundaries", () => {
    const page = read("../app/(app)/(sidebar)/settings/roles/page.tsx")
    const loading = read("../app/(app)/(sidebar)/settings/roles/loading.tsx")
    const error = read("../app/(app)/(sidebar)/settings/roles/error.tsx")

    expect(page).toContain('title: "Roles | Halaalvest"')
    expect(page).toContain("loadRoleSettingsParams")
    expect(loading).toContain("<RoleSettingsPageSkeleton")
    expect(error).toContain("reset")
    expect(error).toContain("No roles were changed")
  })

  test("lists staff only, from the lean query, for admins", () => {
    const page = read("../app/(app)/(sidebar)/settings/roles/page.tsx")

    expect(page).toContain("listTenantStaffPeople")
    expect(page).not.toContain("listTenantUsersWithMemberships")
    expect(page).toContain("!canManageRoles")
    expect(page).toContain("getGivableRoles(actorRole)")
  })

  test("plain list, no matrix, no own heading, removal behind an AlertDialog", () => {
    const view = read("../components/role-settings-view.tsx")
    const remove = read("../components/workspace-settings/remove-role-button.tsx")

    expect(view).not.toContain("WorkspacePageShell")
    expect(view).not.toContain("<details")
    expect(view).not.toContain("DashboardStatCard")
    expect(view).toContain("What each role can do")
    expect(view).toContain('"Only admin"')
    expect(remove).toContain("ConfirmActionDialog")
    expect(remove).toContain("getRemoveRoleEffect")
    expect(remove).toContain('formData.set("role", role)')
  })

  test("keeps adding a person URL-owned and refreshes after success", () => {
    const params = read("../hooks/use-role-settings-params.ts")
    const sheet = read("../components/sheets/role-settings-sheet.tsx")
    const content = read("../components/role-settings-content.tsx")
    const form = read("../components/workspace-settings/role-form.tsx")

    expect(params).toContain("roleSettingsSheetType")
    expect(sheet).toContain('roleSettingsSheetType === "assign"')
    expect(content).toContain("void setParams(null)")
    expect(content).toContain("router.refresh()")
    expect(form).toContain("onSuccess?.()")
    expect(form).toContain('className="h-11 w-full text-base sm:w-auto"')
  })
})
