import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8")
}

describe("workspace roles Midday conformance", () => {
  test("owns page metadata and route-specific recovery boundaries", () => {
    const page = read("../app/(app)/(sidebar)/settings/roles/page.tsx")
    const loading = read("../app/(app)/(sidebar)/settings/roles/loading.tsx")
    const error = read("../app/(app)/(sidebar)/settings/roles/error.tsx")

    expect(page).toContain('title: "Workspace roles | Halaalvest"')
    expect(page).toContain("loadRoleSettingsParams")
    expect(loading).toContain("<RoleSettingsPageSkeleton")
    expect(error).toContain("reset")
    expect(error).toContain("No role assignments were changed")
  })

  test("uses the Midday members-settings tab pattern and flat rows", () => {
    const view = read("../components/role-settings-view.tsx")
    const userList = read("../components/role-settings-user-list.tsx")

    expect(view).toContain('defaultValue="users"')
    expect(view).toContain('value="users"')
    expect(view).toContain('value="permissions"')
    expect(view).toContain('className="hidden gap-4 md:grid md:grid-cols-3"')
    expect(view).toContain("<details")
    expect(view).toContain("min-h-12")
    expect(view).toContain("Role scope guide")
    expect(view).not.toContain("<DashboardSurfaceCard")
    expect(view).not.toContain("<DashboardSectionCard")
    expect(userList).toContain('aria-label="Search workspace users"')
    expect(userList).toContain("filteredUsers")
    expect(userList).toContain("border-y border-border/70")
    expect(userList).not.toContain("<DashboardSurfaceCard")
  })

  test("keeps role assignment URL-owned and refreshes after success", () => {
    const params = read("../hooks/use-role-settings-params.ts")
    const sheet = read("../components/sheets/role-settings-sheet.tsx")
    const content = read("../components/role-settings-content.tsx")
    const form = read("../components/forms/settings-forms.tsx")
    const roleForm = form.slice(
      form.indexOf("export function RoleAssignmentForm")
    )

    expect(params).toContain("roleSettingsSheetType")
    expect(sheet).toContain('roleSettingsSheetType === "assign"')
    expect(content).toContain("void setParams(null)")
    expect(content).toContain("router.refresh()")
    expect(form).toContain("onSuccess?.()")
    expect(form).toContain(
      'className="border-t border-border/70 pt-4 md:col-span-2 md:flex md:justify-end"'
    )
    expect(form).toContain('className="h-11 w-full md:h-9 md:w-auto"')
    expect(roleForm).not.toContain("rounded-lg border")
  })
})
