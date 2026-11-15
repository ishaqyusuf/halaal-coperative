import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8")
}

describe("table residue (WP15)", () => {
  test("the imports table recovers from a failed read", () => {
    const view = read("../components/imports-settings-view.tsx")
    const boundary = read("../components/tables/imports/error-boundary.tsx")

    expect(view).toMatch(
      /<ImportsDataErrorBoundary>\s*<Suspense fallback={<ImportTableLoading \/>}>/
    )
    expect(boundary).toContain("QueryErrorResetBoundary")
    expect(boundary).toContain("Try again")
  })
})
