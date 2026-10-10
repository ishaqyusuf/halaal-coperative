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
    const drawer = read("components/food-purchase-filter-drawer.tsx")
    const empty = read("components/tables/food-purchase/empty-states.tsx")

    expect(view).toContain("grid-cols-3 divide-x divide-border/70")
    expect(view).not.toContain("rounded-lg border border-border bg-card p-4")
    expect(view).toContain("border-y border-border px-4 py-8 text-center")
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

    expect(header.indexOf("<FoodPurchaseSearchFilter")).toBeLessThan(
      header.indexOf("<FoodPurchaseColumnVisibility")
    )
    expect(toolbar).toContain('id="food-purchase-create-disabled"')
    expect(toolbar).toContain("aria-describedby={")
    expect(toolbar).toContain('variant="link"')
  })

  test("closes workflow URL before invalidation and refresh", () => {
    const sheet = read("components/sheets/food-purchase-sheet.tsx")
    const content = read("components/food-purchase-content.tsx")

    const closeAt = content.indexOf("await onClose()")
    const invalidateAt = content.indexOf("await Promise.all(invalidations)")
    const refreshAt = content.indexOf("router.refresh()")

    expect(sheet).toContain("const closeSheet = async () =>")
    expect(sheet).toContain("mobileFullScreen")
    expect(closeAt).toBeGreaterThan(-1)
    expect(invalidateAt).toBeGreaterThan(closeAt)
    expect(refreshAt).toBeGreaterThan(invalidateAt)
    expect(
      content.match(/await refreshFoodPurchase\(onClose/g) ?? []
    ).toHaveLength(6)
  })
})
