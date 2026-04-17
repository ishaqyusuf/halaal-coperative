import { MemberCreateModal, MemberImportPanel } from "@/components/tables/members"
import {
  MembersActive,
  MembersAll,
  MembersDataTable,
  MembersKycPending,
  MembersLinkedUsers,
  MembersPageHeader,
} from "@/components/tables/members"
import {
  CollapsibleSummary,
  DashboardActionLink,
  DashboardEmptyState,
  ScrollableContent,
} from "@/components/dashboard"
import { loadMembersPageData } from "@/lib/members"

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const data = await loadMembersPageData(params)
  const startWithImportPanelOpen = params.import === "1"

  if (data.state !== "ready") {
    return (
      <ScrollableContent>
        <div className="flex flex-col gap-6">
          <MembersPageHeader
            activeFilters={[]}
            createAction={
              data.canManageMembers ? (
                <MemberCreateModal devMode={process.env.NODE_ENV !== "production"} />
              ) : undefined
            }
            defaultValues={data.filters}
            secondaryActions={
              data.canManageMembers ? (
                <DashboardActionLink href="/member-signup-links" className="px-4">
                  Open link generator
                </DashboardActionLink>
              ) : undefined
            }
          />

          <DashboardEmptyState
            title="Database-backed member records are not available yet."
            body="Configure the database runtime to load the tenant member registry, filter it, and stage member imports here."
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
            <MembersActive filters={data.filters} activeCount={data.summary.activeCount} />
            <MembersKycPending
              filters={data.filters}
              kycPendingCount={data.summary.kycPendingCount}
            />
            <MembersLinkedUsers linkedUsersCount={data.summary.linkedUsersCount} />
          </section>
        </CollapsibleSummary>

        <MembersPageHeader
          activeFilters={data.activeFilters}
          createAction={
            data.canManageMembers ? (
              <MemberCreateModal devMode={process.env.NODE_ENV !== "production"} />
            ) : undefined
          }
          defaultValues={data.filters}
          importPanel={
            data.canManageImports && data.referenceData ? (
              <MemberImportPanel
                batches={data.batches}
                devMode={process.env.NODE_ENV !== "production"}
                referenceData={data.referenceData}
              />
            ) : undefined
          }
          startWithImportPanelOpen={startWithImportPanelOpen}
          secondaryActions={
            <>
              {data.canManageMembers && data.signupSettings.memberSignupAccessMode !== "public" ? (
                <DashboardActionLink href="/member-signup-links" className="px-4">
                  Open link generator
                </DashboardActionLink>
              ) : null}
            </>
          }
        />

        <MembersDataTable
          canManageMembers={data.canManageMembers}
          hasFilters={data.activeFilters.length > 0}
          members={data.members.items}
        />
      </div>
    </ScrollableContent>
  )
}
