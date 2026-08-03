import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8")
}

const filterHooks = [
  "../hooks/use-audit-filter-params.ts",
  "../hooks/use-business-filter-params.ts",
  "../hooks/use-contributions-filter-params.ts",
  "../hooks/use-members-filter-params.ts",
  "../hooks/use-repayments-filter-params.ts",
  "../hooks/use-reports-filter-params.ts",
]

describe("GND rich date filter conformance", () => {
  test("keeps the GND preset rail and one range calendar in the shared control", () => {
    const component = read("../components/search-filter/date-range-filter.tsx")

    expect(component).toContain("dateFilterPresets.map")
    expect(component).toContain('mode="range"')
    expect(component).toContain("createDatePresetSelection")
    expect(component).toContain('import("@halaalvest/ui/components/calendar")')
  })

  test("uses one canonical dateRange query key on every migrated workspace", () => {
    for (const hookPath of filterHooks) {
      const hook = read(hookPath)

      expect(hook).toContain("dateRange: parseAsArrayOf(parseAsString)")
      expect(hook).not.toMatch(
        /\b(joinedFrom|joinedTo|startFrom|startTo): parseAs/
      )
      expect(hook).not.toMatch(/\b(from|to): parseAsString/)
    }
  })

  test("routes all date-range metadata through the shared search-filter type", () => {
    const metadata = read("../../../../packages/db/src/filter-metadata.ts")
    const field = read("../components/search-filter/search-filter-field.tsx")

    expect(metadata.match(/dateRangeFilter\("dateRange"/g)).toHaveLength(6)
    expect(metadata).not.toContain('dateFilter("from"')
    expect(metadata).not.toContain('dateFilter("to"')
    expect(field).toContain("<DateRangeFilter")
  })

  test("preserves the canonical tuple through report and export links", () => {
    const clientLinks = read("../components/reports/reports-utils.ts")
    const exportLinks = read("../app/(app)/(sidebar)/reports/export-utils.ts")

    for (const source of [clientLinks, exportLinks]) {
      expect(source).toContain('params.set("dateRange"')
      expect(source).not.toContain('params.set("from"')
      expect(source).not.toContain('params.set("to"')
    }

    expect(exportLinks).toContain("searchParams.dateRange")
    expect(exportLinks).not.toContain("searchParams.from")
    expect(exportLinks).not.toContain("searchParams.to")
  })
})
