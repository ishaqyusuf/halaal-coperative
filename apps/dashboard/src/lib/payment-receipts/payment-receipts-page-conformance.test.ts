import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const dashboardRoot = resolve(import.meta.dir, "../..")

function read(relativePath: string) {
  return readFileSync(resolve(dashboardRoot, relativePath), "utf8")
}

describe("payment receipts workspace Midday conformance", () => {
  test("keeps one flat responsive registry with search first", () => {
    const view = read("components/payment-receipts-view.tsx")
    const header = read("components/payment-receipt-header.tsx")
    const dataView = read("components/tables/payment-receipts/data-view.tsx")

    expect(view).toContain('<section className="min-w-0">')
    expect(view).not.toContain("rounded-md border border-border bg-card")
    expect(view).not.toContain("Submit payment receipt")
    expect(header.indexOf("<PaymentReceiptSearchFilter")).toBeLessThan(
      header.indexOf("<PaymentReceiptColumnVisibility")
    )
    expect(header).toContain("<OpenMemberPaymentReceiptCreateSheet")
    expect(dataView).toContain("<ResponsiveDataView")
    expect(dataView).toContain("<PaymentReceiptsMobileList")
  })

  test("keeps allocation sections flat and closes URL state before refresh", () => {
    const content = read("components/payment-receipt-content.tsx")

    expect(content).toContain("divide-y divide-border border-y border-border")
    expect(content).not.toContain(
      'className="rounded-none border bg-muted/20 p-4"'
    )
    expect(content.match(/await onClose\(\)/g)?.length).toBe(5)

    for (const mutationStart of [
      "await createMemberPaymentReceiptAction",
      "await reviewMemberPaymentReceiptAction",
      "await createSupportCaseAction",
      "await createOwnMemberPaymentReceiptAction",
      "await createMemberSupportCaseAction",
    ]) {
      const mutationIndex = content.indexOf(mutationStart)
      const closeIndex = content.indexOf("await onClose()", mutationIndex)
      const refreshIndex = content.indexOf("router.refresh()", closeIndex)

      expect(mutationIndex).toBeGreaterThan(-1)
      expect(closeIndex).toBeGreaterThan(mutationIndex)
      expect(refreshIndex).toBeGreaterThan(closeIndex)
    }
  })

  test("uses mobile-specific controls, skeletons, and full-screen workflows", () => {
    const toolbar = read("components/payment-receipt-mobile-toolbar.tsx")
    const skeleton = read("components/tables/payment-receipts/skeleton.tsx")
    const sheet = read("components/sheets/payment-receipt-sheet.tsx")

    expect(toolbar).toContain("<PaymentReceiptFilterDrawer")
    expect(toolbar).toContain('className="size-11"')
    expect(skeleton).toContain("md:hidden")
    expect(skeleton).toContain("hidden md:block")
    expect(sheet).toContain("mobileFullScreen")
    expect(sheet).toContain("if (!open) void closeSheet()")
  })
})
