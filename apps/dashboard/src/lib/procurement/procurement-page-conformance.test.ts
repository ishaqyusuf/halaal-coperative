import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const dashboardRoot = resolve(import.meta.dir, "../..")
const read = (path: string) =>
  readFileSync(resolve(dashboardRoot, path), "utf8")

describe("procurement workspace Midday conformance", () => {
  test("keeps search left, actions right, and the registry flat", () => {
    const header = read("components/procurement-header.tsx")
    const view = read("components/procurement-requests-view.tsx")

    expect(header.indexOf("<ProcurementSearchFilter")).toBeLessThan(
      header.indexOf("<ProcurementColumnVisibility")
    )
    expect(header.indexOf("<ProcurementColumnVisibility")).toBeLessThan(
      header.indexOf("<OpenProcurementRequestCreateSheet")
    )
    expect(view).toContain('<section className="min-w-0">')
    expect(view).not.toContain(
      "md:rounded-md md:border md:border-border md:bg-card"
    )
  })

  test("uses flat mobile filters and awaits URL settlement", () => {
    const drawer = read("components/procurement-filter-drawer.tsx")
    const toolbar = read("components/procurement-mobile-toolbar.tsx")

    expect(drawer).toContain("divide-y divide-border border-y border-border")
    expect(drawer).not.toContain("border border-border px-3")
    expect(drawer.match(/await Promise\.all/g) ?? []).toHaveLength(1)
    expect(drawer).toContain("onApply={apply}")
    const clearBody = drawer.match(/function clear\(\) \{([\s\S]*?)\n  \}/)?.[1]
    expect(clearBody).toBeDefined()
    expect(clearBody).not.toMatch(/setFilters?\(|setParams\(/)
    expect(toolbar).toContain('id="procurement-create-disabled"')
    expect(toolbar).toContain("aria-describedby={")
  })

  test("closes workflow URL before invalidation and refresh", () => {
    const sheet = read("components/sheets/procurement-request-sheet.tsx")
    const content = read("components/procurement-request-content.tsx")

    const closeAt = content.indexOf("await onClose()")
    const invalidateAt = content.indexOf("await Promise.all(invalidations)")
    const refreshAt = content.indexOf("router.refresh()")

    expect(sheet).toContain("const closeSheet = async () =>")
    expect(sheet).toContain("mobileFullScreen")
    expect(closeAt).toBeGreaterThan(-1)
    expect(invalidateAt).toBeGreaterThan(closeAt)
    expect(refreshAt).toBeGreaterThan(invalidateAt)
    expect(
      content.match(/await refreshProcurement\(onClose/g) ?? []
    ).toHaveLength(4)
  })

  test("offers explicit desktop filter recovery", () => {
    const search = read("components/procurement-search-filter.tsx")
    const empty = read("components/tables/procurement/empty-states.tsx")
    const query = read("components/tables/procurement/use-procurement-query.ts")

    expect(search).toContain("async function clearFilters()")
    expect(search).toContain("<DropdownMenuItem")
    expect(search).toContain("Clear filters")
    expect(search).toContain("setSortParams({ sort: null })")
    expect(empty).not.toContain("Clear filters")
    expect(query).toContain("filter.q || filter.status || params.sort")
  })
})
