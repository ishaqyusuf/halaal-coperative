import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const dashboardRoot = resolve(import.meta.dir, "../..")
const read = (path: string) =>
  readFileSync(resolve(dashboardRoot, path), "utf8")

describe("support page (thread 10)", () => {
  test("rows open the one case sheet; no row action menus", () => {
    const columns = read("components/tables/support/columns.tsx")
    const table = read("components/tables/support/data-table.tsx")
    const item = read("components/tables/support/mobile-item.tsx")

    expect(columns).not.toContain("ActionsMenu")
    expect(columns).not.toContain('id: "actions"')
    expect(table).toContain('supportCaseSheetType: "case"')
    expect(item).toContain('supportCaseSheetType: "case"')
    expect(item).not.toContain("MobileActionsDrawer")
  })

  test("finishing a case and money steps go through real AlertDialogs", () => {
    const view = read("components/support/support-case-view.tsx")
    const confirms = view.match(/<RequestConfirmDialog/g) ?? []

    // Mark solved, Close case, Approve, Turn down, Record refund.
    expect(confirms).toHaveLength(5)
    expect(view).toContain('title="Close this case?"')
    expect(view).toContain('title="Record this refund?"')
  })

  test("the sheet is URL-addressed, full height on phones, old links still open it", () => {
    const sheet = read("components/sheets/support-case-sheet.tsx")

    expect(sheet).toContain("mobileFullScreen")
    expect(sheet).toContain('getWorkflowPresentation("support"')
    for (const legacy of ["update", "reply", "member-reply", "adjustment-review"]) {
      expect(sheet).toContain(`"${legacy}"`)
    }
    expect(sheet).toContain("await setParams({ supportCaseId: null")
  })

  test("the list reads lean rows and refreshes on change, never by polling", () => {
    const query = read("components/tables/support/use-support-query.ts")
    const refresh = read("components/support/use-support-refresh.ts")

    expect(query).not.toContain("refetchInterval")
    expect(refresh).toContain("trpc.support.list.infiniteQueryFilter()")
    expect(read("lib/support/load-support-page.ts")).not.toContain(
      "getMemberSupportCaseSummary"
    )
  })
})
