import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8")
}

describe("member workspace Midday conformance", () => {
  test("hydrates one shared Suspense infinite-query contract without polling", () => {
    const route = read("../app/(app)/(sidebar)/members/page.tsx")
    const table = read("../components/tables/members/data-table.tsx")
    const query = read(
      "../components/tables/members/use-members-directory-query.ts"
    )

    expect(route).toContain("batchPrefetch([membersListOptions])")
    expect(route).toContain("getMembersListInput(filters, sort)")
    expect(query).toContain("useSuspenseInfiniteQuery")
    expect(query).toContain(
      "getMembersListInput(filters, params.sort, deferredSearch)"
    )
    expect(query).not.toContain("refetchInterval")
    expect(query).not.toContain("refetchOnWindowFocus")
    expect(table).toContain("useMembersDirectoryQuery")
  })

  test("keeps full-directory reads behind the staff role boundary", () => {
    const router = read("../../../api/src/routers/members.route.ts")
    const loader = read("./members/load-members-page.ts")

    expect(router).toContain('list: minRoleProcedure("operations_officer")')
    expect(router).toContain('get: minRoleProcedure("operations_officer")')
    expect(loader).toContain("if (!hasImportRole)")
    expect(loader).toContain("accessDenied: true")
  })

  test("keeps member directory controls usable at phone widths", () => {
    const header = read("../components/members/members-header.tsx")
    const filters = read("../components/members/members-search-filter.tsx")
    const mobileToolbar = read(
      "../components/members/members-mobile-toolbar.tsx"
    )
    const bottomBar = read("../components/tables/core/bottom-bar.tsx")

    expect(header).toContain("{createAction}")
    expect(header).not.toContain('className="hidden sm:block"')
    expect(filters).toContain("<DateRangeFilter")
    expect(filters).toContain("filters.dateRange")
    expect(mobileToolbar).toContain("MembersFilterDrawer")
    expect(mobileToolbar).toContain("Clear filters")
    expect(mobileToolbar).toContain("<OpenMemberSheet iconOnly />")
    expect(mobileToolbar).toContain('aria-label="More member actions"')
    expect(bottomBar).toContain("w-full max-w-xl")
  })

  test("uses a shadcn Item list and bottom drawers instead of the table on mobile", () => {
    const pageView = read("../components/members/members-page-view.tsx")
    const dataView = read("../components/tables/members/data-view.tsx")
    const responsiveDataView = read(
      "../components/tables/core/responsive-data-view.tsx"
    )
    const mobileList = read("../components/tables/members/mobile-list.tsx")
    const mobileItem = read("../components/tables/members/mobile-item.tsx")
    const mobileActions = read(
      "../components/tables/core/mobile-actions-drawer.tsx"
    )
    const mobileFilters = read(
      "../components/search-filter/mobile-filter-drawer.tsx"
    )

    expect(pageView).toContain('className="hidden md:block"')
    expect(dataView).toContain("<ResponsiveDataView")
    expect(dataView).toContain("fallback={<MembersSkeleton />}")
    expect(dataView).toContain(
      "mobile={<MembersMobileList canManageMembers={canManageMembers} />}"
    )
    expect(responsiveDataView).toContain("isMobile === undefined")
    expect(responsiveDataView).toContain("return fallback")
    expect(mobileList).toContain("useVirtualizer")
    expect(mobileList).toContain("useMembersDirectoryQuery")
    expect(mobileList).toContain("border-t border-border")
    expect(mobileList).toContain("border-b border-border")
    expect(mobileItem).toContain('from "@halaalvest/ui/components/item"')
    expect(mobileItem).toContain("border-0 bg-transparent")
    expect(mobileItem).not.toContain("cursor-pointer gap-3 bg-background p-4")
    expect(mobileItem).toContain("<dl")
    expect(mobileItem).toContain("Migration setup")
    expect(mobileItem).toContain("Member status")
    expect(mobileItem).toContain(">KYC</dt>")
    expect(mobileItem).toContain("<MigrationSetupStatusBadge")
    expect(mobileItem).toContain("<MemberStatusBadge")
    expect(mobileItem).toContain("<KycBadge")
    expect(mobileItem).toContain("<MemberMobileActionsDrawer")
    expect(mobileActions).toContain('from "@halaalvest/ui/components/drawer"')
    expect(mobileFilters).toContain('from "@halaalvest/ui/components/drawer"')
  })

  test("keeps mobile member filters and sort URL-addressable", () => {
    const drawer = read("../components/members/members-filter-drawer.tsx")
    const filterHook = read("../hooks/use-members-filter-params.ts")
    const queryHook = read(
      "../components/tables/members/use-members-directory-query.ts"
    )

    expect(drawer).toContain("memberStatusFilters")
    expect(drawer).toContain("memberTypeFilters")
    expect(drawer).toContain("kycStatusFilters")
    expect(drawer).toContain("getMigrationStatusFilters")
    expect(drawer).toContain("memberSortOptions")
    expect(drawer).toContain("<DateRangeFilter")
    expect(drawer).toContain("draft.dateRange")
    expect(filterHook).toContain("membersControlsParamsSchema")
    expect(filterHook).toContain("clearedMembersControlsParams")
    expect(queryHook).toContain("getMembersListInput")
    expect(queryHook).toContain("useSuspenseInfiniteQuery")
  })

  test("uses the member checkmark only for completed migration evidence", () => {
    const columns = read("../components/tables/members/columns.tsx")

    expect(columns).toContain(
      'row.original.operationalReadiness?.migration.state === "applied"'
    )
    expect(columns).toContain('"Brought forward completed"')
    expect(columns).toContain('"Backfill completed"')
    expect(columns).not.toContain(
      "isVerified={row.original.operationalReadiness?.isReady"
    )
  })

  test("separates migration setup status from member and KYC status", () => {
    const columns = read("../components/tables/members/columns.tsx")
    const filters = read("../components/members/members-search-filter.tsx")
    const tableConfig = read("../utils/table-configs.ts")

    expect(columns).toContain('? "Completed"')
    expect(columns).toContain('? "In progress"')
    expect(columns).toContain('? "Not required"')
    expect(columns).toContain(': "Action required"')
    expect(columns).not.toContain("isOperationallyReady")
    expect(columns).toContain('header: "Migration setup status"')
    expect(columns).toContain('id: "migrationSetupStatus"')
    expect(columns).toContain('accessorKey: "status"')
    expect(columns).toContain('header: "Member status"')
    expect(filters).toContain('label="Member status"')
    expect(tableConfig).toContain(
      'number: "joinedAt",\n    status: "status",\n    kyc: "kycStatus"'
    )
    expect(tableConfig).not.toContain("migrationSetupStatus:")
  })

  test("provides responsive detail, statement, migration, and import surfaces", () => {
    const detail = read("../components/member-detail-view.tsx")
    const detailActions = read("../components/member-detail-actions.tsx")
    const detailError = read(
      "../app/(app)/(sidebar)/members/[memberId]/error.tsx"
    )
    const detailLoading = read(
      "../app/(app)/(sidebar)/members/[memberId]/loading.tsx"
    )
    const detailStates = read("../components/member-detail-page-states.tsx")
    const statement = read("../components/member-statement-view.tsx")
    const backfill = read("../components/members/member-backfill-page-view.tsx")
    const importHeader = read("../components/member-import-sheet-header.tsx")
    const importContent = read("../components/member-import-content.tsx")

    expect(detail).toContain("<MemberDetailActions")
    expect(detail).toContain("grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4")
    expect(detailActions).toContain("<MobileActionsDrawer")
    expect(detailActions).toContain('aria-label="More member detail actions"')
    expect(detailLoading).toContain("<MemberDetailSkeleton")
    expect(detailStates).toContain('role="status"')
    expect(detailError).toContain("reset")
    expect(detailError).toContain("Back to member registry")
    expect(statement).toContain("px-3 py-6 sm:px-6 sm:py-10")
    expect(backfill).toContain("MobileStepNavigation")
    expect(backfill).toContain("overflow-x-auto")
    expect(importHeader).toContain("<DialogHeader")
    expect(importHeader).toContain(
      "grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto"
    )
    expect(importContent).toContain("trpc.members.list.infiniteQueryFilter()")
    expect(importContent).toContain(
      "trpc.imports.batches.infiniteQueryFilter()"
    )
  })
})
