import { describe, expect, test } from "bun:test"

const migratedActionFiles = [
  "../components/open-member-sheet.tsx",
  "../components/onboarding/membership-approval-form.tsx",
  "../components/forms/tenant-finance-forms.tsx",
  "../components/member-import-content.tsx",
  "../components/business-profit-migration-worksheet.tsx",
  "../components/sheets/member-create-sheet.tsx",
] as const

describe("dashboard action button style", () => {
  test("ordinary actions inherit shared button geometry", async () => {
    for (const path of migratedActionFiles) {
      const source = await Bun.file(new URL(path, import.meta.url)).text()

      expect(source).not.toContain('className="rounded-full"')
    }
  })

  test("keeps circular geometry only on the import column icon control", async () => {
    const source = await Bun.file(
      new URL("../components/member-import-sheet-header.tsx", import.meta.url),
    ).text()
    const circularControls = source.match(/className="rounded-full"/g) ?? []

    expect(circularControls).toHaveLength(1)
    expect(source).toContain('aria-label="Configure import columns"')
  })

  test("shared action links do not override button geometry", async () => {
    const source = await Bun.file(
      new URL("../components/dashboard/section.tsx", import.meta.url),
    ).text()
    const actionLink = source.slice(
      source.indexOf("export function DashboardActionLink"),
    )

    expect(actionLink).not.toContain("rounded-md")
    expect(actionLink).toContain('size = "default"')
  })

  test("ordinary actions inherit the shared standard size", async () => {
    const memberActions = await Bun.file(
      new URL("../components/open-member-sheet.tsx", import.meta.url),
    ).text()
    const approvalActions = await Bun.file(
      new URL(
        "../components/onboarding/membership-approval-form.tsx",
        import.meta.url,
      ),
    ).text()

    expect(memberActions).not.toContain('size="sm"')
    expect(approvalActions).not.toContain('className="px-5"')
  })
})
