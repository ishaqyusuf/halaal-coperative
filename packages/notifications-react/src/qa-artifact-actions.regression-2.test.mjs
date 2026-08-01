import { describe, expect, test } from "bun:test"

describe("QA artifact accessible link role", () => {
  // Regression: ISSUE-002 — the artifact anchor still exposed role=button
  // Found by /qa on 2026-08-01
  // Report: .gstack/qa-reports/qa-report-halaalvest-localhost-2026-07-31.md
  test("preserves link semantics on the composed anchor", async () => {
    const source = await Bun.file(
      new URL("./provider.tsx", import.meta.url)
    ).text()
    const linkAction = source.slice(
      source.indexOf('artifact.kind === "link"'),
      source.indexOf("Copy {artifact.kind")
    )

    expect(linkAction).toContain('role="link"')
  })
})
