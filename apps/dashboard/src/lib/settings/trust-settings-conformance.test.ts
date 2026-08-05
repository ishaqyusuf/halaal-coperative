import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8")
}

describe("trust settings Midday conformance", () => {
  test("keeps the route compositional with metadata and recovery boundaries", () => {
    const page = read("../../app/(app)/(sidebar)/settings/trust/page.tsx")
    const loading = read("../../app/(app)/(sidebar)/settings/trust/loading.tsx")
    const error = read("../../app/(app)/(sidebar)/settings/trust/error.tsx")

    expect(page).toContain('title: "Trust readiness | Halaalvest"')
    expect(page).toContain("await loadTrustSettingsParams")
    expect(page).toContain("loadTrustReadinessPageData")
    expect(page).not.toContain("getTenantTrustProfile")
    expect(page).not.toContain("getDashboardServerContext")
    expect(loading).toContain("TrustSettingsPageSkeleton")
    expect(error).toContain("TrustSettingsError")
    expect(error).toContain("reset")
  })

  test("loads tenant trust evidence only after the workspace role guard", () => {
    const loader = read("./load-trust-readiness-page.ts")
    const turbo = read("../../../../../turbo.json")

    expect(loader).toContain("workspaceAdminRoles")
    expect(loader).toContain("canViewTrustReadiness && context.tenant")
    expect(
      loader.indexOf("canViewTrustReadiness && context.tenant")
    ).toBeLessThan(loader.indexOf("getTenantTrustProfile(context.tenant.id)"))
    expect(turbo).toContain('"SENTRY_DSN_DASHBOARD"')
    expect(turbo).toContain('"NEXT_PUBLIC_SENTRY_DSN_DASHBOARD"')
  })

  test("renders flat responsive checklist and saved-evidence sections", () => {
    const view = read("../../components/trust-settings-view.tsx")

    expect(view).toContain("actions={<OpenTrustSettingsSheet />}")
    expect(view).toContain('className="hidden gap-4 md:grid md:grid-cols-4"')
    expect(view).toContain("data-trust-readiness-item")
    expect(view).toContain("data-trust-profile-evidence")
    expect(view).toContain("divide-y divide-border/70 border-y")
    expect(view).toContain("Legal documents")
    expect(view).toContain("Incident contact")
    expect(view).toContain("Recovery objectives")
    expect(view).not.toContain("DashboardSectionCard")
    expect(view).not.toContain("DashboardSurfaceCard")
  })

  test("owns the focused editor in the URL and closes after success", () => {
    const params = read("../../hooks/use-trust-settings-params.ts")
    const openButton = read("../../components/open-trust-settings-sheet.tsx")
    const sheet = read("../../components/sheets/trust-settings-sheet.tsx")
    const content = read("../../components/trust-settings-content.tsx")
    const form = read("../../components/forms/settings-forms.tsx")
    const trustForm = form.slice(
      form.indexOf("export function TenantTrustProfileForm"),
      form.indexOf("const roleSchema")
    )
    const presentations = read("../workflow-presentations.ts")

    expect(params).toContain("trustSettingsSheetType")
    expect(openButton).toContain('className="h-11 w-full md:h-10 md:w-auto"')
    expect(openButton).toContain('trustSettingsSheetType: "edit"')
    expect(sheet).toContain("setParams(null)")
    expect(content).toContain("useTrustSettingsParams")
    expect(content).toContain("router.refresh()")
    expect(content).toContain("onSuccess")
    expect(trustForm).toContain("Legal documents")
    expect(trustForm).toContain("Incident response")
    expect(trustForm).toContain("Recovery planning")
    expect(trustForm).toContain('className="h-11 w-full md:h-9 md:w-auto"')
    expect(trustForm).not.toContain(
      'className="grid gap-4 rounded-lg border border-border/70 bg-background/92 p-5 shadow-sm md:grid-cols-2"'
    )
    expect(presentations).toContain('trust: {\n    edit: sheet("form")')
  })
})
