import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

describe("tenant URL variant switcher positioning", () => {
  // Regression: ISSUE-006 — the local URL switcher covered setup footer actions
  // Found by /qa on 2026-08-01
  // Report: .gstack/qa-reports/qa-report-halaalvest-localhost-2026-07-31.md
  test("anchors the fixed switcher independently of consumer Tailwind output", () => {
    const source = readFileSync(new URL("./react.tsx", import.meta.url), "utf8")

    expect(source).toContain('style={{ left: "4rem" }}')
  })
})
