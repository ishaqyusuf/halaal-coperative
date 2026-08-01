import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

describe("member creation transaction budget", () => {
  // Regression: ISSUE-008 — migration-readiness queries exhausted Prisma's 5s default
  // Found by /qa on 2026-08-01
  // Report: .gstack/qa-reports/qa-report-halaalvest-localhost-2026-07-31.md
  test("allows the guarded member write to finish on the remote preview database", () => {
    const source = readFileSync(new URL("./members.ts", import.meta.url), "utf8")
    const createMemberSource = source.slice(
      source.indexOf("export async function createMember("),
      source.indexOf("export type UpdateMemberInput")
    )

    expect(createMemberSource).toContain("timeout: 30_000")
    expect(createMemberSource).toContain("maxWait: 10_000")
  })
})
