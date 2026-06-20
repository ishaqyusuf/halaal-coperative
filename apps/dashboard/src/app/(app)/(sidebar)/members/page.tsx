import { getMemberFilterMetadata } from "@halaalvest/db"
import { DashboardActionLink, DashboardEmptyState, ScrollableContent } from "@/components/dashboard"
import { MemberImportPanel } from "@/components/member-import-panel"
import {
  MembersActive,
  MembersAll,
  MembersKycPending,
  MembersLinkedUsers,
  MembersPageHeader,
} from "@/components/members"
import { MemberCreateModal } from "@/components/modals/member-create-modal"
import { MembersDataTable } from "@/components/tables/members/data-table"
import { CollapsibleSummary } from "@/components/dashboard"
import { loadMembersFilterParams } from "@/hooks/use-members-filter-params"
import { loadMembersPageData } from "@/lib/members"

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const filters = loadMembersFilterParams(params)
  const startWithImportPanelOpen = params.import === "1"
  const [data, filterList] = await Promise.all([
    loadMembersPageData(filters),
    getMemberFilterMetadata(),
  ])

  if (data.state !== "ready") {
    return (
      <ScrollableContent>
        <div className="flex flex-col gap-6">
          <MembersPageHeader
            createAction={
              data.canManageMembers ? (
                <MemberCreateModal devMode={process.env.NODE_ENV !== "production"} memberNumberPrefix={data.tenant?.memberNumberPrefix} />
              ) : undefined
            }
            filterList={filterList}
            secondaryActions={
              data.canManageMembers ? (
                <DashboardActionLink className="px-4" href="/member-signup-links">
                  Open link generator
                </DashboardActionLink>
              ) : undefined
            }
          />

          <DashboardEmptyState
            body="The member registry could not load from the tenant database right now. If you still open the create form, submissions will fail until the database connection is restored."
            title="Database-backed member records are not available yet."
          />
        </div>
      </ScrollableContent>
    )
  }

  return (
    <ScrollableContent>
      <div className="flex flex-col gap-6">
        <CollapsibleSummary>
          <section className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            <MembersAll filters={data.filters} totalCount={data.summary.totalCount} />
            <MembersActive activeCount={data.summary.activeCount} filters={data.filters} />
            <MembersKycPending
              filters={data.filters}
              kycPendingCount={data.summary.kycPendingCount}
            />
            <MembersLinkedUsers linkedUsersCount={data.summary.linkedUsersCount} />
          </section>
        </CollapsibleSummary>

        <MembersPageHeader
          createAction={
            data.canManageMembers ? (
              <MemberCreateModal devMode={process.env.NODE_ENV !== "production"} memberNumberPrefix={data.tenant?.memberNumberPrefix} />
            ) : undefined
          }
          filterList={filterList}
          importPanel={
            data.canManageImports && data.referenceData ? (
              <MemberImportPanel
                batches={data.batches}
                devMode={process.env.NODE_ENV !== "production"}
                referenceData={data.referenceData}
              />
            ) : undefined
          }
          secondaryActions={
            data.canManageMembers && data.signupSettings.memberSignupAccessMode !== "public" ? (
              <DashboardActionLink className="px-4" href="/member-signup-links">
                Open link generator
              </DashboardActionLink>
            ) : undefined
          }
          startWithImportPanelOpen={startWithImportPanelOpen}
        />

        <MembersDataTable
          canManageMembers={data.canManageMembers}
          cooperativeStartDate={data.tenant?.startDate ?? null}
          hasFilters={data.hasFilters}
          members={data.members.items}
        />
      </div>
    </ScrollableContent>
  )
}
