import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8")
}

describe("finance settings Midday conformance", () => {
  test("keeps the overview route metadata-bearing and URL-driven", () => {
    const page = read("../../app/(app)/(sidebar)/settings/finance/page.tsx")
    const route = read(
      "../../app/(app)/(sidebar)/settings/finance/finance-route.tsx"
    )

    expect(page).toContain("export const metadata")
    expect(page).toContain("Promise<SearchParams>")
    expect(page).toContain("searchParams={searchParams}")
    expect(route).toContain("loadTenantFinanceSettingsParams")
  })

  test("does not substitute demo finance records for unavailable server data", () => {
    const route = read(
      "../../app/(app)/(sidebar)/settings/finance/finance-route.tsx"
    )

    expect(route).toContain("FinanceSettingsUnavailableView")
    expect(route).toContain('runtime.status !== "database-configured"')
    expect(route).not.toContain("tenant-amanah-demo")
    expect(route).not.toContain("demoFinance")
    expect(route).not.toContain("demoShare")
  })

  test("keeps database serialization outside the route entrypoint", () => {
    const route = read(
      "../../app/(app)/(sidebar)/settings/finance/finance-route.tsx"
    )
    const viewModel = read("./finance-settings-view-model.ts")

    expect(route).toContain("toFinanceSetupViewModel(data)")
    expect(route).not.toContain(".chargeDefinitions.map")
    expect(route).not.toContain(": any")
    expect(viewModel).toContain("toFinancingSettingsView")
    expect(viewModel).not.toContain(": any")
  })

  test("provides route-owned loading, error, and responsive navigation states", () => {
    const loading = read(
      "../../app/(app)/(sidebar)/settings/finance/loading.tsx"
    )
    const error = read("../../app/(app)/(sidebar)/settings/finance/error.tsx")
    const menu = read("../../components/secondary-menu.tsx")

    expect(loading).toContain("FinanceSettingsSkeleton")
    expect(error).toContain('"use client"')
    expect(error).toContain("reset")
    expect(menu).toContain("overflow-auto")
  })

  test("keeps finance editing in URL-owned focused presentations", () => {
    const params = read("../../hooks/use-tenant-finance-settings-params.ts")
    const sheet = read(
      "../../components/sheets/tenant-finance-settings-sheet.tsx"
    )
    const content = read("../../components/tenant-finance-settings-content.tsx")
    const forms = read("../../components/forms/tenant-finance-forms.tsx")

    expect(params).toContain("tenantFinanceSettingsSheetType")
    expect(sheet).toContain("useTenantFinanceSettingsParams")
    expect(sheet).toContain("WorkflowPresentation")
    expect(sheet).toContain("setParams(null)")
    expect(content).toContain("onSuccess={() => setParams(null)}")
    expect(forms).toContain("onSuccess?.()")
  })
})
