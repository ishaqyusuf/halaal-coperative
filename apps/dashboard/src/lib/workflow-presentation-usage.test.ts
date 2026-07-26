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
  "member-backfill-baseline-edit-sheet.tsx",
  "member-backfill-start-sheet.tsx",
  "member-detail-sheet.tsx",
  "member-import-sheet.tsx",
  "member-share-application-sheet.tsx",
  "member-sheet.tsx",
  "member-signup-link-sheet.tsx",
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
})
