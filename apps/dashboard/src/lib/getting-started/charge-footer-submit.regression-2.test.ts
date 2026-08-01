import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

describe("Getting Started charge footer action", () => {
  // Regression: ISSUE-005 — the portaled Next button did not invoke charge submission
  // Found by /qa on 2026-08-01
  // Report: .gstack/qa-reports/qa-report-halaalvest-localhost-2026-07-31.md
  test("calls the charge form submit function directly", () => {
    const source = readFileSync(
      new URL("../../components/forms/tenant-finance-forms.tsx", import.meta.url),
      "utf8"
    )
    const chargeForm = source.slice(
      source.indexOf("export function ChargeDefinitionForm"),
      source.indexOf("const chargeVersionSchema")
    )

    expect(chargeForm).toContain("onClick={submitChargeRows}")
    expect(chargeForm).toContain('type="button"')
    expect(chargeForm).not.toContain(
      '<Button disabled={isPending} form={resolvedFormId} type="submit">'
    )
  })
})
