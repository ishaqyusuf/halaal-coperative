import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

function read(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8")
}

describe("Getting Started charge footer action", () => {
  // Regression: ISSUE-005 — the portaled Next button did not invoke charge submission
  // Found by /qa on 2026-08-01
  // Report: .gstack/qa-reports/qa-report-halaalvest-localhost-2026-07-31.md
  test("calls the charge save directly from the step's Continue button", () => {
    // One Path step 7: the single Continue runs the charge save itself
    // instead of submitting a form by id.
    const step = read("../../components/getting-started/shares-charges-step.tsx")
    const primary = step.slice(
      step.indexOf("primary={"),
      step.indexOf('stepKey="shares-charges"')
    )

    expect(primary).toContain("onClick={continueToNextStep}")
    expect(primary).toContain('type="button"')
    expect(primary).not.toContain('type="submit"')
    expect(step).toContain("chargeDraft.prepareChargeSave(")

    // The settings charge form keeps calling its submit function directly.
    const source = read("../../components/forms/tenant-finance-forms.tsx")
    const chargeForm = source.slice(
      source.indexOf("export function ChargeDefinitionForm"),
      source.indexOf("const chargeVersionSchema")
    )

    expect(chargeForm).toContain("onClick={submitChargeRows}")
    expect(chargeForm).not.toContain(
      '<Button disabled={isPending} form={resolvedFormId} type="submit">'
    )
  })
})
