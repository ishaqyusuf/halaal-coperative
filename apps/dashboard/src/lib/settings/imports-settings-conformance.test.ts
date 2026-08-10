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
    expect(route).toContain("batchPrefetch")
    expect(route).toContain("infiniteQueryOptions")
    expect(route).not.toContain("setQueryData")
    expect(route).not.toContain("getServerCaller")
    expect(params).toContain("importSheetType")
    expect(params).toContain("importBatchId")
    expect(sheet).toContain("const close = () =>")
    expect(sheet).toContain("importSheetType: null")
    expect(sheet).toContain("trpc.imports.batch.queryOptions")
  })

  test("keeps import type isolation declarative and mobile workflows full screen", () => {
    const sheet = read("../../components/sheets/import-sheet.tsx")
    const presentation = read("../../components/workflow-presentation.tsx")
    const form = read("../../components/forms/import-forms.tsx")
    const content = read("../../components/import-content.tsx")

    expect(sheet).toContain("routeTypeMismatch")
    expect(sheet).toContain("isBatchRoute && !routeTypeMismatch")
    expect(sheet).toContain("mobileFullScreen")
    expect(sheet).not.toContain("useEffect")
    expect(presentation).toContain("mobileFullScreenDialogWidthClasses")
    expect(presentation).toContain("md:top-1/2")
    expect(presentation).not.toContain("sm:top-1/2")
    expect(form).toContain('surface === "card"')
    expect(content).toContain('surface="sheet"')
  })

  test("uses a shadcn bottom sheet for mobile settings navigation", () => {
    const menu = read("../../components/secondary-menu.tsx")

    expect(menu).toContain("DrawerTrigger")
    expect(menu).toContain("Settings section")
    expect(menu).toContain("useMobileViewport")
    expect(menu).toContain("min-h-0 flex-1")
    expect(menu).toContain("right.path.length - left.path.length")
    expect(menu).toContain('className="scrollbar-hide hidden')
  })

  test("uses one suspense query with distinct mobile and desktop table views", () => {
    const table = read("../../components/tables/imports/data-table.tsx")
    const skeleton = read("../../components/tables/imports/skeleton.tsx")
    const view = read("../../components/imports-settings-view.tsx")

    expect(table).toContain("useSuspenseInfiniteQuery")
    expect(table).toContain("ResponsiveDataView")
    expect(table).toContain("ImportMobileList")
    expect(table).not.toContain("refetchInterval")
    expect(table).not.toContain("useInfiniteQuery(")
    expect(skeleton).toContain('className="md:hidden"')
    expect(skeleton).toContain('className="hidden md:block"')
    expect(view).toContain("<Suspense fallback={<ImportTableLoading />}")
  })
})
