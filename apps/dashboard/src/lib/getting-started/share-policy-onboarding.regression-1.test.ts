import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

function read(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8")
}

describe("Getting Started share policy controls", () => {
  // Regression: ISSUE-004 — selecting unit-based shares hid the only explicit save action
  // Found by /qa on 2026-07-31
  // Report: .gstack/qa-reports/qa-report-halaalvest-localhost-2026-07-31.md
  test("Continue always persists the selected share model before charges", () => {
    // One Path step 7 has no separate "Save policy" button: the one Continue
    // saves whichever share model is selected, then the charges.
    const fields = read("../../components/getting-started/share-model-fields.tsx")
    const step = read("../../components/getting-started/shares-charges-step.tsx")
    const workspace = read(
      "../../components/finance-settings/share-settings-view.tsx"
    )

    const policySave = fields.indexOf("await persistSharePolicy(values)")
    const historySave = fields.indexOf(
      "await persistShareHistoryRows(sortedHistoryRows)"
    )

    expect(policySave).toBeGreaterThan(-1)
    expect(historySave).toBeGreaterThan(policySave)
    expect(step.indexOf("shareDraft.prepareSave")).toBeLessThan(
      step.indexOf("chargeDraft.prepareChargeSave(")
    )

    for (const source of [fields, step, workspace]) {
      expect(source).not.toContain("Save policy")
      expect(source).not.toContain("Save the active share model first")
    }
  })
})
