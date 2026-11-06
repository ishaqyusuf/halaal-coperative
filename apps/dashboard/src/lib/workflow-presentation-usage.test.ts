import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

const migratedShells = [
  "business-sheet.tsx",
  "charge-operation-sheet.tsx",
  "contribution-sheet.tsx",
  "food-purchase-sheet.tsx",
  "guarantor-approval-sheet.tsx",
  "import-sheet.tsx",
  "loan-sheet.tsx",
  "member-backfill-action-sheet.tsx",
  "member-backfill-baseline-edit-sheet.tsx",
  "member-backfill-start-sheet.tsx",
  "member-create-sheet.tsx",
  "member-detail-sheet.tsx",
  "member-import-sheet.tsx",
  "member-share-application-sheet.tsx",
  "member-sheet.tsx",
  "member-signup-link-sheet.tsx",
  "migration-action-sheet.tsx",
  "monthly-record-sheet.tsx",
  "notification-preference-sheet.tsx",
  "operation-profile-settings-sheet.tsx",
  "payment-receipt-sheet.tsx",
  "procurement-request-sheet.tsx",
  "profile-settings-sheet.tsx",
  "project-financing-sheet.tsx",
  "repayment-sheet.tsx",
  "role-settings-sheet.tsx",
  "share-application-sheet.tsx",
  "support-case-sheet.tsx",
  "trust-settings-sheet.tsx",
] as const

describe("workflow presentation ownership", () => {
  test("routes mixed and modal workflows through the typed presentation shell", () => {
    for (const fileName of migratedShells) {
      const source = readFileSync(
        new URL(`../components/sheets/${fileName}`, import.meta.url),
        "utf8"
      )

      expect(source).toContain("WorkflowPresentation")
      expect(source).not.toContain("<SheetContent")
    }
  })

  test("keeps the mobile navigation drawer as a dedicated side sheet", () => {
    const source = readFileSync(
      new URL(
        "../components/sheets/dashboard-sidebar-sheet.tsx",
        import.meta.url
      ),
      "utf8"
    )

    expect(source).toContain('side="left"')
    expect(source).toContain("<SheetContent")
  })

  test("protects edited workflows from accidental dismissal", () => {
    const source = readFileSync(
      new URL("../components/workflow-presentation.tsx", import.meta.url),
      "utf8"
    )

    expect(source).toContain("Discard unsaved changes?")
    expect(source).toContain("onChangeCapture")
    expect(source).toContain("onInputCapture")
  })

  test("renders alert-dialog modes with the real AlertDialog primitive", () => {
    const source = readFileSync(
      new URL("../components/workflow-presentation.tsx", import.meta.url),
      "utf8"
    )
    const alertBranch = source.slice(
      source.indexOf('if (config.presentation === "alert-dialog")'),
      source.indexOf("<Dialog open=")
    )

    // Base UI's AlertDialog ignores backdrop presses; Escape still closes it.
    expect(alertBranch).toContain(
      "<AlertDialog open={open} onOpenChange={onOpenChange}>"
    )
    expect(alertBranch).toContain("<AlertDialogContent")
    expect(source).not.toContain('"alertdialog"')
  })

  test("gives every consequential confirm a Cancel and an action", () => {
    const confirms = [
      ["charge-operation-content.tsx", 3], // CO5-7
      ["contribution-content.tsx", 1], // CT9
      ["forms/finance-forms.tsx", 3], // L4-L6
      ["guarantor-approval-content.tsx", 1], // GA1
      ["initial-migration-action-content.tsx", 1], // X18
      ["member-content.tsx", 1], // M2
      ["members/member-backfill-apply-form.tsx", 1], // X14
      ["members/member-backfill-content.tsx", 4], // X7-X9, X11, X12
      ["monthly-record-content.tsx", 3], // MR1, MR4, MR5
      ["repayment-content.tsx", 1], // RP5
    ] as const

    for (const [fileName, count] of confirms) {
      const source = readFileSync(
        new URL(`../components/${fileName}`, import.meta.url),
        "utf8"
      )

      expect({
        fileName,
        footers: source.split("<WorkflowConfirmFooter").length - 1,
      }).toEqual({ fileName, footers: count })
    }
  })

  test("opens the member signup link generator in a centered form dialog", () => {
    const source = readFileSync(
      new URL("../lib/workflow-presentations.ts", import.meta.url),
      "utf8"
    )

    expect(source).toContain(
      'memberSignupLink: {\n    access: dialog("form"),\n    create: dialog("form"),\n    edit: sheet(),'
    )
  })
})
