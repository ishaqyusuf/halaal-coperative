import { Suspense } from "react"
import {
  CollapsibleSummary,
  DashboardActionLink,
  DashboardEmptyState,
  ScrollableContent,
} from "@/components/dashboard"
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
import { MembersSkeleton } from "@/components/tables/members/skeleton"
import {
  loadMembersFilterParams,
  type MembersFilterParams,
} from "@/hooks/use-members-filter-params"
import { loadSortParams } from "@/hooks/use-sort-params"
import { getInitialMemberImportColumnSettings } from "@/lib/member-import-column-settings.server"
import { loadMembersPageData } from "@/lib/members"
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server"
import { getInitialTableSettings } from "@/utils/columns"

type SearchParams = Record<string, string | string[] | undefined>

type MembersSortField =
  | "fullName"
  | "memberNumber"
  | "memberType"
  | "status"
  | "kycStatus"
  | "joinedAt"

function getSort(sort?: string[] | null): [MembersSortField, "asc" | "desc"] | null {
  if (!sort || sort.length !== 2) return null

  const [field, direction] = sort
  const validFields = new Set<string>([
    "fullName",
    "memberNumber",
    "memberType",
    "status",
    "kycStatus",
    "joinedAt",
  ])

  if (!validFields.has(field)) return null
  if (direction !== "asc" && direction !== "desc") return null

  return [field as MembersSortField, direction]
}

function getEnumValue<TValue extends string>(
  value: string | null,
  validValues: readonly TValue[]
) {
  return validValues.includes(value as TValue) ? (value as TValue) : undefined
}

function getMembersListInput(
  filters: MembersFilterParams,
  sort?: string[] | null
) {
  return {
    joinedFrom: filters.joinedFrom ?? undefined,
    joinedTo: filters.joinedTo ?? undefined,
    kycStatus: getEnumValue(filters.kycStatus, [
      "not_started",
      "pending",
      "verified",
      "rejected",
    ] as const),
    memberType: getEnumValue(filters.memberType, [
      "civil_servant",
      "individual",
      "business",
    ] as const),
    q: filters.q ?? undefined,
    sort: getSort(sort),
    status: getEnumValue(filters.status, [
      "pending",
      "active",
      "inactive",
      "suspended",
      "exited",
    ] as const),
  }
}

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const filters = loadMembersFilterParams(params)
  const { sort } = loadSortParams(params)
  const startWithImportPanelOpen = params.import === "1"
  const [initialSettings, initialImportColumnSettings, data] = await Promise.all([
    getInitialTableSettings("members"),
    getInitialMemberImportColumnSettings(),
    loadMembersPageData(filters),
  ])

  if (data.state !== "ready") {
    return (
      <ScrollableContent>
        <div className="flex flex-col gap-6">
          <MembersPageHeader
            createAction={
              data.canManageMembers ? (
                <MemberCreateModal
                  devMode={process.env.NODE_ENV !== "production"}
                  memberNumberPrefix={data.tenant?.memberNumberPrefix}
                />
              ) : undefined
            }
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

  batchPrefetch([
    trpc.members.list.infiniteQueryOptions(
      getMembersListInput(filters, sort),
      {
        getNextPageParam: ({ meta }) => meta?.cursor,
      }
    ),
  ])

  return (
    <HydrateClient>
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
                <MemberCreateModal
                  devMode={process.env.NODE_ENV !== "production"}
                  memberNumberPrefix={data.tenant?.memberNumberPrefix}
                />
              ) : undefined
            }
            importPanel={
              data.canManageImports && data.referenceData ? (
                <MemberImportPanel
                  batches={data.batches}
                  devMode={process.env.NODE_ENV !== "production"}
                  initialColumnSettings={initialImportColumnSettings}
                  referenceData={data.referenceData}
                />
              ) : undefined
            }
            secondaryActions={
              data.canManageMembers &&
              data.signupSettings.memberSignupAccessMode !== "public" ? (
                <DashboardActionLink className="px-4" href="/member-signup-links">
                  Open link generator
                </DashboardActionLink>
              ) : undefined
            }
            startWithImportPanelOpen={startWithImportPanelOpen}
          />

          <Suspense fallback={<MembersSkeleton />}>
            <MembersDataTable
              canManageMembers={data.canManageMembers}
              initialSettings={initialSettings}
            />
          </Suspense>
        </div>
      </ScrollableContent>
    </HydrateClient>
  )
}
