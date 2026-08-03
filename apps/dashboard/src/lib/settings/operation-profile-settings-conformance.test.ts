import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import {
  operationProfileAccessModeOptions,
  operationProfileServiceKeys,
  operationProfileServiceSections,
} from "./operation-profile-settings"

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8")
}

describe("operation profile settings Midday conformance", () => {
  test("groups every configured service exactly once with an access summary", () => {
    const groupedServiceKeys = operationProfileServiceSections.flatMap(
      (section) => section.serviceKeys
    )

    expect([...groupedServiceKeys].sort()).toEqual(
      [...operationProfileServiceKeys].sort()
    )
    expect(new Set(groupedServiceKeys).size).toBe(
      operationProfileServiceKeys.length
    )
    expect(
      operationProfileAccessModeOptions.every(
        (option) => option.summary.trim().length > 0
      )
    ).toBe(true)
  })

  test("keeps the route compositional with metadata and recovery boundaries", () => {
    const page = read(
      "../../app/(app)/(sidebar)/settings/operation-profile/page.tsx"
    )
    const loading = read(
      "../../app/(app)/(sidebar)/settings/operation-profile/loading.tsx"
    )
    const error = read(
      "../../app/(app)/(sidebar)/settings/operation-profile/error.tsx"
    )

    expect(page).toContain('title: "Operation profile | Halaalvest"')
    expect(page).toContain("loadOperationProfileSettingsPage")
    expect(page).not.toContain("getTenantOperationProfile")
    expect(page).not.toContain("getDashboardServerContext")
    expect(loading).toContain("OperationProfileSettingsPageSkeleton")
    expect(error).toContain("OperationProfileSettingsError")
    expect(error).toContain("reset")
  })

  test("loads tenant-scoped data only after workspace and role checks", () => {
    const loader = read("./load-operation-profile-settings-page.ts")

    expect(loader).toContain("getDashboardServerContext")
    expect(loader).toContain("workspaceAdminRoles")
    expect(loader).toContain('status !== "database-configured"')
    expect(loader.indexOf("hasAnyRole")).toBeLessThan(
      loader.indexOf("getTenantOperationProfile(context.tenant.id)")
    )
  })

  test("renders every service in always-visible operational sections", () => {
    const view = read("../../components/operation-profile-settings-view.tsx")
    const settings = read("./operation-profile-settings.ts")

    expect(view).toContain('className="hidden gap-4 md:grid md:grid-cols-3"')
    expect(view).toContain("operationProfileServiceSections")
    expect(view).toContain("getOperationProfileAccessModeSummary")
    expect(view).toContain("data-operation-profile-section")
    expect(view).toContain("data-operation-profile-service")
    expect(view).toContain("OpenOperationProfileSettingsSheet")
    expect(view).toContain("divide-y divide-border/70 border-y")
    expect(view).not.toContain("<details")
    expect(view).not.toContain("<summary")
    expect(view).not.toContain("ChevronDownIcon")
    expect(view).not.toContain("DashboardSectionCard")
    expect(view).not.toContain("grid gap-3 rounded")
    expect(settings).toContain('label: "Collections"')
    expect(settings).toContain('label: "Member services"')
    expect(settings).toContain('summary: "Members and staff can create"')
  })

  test("owns the selected service and edit workflow in the URL", () => {
    const params = read("../../hooks/use-operation-profile-settings-params.ts")
    const openButton = read(
      "../../components/open-operation-profile-settings-sheet.tsx"
    )
    const sheet = read(
      "../../components/sheets/operation-profile-settings-sheet.tsx"
    )

    expect(params).toContain("operationProfileServiceKey")
    expect(params).toContain("operationProfileServiceKeys")
    expect(openButton).toContain("operationProfileServiceKey: serviceKey")
    expect(openButton).toContain("aria-label={`Edit ${serviceLabel} access`}")
    expect(openButton).toContain('className="h-11 w-full md:h-10 md:w-auto"')
    expect(sheet).toContain("selectedServiceKey")
    expect(sheet).toContain("key={selectedServiceKey}")
    expect(sheet).toContain("setParams(null)")
  })

  test("edits one service with audit-aware feedback and responsive actions", () => {
    const content = read(
      "../../components/operation-profile-settings-content.tsx"
    )
    const action = read(
      "../../../../api/src/routers/dashboard-actions.route.ts"
    )

    expect(content).toContain("currentAccessMode")
    expect(content).toContain("serviceKey")
    expect(content).toContain("requiresChangeReason")
    expect(content).toContain("required={requiresChangeReason}")
    expect(content).toContain('new Event("input", { bubbles: true })')
    expect(content).toContain("useNotifications")
    expect(content).toContain("await setParams(null)")
    expect(content).toContain("router.refresh()")
    expect(content).toContain('className="h-11 w-full sm:h-9 sm:w-auto"')
    expect(content.match(/<LabeledSelectInput/g)).toHaveLength(1)
    expect(action).toContain('revalidatePath("/settings/operation-profile")')
  })
})
