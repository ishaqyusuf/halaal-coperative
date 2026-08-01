import { describe, expect, test } from "bun:test"

describe("QA artifact link actions", () => {
  // Regression: ISSUE-002 — an anchor was rendered with native button semantics
  // Found by /qa on 2026-07-31
  // Report: .gstack/qa-reports/qa-report-halaalvest-localhost-2026-07-31.md
  test("disables native button semantics when Button renders an anchor", async () => {
    const source = await Bun.file(
      new URL("./provider.tsx", import.meta.url)
    ).text()
    const linkAction = source.slice(
      source.indexOf('artifact.kind === "link"'),
      source.indexOf("Copy {artifact.kind")
    )

    expect(linkAction).toContain("nativeButton={false}")
    expect(linkAction).toContain('render={<a href={artifact.value} />}')
  })
})
