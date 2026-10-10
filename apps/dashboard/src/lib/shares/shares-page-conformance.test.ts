import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const dashboardRoot = resolve(import.meta.dir, "../..")

function read(relativePath: string) {
  return readFileSync(resolve(dashboardRoot, relativePath), "utf8")
}

describe("member shares workspace conformance", () => {
  test("hydrates one member-scoped list through the shared input", () => {
    const route = read("app/(app)/(sidebar)/shares/page.tsx")
    const loader = read("lib/shares/load-member-shares-page.ts")

    expect(route).toContain("getShareApplicationListInput({ filter, sort })")
    expect(route).toContain("await batchPrefetch([listOptions])")
    expect(route).not.toContain("getServerCaller")
    expect(route).not.toContain("setQueryData")
    expect(loader).not.toContain("listMemberShareApplications")
    expect(loader).toContain("getMemberOperationalReadiness")
  })

  test("uses a flat responsive data view without polling or selection", () => {
    const view = read("components/member-shares-view.tsx")
    const header = read("components/share-application-header.tsx")
    const searchFilter = read(
      "components/share-application-search-filter.tsx"
    )
    const dataView = read("components/tables/share-applications/data-view.tsx")
    const table = read("components/tables/share-applications/data-table.tsx")
    const query = read(
      "components/tables/share-applications/use-share-applications-query.ts"
    )

    expect(view).toContain("<ShareApplicationMobileToolbar")
    expect(view).toContain("<ShareApplicationsDataView")
    expect(view).toContain("<OpenMemberShareApplicationSheet")
    expect(view).not.toContain('title="My share requests"')
    expect(view).toContain("requestBlockedReason")
    expect(header.indexOf("<ShareApplicationSearchFilter")).toBeLessThan(
      header.indexOf("<ShareApplicationColumnVisibility")
    )
    expect(searchFilter).toContain("onKeyDown={handleSearchKeyDown}")
    expect(dataView).toContain("<ResponsiveDataView")
    expect(dataView).toContain("<ShareApplicationsMobileList")
    expect(table).not.toContain("refetchInterval")
    expect(table).not.toContain("rowSelection")
    expect(table).not.toContain("remoteRows")
    expect(query).not.toContain("useDeferredValue")
  })

  test("supports exact read-only details in a mobile full-screen workflow", () => {
    const params = read("hooks/use-share-application-params.ts")
    const sheet = read("components/sheets/member-share-application-sheet.tsx")

    expect(params).toContain('"details"')
    expect(sheet).toContain("trpc.shareApplications.get.queryOptions")
    expect(sheet).toContain("<MemberShareApplicationDetailsContent")
    expect(sheet).toContain("mobileFullScreen")
  })

  test("waits for URL sheet closure before refreshing position summaries", () => {
    const content = read("components/share-application-content.tsx")

    expect(content).toContain("await onClose()")
    expect(content.indexOf("await onClose()")).toBeLessThan(
      content.indexOf("router.refresh()")
    )
  })
})
