import { describe, expect, test } from "bun:test"

describe("early access setup options", () => {
  // Regression: ISSUE-001 — setup checkboxes inherited one repeated form-field id
  // Found by /qa on 2026-07-31
  // Report: .gstack/qa-reports/qa-report-halaalvest-localhost-2026-07-31.md
  test("assigns every option its own stable checkbox id", async () => {
    const source = await Bun.file(
      new URL("../components/marketing/early-access-form.tsx", import.meta.url)
    ).text()
    const setupOptions = source.slice(
      source.indexOf("earlyAccessSetupNeedOptions.map"),
      source.indexOf('name="message"')
    )

    expect(setupOptions).toContain('id={`setup-need-${option.value}`}')
    expect(setupOptions).not.toContain("<FormControl>")
    expect(setupOptions).toContain(
      'aria-label={`${option.label}. ${option.description}`}'
    )
  })
})
