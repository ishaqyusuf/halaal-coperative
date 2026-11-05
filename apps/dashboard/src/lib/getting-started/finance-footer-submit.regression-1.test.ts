import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

function read(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8")
}

describe("Getting Started finance footer actions", () => {
  // Regression: ISSUE-007 — portaled finance Next buttons did not invoke their forms
  // Found by /qa on 2026-08-01
  // Report: .gstack/qa-reports/qa-report-halaalvest-localhost-2026-07-31.md
  test("calls each finance form handler directly from its footer action", () => {
    const source = read("../../components/forms/tenant-finance-forms.tsx")

    expect(source).not.toContain(
      '<Button disabled={isPending} form={resolvedFormId} type="submit">'
    )
    expect(source).toContain("onClick={form.handleSubmit(onSubmit)}")
    expect(source).toContain("onClick={form.handleSubmit(submitBusinessRows)}")
  })

  test("One Path finance steps save from one directly-wired primary action", () => {
    for (const path of [
      "../../components/getting-started/shares-charges-step.tsx",
      "../../components/getting-started/profit-sharing-step.tsx",
    ]) {
      const step = read(path)
      const primary = step.slice(
        step.indexOf("primary={"),
        step.indexOf("stepKey=")
      )

      expect(primary).toContain("onClick={continueToNextStep}")
      expect(primary).toContain('type="button"')
      expect(step).not.toContain("form={resolvedFormId}")
      expect(step).toContain("await runOnePathSaves(saves)")
    }

    // Step 8 saves the businesses through the step's action, not a second
    // portaled button.
    const profitStep = read(
      "../../components/getting-started/profit-sharing-step.tsx"
    )
    const forms = read("../../components/forms/tenant-finance-forms.tsx")

    expect(profitStep).toContain("registerSave={registerBusinessSave}")
    expect(forms).toContain("{redirectTo && !registerSave ? (")
  })
})
