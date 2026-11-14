import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

const dashboardRoot = resolve(import.meta.dir, "../..")
const read = (path: string) =>
  readFileSync(resolve(dashboardRoot, path), "utf8")

describe("shares page", () => {
  test("serves members and finance staff from one lean loader", () => {
    const loader = read("lib/shares/load-shares-page.ts")
    const route = read("app/(app)/(sidebar)/shares/page.tsx")

    expect(loader).toContain("getMemberShareSummary")
    expect(loader).toContain("getTenantShareSummary")
    // The member is resolved once; the share policy is passed down, not re-read.
    expect(loader.match(/getMemberByUserId\(/g)).toHaveLength(1)
    expect(loader).not.toContain("getMemberUnitSharePosition")
    expect(route).toContain('data.state === "staff"')
    expect(route).not.toContain("getServerCaller")
  })

  test("keeps share capital and profit as separate figures", () => {
    const view = read("components/member-shares-view.tsx")

    expect(view).toContain("summary.shareCapital")
    expect(view).toContain("summary.profitPaid")
    expect(view).toContain('id="profit-paid"')
  })

  test("decides inside the request sheet behind an alert dialog", () => {
    const content = read("components/share-request-content.tsx")

    expect(getWorkflowPresentation("shareApplication", "details")).toEqual({
      presentation: "sheet",
      width: "form",
    })
    expect(content).toContain("<ConfirmActionDialog")
    expect(content).toContain(
      'confirmDisabled={decision === "rejected" && !reason.trim()}'
    )
  })

  test("memoizes staff rows and never polls", () => {
    const query = read("hooks/use-share-requests-query.ts")

    expect(query).toContain("useMemo(\n    () => data.pages.flatMap")
    expect(query).not.toContain("refetchInterval")
  })
})
