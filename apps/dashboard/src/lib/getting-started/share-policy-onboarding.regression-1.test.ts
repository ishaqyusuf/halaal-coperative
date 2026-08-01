import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

describe("Getting Started share policy controls", () => {
  // Regression: ISSUE-004 — selecting unit-based shares hid the only explicit save action
  // Found by /qa on 2026-07-31
  // Report: .gstack/qa-reports/qa-report-halaalvest-localhost-2026-07-31.md
  test("keeps Save policy available until the selected share model is persisted", () => {
    const source = readFileSync(
      new URL("../../components/share-model-workspace.tsx", import.meta.url),
      "utf8"
    )

    expect(source).toContain(
      "showSubmitButton={hasUnsavedModeChange || selectedMonthlyHistory}"
    )
    expect(source).toContain(
      "!hasUnsavedModeChange && !selectedMonthlyHistory"
    )
    expect(source).not.toContain(
      "showSubmitButton={selectedMonthlyHistory}"
    )
  })
})
