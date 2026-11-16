import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const dashboardRoot = resolve(import.meta.dir, "../..")
const read = (path: string) =>
  readFileSync(resolve(dashboardRoot, path), "utf8")

describe("Foodstuff Purchase workspace Midday conformance", () => {
  test("uses one active URL-owned registry behind flat tabs", () => {
    const view = read("components/food-purchase-view.tsx")
    const params = read("hooks/use-food-purchase-filter-params.ts")

    expect(params).toContain('parseAsStringEnum(["applications", "cycles"])')
    expect(view).toContain('role="tablist"')
    expect(view).toContain('role="tabpanel"')
    expect(view).toContain('activeView === "cycles"')
    expect(view).toContain("await setSortParams({ sort: null })")
    expect(view).toContain("{ shallow: false }")
    expect(view).not.toContain(
      "md:rounded-md md:border md:border-border md:bg-card"
    )
  })

  test("keeps summaries, empty states, and mobile filters flat", () => {
    const view = read("components/food-purchase-view.tsx")
    const shared = read("components/requests/request-list-controls.tsx")
    const drawer = shared.slice(
      shared.indexOf("function RequestFilterOptions"),
      shared.indexOf("export function RequestMobileToolbar")
    )
    const empty = read("components/tables/food-purchase/empty-states.tsx")

    expect(view).toContain("<RequestSummaryGrid>")
    expect(view).toContain("<SummaryCard")
    expect(view).toContain("<RequestClosedNotice>")
    expect(drawer).toContain("divide-y divide-border border-y border-border")
    expect(drawer).not.toContain("border border-border px-3")
    expect(drawer.match(/await Promise\.all/g) ?? []).toHaveLength(1)
    expect(drawer).toContain("onApply={apply}")
    const clearBody = drawer.match(/function clear\(\) \{([\s\S]*?)\n  \}/)?.[1]
    expect(clearBody).toBeDefined()
    expect(clearBody).not.toMatch(/setFilters?\(|setParams\(/)
    expect(empty).not.toContain("Clear filters")
  })

  test("keeps search left, actions right, and mobile creation explained", () => {
    const header = read("components/food-purchase-header.tsx")
    const toolbar = read("components/food-purchase-mobile-toolbar.tsx")
    const shared = read("components/requests/request-list-controls.tsx")

    expect(header.indexOf("<FoodPurchaseSearchFilter")).toBeLessThan(
      header.indexOf("<FoodPurchaseColumnVisibility")
    )
    expect(toolbar).toContain("<RequestMobileToolbar")
    expect(read("components/food-purchase-search-filter.tsx")).toContain(
      'idPrefix: "food-purchase"'
    )
    expect(shared).toContain("id={disabledReasonId}")
    expect(shared).toContain("aria-describedby={")
    expect(shared).toContain('variant="link"')
  })

  test("closes workflow URL before invalidation and refresh", () => {
    const sheet = read("components/sheets/food-purchase-sheet.tsx")
    const content = read("components/food-purchase-content.tsx")
    const refresh = read("components/requests/use-request-refresh.ts")

    const closeAt = refresh.indexOf("await onClose()")
    const invalidateAt = refresh.indexOf("queryClient.invalidateQueries")
    const refreshAt = refresh.indexOf("router.refresh()")

    expect(sheet).toContain("const closeSheet = async () =>")
    expect(sheet).toContain("mobileFullScreen")
    expect(closeAt).toBeGreaterThan(-1)
    expect(invalidateAt).toBeGreaterThan(closeAt)
    expect(refreshAt).toBeGreaterThan(invalidateAt)
    expect(content).toContain("useRequestRefresh()")
    expect(
      content.match(/await refreshFoodPurchase\(onClose/g) ?? []
    ).toHaveLength(5)
  })
})
