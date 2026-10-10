import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const dashboardRoot = resolve(import.meta.dir, "../..")
const read = (path: string) =>
  readFileSync(resolve(dashboardRoot, path), "utf8")

describe("repayments workspace Midday conformance", () => {
  test("owns one labelled URL-backed active view", () => {
    const dataView = read("components/tables/repayments/data-view.tsx")
    const tabs = read("components/tables/repayments/view-tabs.tsx")

    expect(dataView).toContain('id="repayments-active-view"')
    expect(dataView).toContain("aria-labelledby={`repayments-${view}-tab`}")
    expect(tabs).toContain('role="tablist"')
    expect(tabs).toContain('role="tab"')
    expect(tabs).toContain("await setSortParams({ sort: null })")
    expect(tabs).toContain("await setFilters(filtersByView, { shallow: false })")
    expect(tabs).toContain("id={`repayments-${view.value}-tab`}")
  })

  test("uses flat mobile sorting and settles URL state before closing", () => {
    const drawer = read("components/repayments-filter-drawer.tsx")

    expect(drawer).toContain("<RadioGroup")
    expect(drawer).toContain("<RadioGroupItem")
    expect(drawer).toContain("divide-y divide-border border-y border-border")
    expect(drawer).not.toContain("border border-border px-3")
    expect(drawer.match(/await Promise\.all/g) ?? []).toHaveLength(1)
    expect(drawer).toContain("onApply={apply}")
    const clearBody = drawer.match(/function clear\(\) \{([\s\S]*?)\n  \}/)?.[1]
    expect(clearBody).toBeDefined()
    expect(clearBody).not.toMatch(/setFilters?\(|setParams\(/)
    expect(drawer).toContain(
      "sort === sortOptions[0].id ? null : sort.split(\",\")"
    )
  })

  test("distinguishes empty queues from filtered no-match states", () => {
    const desktop = read("components/tables/repayments/data-table.tsx")
    const mobile = read("components/tables/repayments/mobile-list.tsx")

    for (const source of [desktop, mobile]) {
      expect(source).toContain('"No collection cases yet"')
      expect(source).toContain('"No matching collection cases"')
      expect(source).toContain('"No repayment schedule yet"')
      expect(source).toContain('"No matching schedule items"')
      expect(source).toContain('"No repayments posted yet"')
      expect(source).toContain('"No matching repayment history"')
    }
  })

  test("closes the workflow URL before refreshing after mutations", () => {
    const sheet = read("components/sheets/repayment-sheet.tsx")

    const invalidateAt = sheet.indexOf("await Promise.all([")
    const closeAt = sheet.indexOf("await closeSheet()", invalidateAt)
    const refreshAt = sheet.indexOf("router.refresh()", closeAt)

    expect(invalidateAt).toBeGreaterThan(-1)
    expect(closeAt).toBeGreaterThan(invalidateAt)
    expect(refreshAt).toBeGreaterThan(closeAt)
    expect(sheet).toContain("mobileFullScreen")
  })
})
