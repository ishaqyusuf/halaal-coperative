import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8")
}

describe("analytics workspace conformance", () => {
  test("lets top metric cards grow with their descriptions", () => {
    const view = read("../components/analytics/analytics-view.tsx")

    expect(view).toContain("!h-auto min-h-[160px]")
    expect(view).toContain("mt-2 min-h-10 text-xs leading-5")
    expect(view).not.toContain("h-full min-h-[112px]")
  })
})
