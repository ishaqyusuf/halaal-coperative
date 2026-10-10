import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const dashboardRoot = resolve(import.meta.dir, "../..")
const read = (path: string) =>
  readFileSync(resolve(dashboardRoot, path), "utf8")

describe("charges workspace Midday conformance", () => {
  test("uses one URL-backed active dataset and flat page structure", () => {
    const view = read("components/charges-page-view.tsx")
    const tabs = read("components/charge-view-tabs.tsx")

    expect(tabs).toContain('role="tablist"')
    expect(tabs).toContain('value: "definitions"')
    expect(tabs).toContain('value: "applications"')
    expect(tabs).toContain("{ shallow: false }")
    expect(view).toContain('activeView === "definitions"')
    expect(view).toContain('id="charges-active-view"')
    expect(view).toContain("divide-x divide-border border-y border-border")
    expect(view).not.toContain("DashboardStatCard")
    expect(view).not.toContain("DashboardSectionCard")
    expect(view).not.toContain("ChargeLibraryHistory")
  })

  test("keeps compact row actions and flat mobile filters", () => {
    const columns = read("components/tables/charge-library/columns.tsx")
    const actions = read("components/tables/charge-library/actions-menu.tsx")
    const applicationActions = read(
      "components/charge-application-actions-menu.tsx"
    )
    const drawer = read("components/charge-library-filter-drawer.tsx")
    const mobileToolbar = read("components/charge-library-mobile-toolbar.tsx")
    const empty = read("components/tables/charge-library/empty-states.tsx")

    expect(columns).toContain("<ChargeLibraryActionsMenu")
    expect(columns).toContain("size: 72")
    expect(actions).toContain("View dated history")
    expect(applicationActions).toContain("Waive charge")
    expect(applicationActions).toContain("Reverse charge")
    expect(drawer).toContain("divide-y divide-border border-y border-border")
    expect(drawer).not.toContain("border border-border px-3")
    expect(mobileToolbar).toContain('aria-label="Charge actions"')
    expect(mobileToolbar).not.toContain("MoreHorizontal")
    expect(empty).not.toContain("chargeOperationSheetType")
  })

  test("closes URL state after invalidation and before route refresh", () => {
    const content = read("components/charge-operation-content.tsx")
    const forms = read("components/forms/finance-forms.tsx")
    const query = read(
      "components/tables/charge-library/use-charge-library-query.ts"
    )

    const invalidateAt = content.indexOf("await queryClient.invalidateQueries")
    const closeAt = content.indexOf("await setParams(null)")
    const refreshAt = content.indexOf("router.refresh()")

    expect(invalidateAt).toBeGreaterThan(-1)
    expect(closeAt).toBeGreaterThan(invalidateAt)
    expect(refreshAt).toBeGreaterThan(closeAt)
    expect(content.match(/await refreshCharges\(\)/g) ?? []).toHaveLength(4)
    expect(
      forms.match(/await onSuccess\?\.\(\)/g)?.length ?? 0
    ).toBeGreaterThan(1)
    expect(query).not.toContain("refetchInterval")
  })
})
