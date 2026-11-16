import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const dashboardRoot = resolve(import.meta.dir, "../..")
const read = (path: string) =>
  readFileSync(resolve(dashboardRoot, path), "utf8")

describe("project financing workspace Midday conformance", () => {
  test("keeps search left, actions right, and the registry flat", () => {
    const header = read("components/project-financing-header.tsx")
    const view = read("components/project-financing-requests-view.tsx")

    expect(header.indexOf("<ProjectFinancingSearchFilter")).toBeLessThan(
      header.indexOf("<ProjectFinancingColumnVisibility")
    )
    expect(header.indexOf("<ProjectFinancingColumnVisibility")).toBeLessThan(
      header.indexOf("<OpenProjectFinancingRequestSheet")
    )
    expect(view).toContain('<section className="min-w-0">')
    expect(view).not.toContain(
      "md:rounded-md md:border md:border-border md:bg-card"
    )
  })

  test("uses flat mobile filters and accessible disabled creation", () => {
    const shared = read("components/requests/request-list-controls.tsx")
    const drawer = shared.slice(
      shared.indexOf("function RequestFilterOptions"),
      shared.indexOf("export function RequestMobileToolbar")
    )
    const toolbar = read("components/project-financing-mobile-toolbar.tsx")

    expect(drawer).toContain("divide-y divide-border border-y border-border")
    expect(drawer).not.toContain("border border-border px-3")
    expect(drawer.match(/await Promise\.all/g) ?? []).toHaveLength(1)
    expect(drawer).toContain("onApply={apply}")
    const clearBody = drawer.match(/function clear\(\) \{([\s\S]*?)\n  \}/)?.[1]
    expect(clearBody).toBeDefined()
    expect(clearBody).not.toMatch(/setFilters?\(|setParams\(/)
    expect(toolbar).toContain("<RequestMobileToolbar")
    expect(read("components/project-financing-search-filter.tsx")).toContain(
      'idPrefix: "project-financing"'
    )
    expect(shared).toContain("id={disabledReasonId}")
    expect(shared).toContain("aria-describedby={")
  })

  test("closes workflow URL before invalidation and refresh", () => {
    const sheet = read("components/sheets/project-financing-sheet.tsx")
    const content = read("components/project-financing-content.tsx")
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
      content.match(/await refreshProjectFinancing\(onClose/g) ?? []
    ).toHaveLength(3)
  })

  test("mirrors structure-aware server validation in create and review forms", () => {
    const content = read("components/project-financing-content.tsx")

    expect(content).toContain("function monthsAreValid(")
    expect(content).toContain('type === "repayable_facility"')
    expect(content).toContain(
      "monthsAreValid(proposedStructure, requestedPaybackMonths)"
    )
    expect(content).toContain(
      "monthsAreValid(approvedStructure, approvedPaybackMonths)"
    )
    expect(content).toContain("disabled={isPending || !canSubmit}")
    expect(content).toContain("canApprove={canApprove}")
    expect(content).toContain("todayInputValue()")
  })

  test("provides explicit desktop filter recovery", () => {
    const search = read("components/requests/request-list-controls.tsx")
    const empty = read("components/tables/project-financing/empty-states.tsx")
    const query = read(
      "components/tables/project-financing/use-project-financing-query.ts"
    )

    expect(search).toContain("async function clearFilters()")
    expect(search).toContain("<DropdownMenuItem")
    expect(search).toContain("setSortParams({ sort: null })")
    expect(empty).not.toContain("Clear filters")
    expect(query).toContain("filter.q || filter.status || params.sort")
  })
})
