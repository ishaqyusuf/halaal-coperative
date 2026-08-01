import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

describe("Getting Started finance footer actions", () => {
  // Regression: ISSUE-007 — portaled finance Next buttons did not invoke their forms
  // Found by /qa on 2026-08-01
  // Report: .gstack/qa-reports/qa-report-halaalvest-localhost-2026-07-31.md
  test("calls each finance form handler directly from its footer action", () => {
    const source = readFileSync(
      new URL("../../components/forms/tenant-finance-forms.tsx", import.meta.url),
      "utf8"
    )

    expect(source).not.toContain(
      '<Button disabled={isPending} form={resolvedFormId} type="submit">'
    )
    expect(source).toContain("onClick={form.handleSubmit(onSubmit)}")
    expect(source).toContain("onClick={form.handleSubmit(submitBusinessRows)}")
  })
})
