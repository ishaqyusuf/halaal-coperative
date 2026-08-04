import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8")
}

describe("imports settings Midday conformance", () => {
  test("owns shared metadata and route recovery boundaries", () => {
    const layout = read(
      "../../app/(app)/(sidebar)/settings/imports/layout.tsx"
    )
    const loading = read(
      "../../app/(app)/(sidebar)/settings/imports/loading.tsx"
    )
    const error = read("../../app/(app)/(sidebar)/settings/imports/error.tsx")
    const navigation = read("../navigation/registry.ts")

    expect(layout).toContain('title: "Imports | Halaalvest"')
    expect(loading).toContain("ImportsSettingsPageSkeleton")
    expect(error).toContain("ImportsSettingsError")
    expect(error).toContain("No import data was changed")
    expect(navigation).toContain('.childPaths("/settings/imports")')
  })

  test("keeps overview analytics desktop-only and readiness sections flat", () => {
    const view = read("../../components/imports-settings-view.tsx")

    expect(view).toContain('className="hidden gap-4 md:grid md:grid-cols-3"')
    expect(view).toContain('aria-labelledby="import-sequence-title"')
    expect(view).toContain('aria-labelledby="import-blockers-title"')
    expect(view).toContain("divide-y divide-border/70 border-y")
    expect(view).toContain('className="h-11 w-full md:h-9 md:w-auto"')
    expect(view).not.toContain("DashboardSectionCard")
    expect(view).not.toContain("DashboardSurfaceCard")
  })

  test("preserves shared route hydration and URL-owned import workflows", () => {
    const route = read(
      "../../app/(app)/(sidebar)/settings/imports/imports-route.tsx"
    )
    const params = read("../../hooks/use-import-params.ts")
    const sheet = read("../../components/sheets/import-sheet.tsx")

    expect(route).toContain("loadImportFilterParams")
    expect(route).toContain("loadSortParams")
    expect(route).toContain("HydrateClient")
    expect(route).toContain("infiniteQueryOptions")
    expect(params).toContain("importSheetType")
    expect(params).toContain("importBatchId")
    expect(sheet).toContain("const close = () =>")
    expect(sheet).toContain("importSheetType: null")
  })
})
