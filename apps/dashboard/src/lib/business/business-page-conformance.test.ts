import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8")
}

describe("business workspace Midday conformance", () => {
  test("uses one typed suspense list contract without polling or manual seeding", () => {
    const page = read("../../app/(app)/(sidebar)/business/page.tsx")
    const input = read("./business-list-input.ts")
    const query = read("../../components/tables/business/use-business-query.ts")
    const table = read("../../components/tables/business/data-table.tsx")

    expect(page).toContain("await batchPrefetch([")
    expect(page).toContain("getBusinessesListInput(filters, sort)")
    expect(page).not.toContain("setQueryData")
    expect(input).toContain("export function getBusinessesListInput")
    expect(query).toContain("useSuspenseInfiniteQuery")
    expect(query).toContain("getBusinessesListInput")
    expect(table).toContain("useBusinessQuery")
    expect(table).not.toContain("refetchInterval")
    expect(table).not.toContain("useInfiniteQuery")
  })

  test("provides responsive mobile controls, items, and skeletons", () => {
    const pageView = read("../../components/business-page-view.tsx")
    const header = read("../../components/business-header.tsx")
    const toolbar = read("../../components/business-mobile-toolbar.tsx")
    const dataView = read("../../components/tables/business/data-view.tsx")
    const mobileItem = read("../../components/tables/business/mobile-item.tsx")
    const skeleton = read("../../components/tables/business/skeleton.tsx")

    expect(pageView).toContain('className="hidden md:block"')
    expect(header).toContain("BusinessMobileToolbar")
    expect(toolbar).toContain('aria-label="Search businesses"')
    expect(toolbar).toContain('aria-label="Filter businesses"')
    expect(toolbar).toContain("<OpenBusinessSheet iconOnly")
    expect(dataView).toContain("ResponsiveDataView")
    expect(dataView).toContain("BusinessMobileList")
    expect(mobileItem).toContain("BusinessMobileActionsDrawer")
    expect(mobileItem).toContain("Allocatable profit")
    expect(skeleton).toContain("BusinessMobileSkeleton")
    expect(skeleton).toContain('className="hidden md:block"')
  })

  test("owns page metadata and route-specific recovery boundaries", () => {
    const page = read("../../app/(app)/(sidebar)/business/page.tsx")
    const loading = read("../../app/(app)/(sidebar)/business/loading.tsx")
    const error = read("../../app/(app)/(sidebar)/business/error.tsx")

    expect(page).toContain('title: "Business | Halaalvest"')
    expect(page).toContain("allStaffRoles")
    expect(page).toContain("<BusinessUnavailableView")
    expect(loading).toContain("<BusinessPageSkeleton")
    expect(error).toContain("dashboard.business_error_boundary")
    expect(error).toContain("reset")
  })

  test("treats the create sheet as a live business form with optional profit", () => {
    const content = read("../../components/business-content.tsx")
    const datePicker = read("../../components/date-picker-input.tsx")
    const form = read("../../components/forms/tenant-finance-forms.tsx")
    const singleForm = form.slice(
      form.indexOf("function ShareBusinessSingleForm"),
      form.indexOf("const shareBusinessProfitEntrySchema")
    )
    const presentation = read("../../components/workflow-presentation.tsx")
    const quickFill = read("../../components/quick-fill.tsx")
    const sheetHeader = read("../../components/business-sheet-header.tsx")
    const emptyState = read("../../components/tables/business/empty-states.tsx")

    expect(content).toContain('sourceType="manual"')
    expect(content).toContain("profitHistoryMode")
    expect(content).toContain("currentProfitSeason={setup.currentProfitSeason}")
    expect(singleForm).toContain("Profit entries (optional)")
    expect(singleForm).toContain("Current profit season")
    expect(singleForm).toContain("data-current-profit-season")
    expect(singleForm).toContain("isLiveProfitCaptureBlocked")
    expect(singleForm).toContain("max={profitDateMax}")
    expect(singleForm).toContain("min={profitDateMin}")
    expect(singleForm).toContain(
      "Register the business now, then add only realized profit supported by evidence."
    )
    expect(singleForm).toContain('aria-label="Quick fill business form"')
    expect(singleForm).toContain("quickFillBusinessDraft")
    expect(singleForm).toContain("createRandomBusinessHistoryRows")
    expect(singleForm.indexOf("Quick fill")).toBeLessThan(
      singleForm.indexOf("Profit entries (optional)")
    )
    expect(singleForm).not.toContain("<QuickFill")
    expect(datePicker).toContain('className="flex min-w-0 gap-2"')
    expect(datePicker).toContain('"min-w-0 flex-1 justify-start')
    expect(singleForm).toContain("Profit entry {index + 1}")
    expect(singleForm).toContain("removeProfitHistoryRow")
    expect(singleForm).toContain("Shareable balance")
    expect(singleForm).toContain(
      'className="border-t border-border/70 pt-4 md:col-span-2"'
    )
    expect(singleForm).not.toContain(
      'className="border-y border-border/70 py-4 md:col-span-2 md:border md:p-4"'
    )
    expect(singleForm).toContain(
      'className="flex border-t border-border/70 pt-4 md:col-span-2 md:justify-end"'
    )
    expect(singleForm).toContain('className="h-11 w-full md:h-9 md:w-auto"')
    expect(presentation).toContain('"max-h-dvh w-full! overflow-y-auto"')
    expect(presentation).toContain('review: "sm:max-w-3xl!"')
    expect(quickFill).toContain('"w-full! sm:max-w-xl!"')
    expect(sheetHeader).toContain('create: "Record business"')
    expect(emptyState).toContain("No businesses have been recorded yet.")
    expect(emptyState).not.toContain("historical businesses")
  })

  test("uses a flat divided business details sheet", () => {
    const content = read("../../components/business-content.tsx")
    const details = content.slice(
      content.indexOf('businessType === "details"'),
      content.indexOf('businessType === "profit"')
    )

    expect(details).toContain("data-business-details-flat")
    expect(details).toContain("divide-y divide-border/70")
    expect(details).toContain("border-b border-border/70 py-5")
    expect(details).toContain("md:flex md:justify-end")
    expect(details).not.toContain("rounded-lg border p-4")
    expect(details).not.toContain("grid grid-cols-2 gap-3")
  })
})
