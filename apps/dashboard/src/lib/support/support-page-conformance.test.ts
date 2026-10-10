import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const dashboardRoot = resolve(import.meta.dir, "../..")
const read = (path: string) =>
  readFileSync(resolve(dashboardRoot, path), "utf8")

describe("support workspace Midday conformance", () => {
  test("keeps one flat registry with search first and compact actions", () => {
    const view = read("components/support-cases-view.tsx")
    const header = read("components/support-header.tsx")
    const columns = read("components/tables/support/columns.tsx")
    const empty = read("components/tables/support/empty-states.tsx")

    expect(view).toContain("divide-x divide-border border-y border-border")
    expect(view).not.toContain("md:rounded-md md:border")
    expect(view).not.toContain("rounded-lg border border-border bg-card")
    expect(header.indexOf("<SupportSearchFilter")).toBeLessThan(
      header.indexOf("<SupportColumnVisibility")
    )
    expect(columns).toContain("<SupportActionsMenu")
    expect(columns).toContain("size: 72")
    expect(empty).not.toContain("supportCaseSheetType")
  })

  test("keeps mobile filters and workflows flat and responsive", () => {
    const drawer = read("components/support-filter-drawer.tsx")
    const sheet = read("components/sheets/support-case-sheet.tsx")
    const skeleton = read("components/tables/support/skeleton.tsx")

    expect(drawer).toContain("divide-y divide-border border-y border-border")
    expect(drawer).not.toContain("border border-border px-3")
    expect(sheet).toContain("mobileFullScreen")
    expect(skeleton).toContain("SupportMobileSkeleton")
  })

  test("awaits URL sheet closure before refreshing every mutation", () => {
    const content = read("components/support-case-content.tsx")
    const sheet = read("components/sheets/support-case-sheet.tsx")
    const closes = content.match(/await onClose\(\)/g) ?? []

    expect(closes).toHaveLength(7)
    expect(content).not.toMatch(/\n\s+onClose\(\)/)
    expect(sheet).toContain("async function closeSheet()")
    expect(sheet).toContain("await setParams({ supportCaseId: null")
  })
})
