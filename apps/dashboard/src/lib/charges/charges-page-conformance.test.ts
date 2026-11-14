import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

const dashboardRoot = resolve(import.meta.dir, "../..")
const read = (path: string) =>
  readFileSync(resolve(dashboardRoot, path), "utf8")

describe("charges page", () => {
  test("loads charge types once and member charges only on their tab", () => {
    const page = read("app/(app)/(sidebar)/charges/page.tsx")

    expect(page).toContain("trpc.charges.chargeLibrary.queryOptions")
    expect(page).toContain('view === "applications"')
    expect(page).not.toContain("listChargeDefinitions")
    expect(page).not.toContain("listMembers")
    expect(page).not.toContain("listChargeApplications")
  })

  test("keeps one URL-backed tab and one title", () => {
    const view = read("components/charges-page-view.tsx")
    const tabs = read("components/charge-view-tabs.tsx")

    expect(tabs).toContain('role="tablist"')
    expect(tabs).toContain("{ shallow: false }")
    expect(view).toContain('id="charges-active-view"')
    expect(view).not.toContain("<h1")
    expect(view).not.toContain("<h2")
  })

  test("uses real alert dialogs for money and on/off confirms", () => {
    for (const mode of ["reverse", "toggle", "waive"]) {
      expect(
        getWorkflowPresentation("chargeOperation", mode).presentation
      ).toBe("alert-dialog")
    }
    expect(getWorkflowPresentation("chargeOperation", "details")).toEqual({
      presentation: "sheet",
      width: "form",
    })

    const forms = read("components/forms/charge-forms.tsx")
    expect(forms).toContain("<ConfirmActionDialog")
  })

  test("asks for a reason before a waiver or undo", () => {
    const content = read("components/charge-operation-content.tsx")

    expect(content).toContain('name="reason"')
    expect(content).toContain("!reason.trim()")
  })

  test("refreshes charge reads after a change, then closes, then refreshes the route", () => {
    const content = read("components/charge-operation-content.tsx")
    const invalidateAt = content.indexOf("invalidateQueries")
    const closeAt = content.indexOf("await setParams(null)")
    const refreshAt = content.indexOf("router.refresh()")

    expect(invalidateAt).toBeGreaterThan(-1)
    expect(closeAt).toBeGreaterThan(invalidateAt)
    expect(refreshAt).toBeGreaterThan(closeAt)
    expect(read("hooks/use-charge-activity-query.ts")).not.toContain(
      "refetchInterval"
    )
  })
})
