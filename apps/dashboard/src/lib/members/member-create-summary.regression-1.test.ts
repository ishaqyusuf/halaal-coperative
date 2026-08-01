import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

describe("member registry summary after creation", () => {
  // Regression: ISSUE-009 — the member table updated while registry KPIs stayed stale
  // Found by /qa on 2026-08-01
  // Report: .gstack/qa-reports/qa-report-halaalvest-localhost-2026-07-31.md
  test("refreshes server-rendered registry metrics after adding a member", () => {
    const source = readFileSync(
      new URL("../../components/forms/member-forms.tsx", import.meta.url),
      "utf8"
    )
    const createForm = source.slice(
      source.indexOf("export function MemberCreateForm"),
      source.indexOf("const memberKycSchema")
    )

    expect(createForm).toContain("const router = useTenantRouter()")
    expect(createForm).toContain("router.refresh()")
  })
})
