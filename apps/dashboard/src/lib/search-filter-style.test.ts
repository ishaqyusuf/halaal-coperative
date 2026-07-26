import { describe, expect, test } from "bun:test"

const dropdownSearchFilters = [
  "../components/business-search-filter.tsx",
  "../components/charge-search-filter.tsx",
  "../components/food-purchase-search-filter.tsx",
  "../components/import-search-filter.tsx",
  "../components/members/members-search-filter.tsx",
  "../components/payment-receipt-search-filter.tsx",
  "../components/procurement-search-filter.tsx",
  "../components/project-financing-search-filter.tsx",
  "../components/share-application-search-filter.tsx",
  "../components/share-search-filter.tsx",
  "../components/support-search-filter.tsx",
] as const

describe("dashboard search filter style", () => {
  test("uses the shared centered search and filter input", async () => {
    for (const path of dropdownSearchFilters) {
      const source = await Bun.file(new URL(path, import.meta.url)).text()

      expect(source).toContain("<SearchFilterDropdownInput")
      expect(source).not.toMatch(/top-\[(10|11)px\]/)
      expect(source).not.toContain("Quick fill")
    }
  })

  test("renders visible input-group icons without absolute offsets", async () => {
    const source = await Bun.file(
      new URL("../components/search-filter-dropdown-input.tsx", import.meta.url),
    ).text()

    expect(source).toContain("<InputGroupAddon")
    expect(source).toContain('aria-label="Toggle filters"')
    expect(source).toContain("Search01Icon")
    expect(source).toContain("<MiddayFilterIcon")
    expect(source).not.toContain("absolute")
  })

  test("opens the member filter below its search control", async () => {
    const source = await Bun.file(
      new URL("../components/members/members-search-filter.tsx", import.meta.url),
    ).text()

    expect(source).toContain('data-quick-fill-exempt="true"')
    expect(source).toContain('side="bottom"')
    expect(source).not.toContain('side="top"')
  })
})
