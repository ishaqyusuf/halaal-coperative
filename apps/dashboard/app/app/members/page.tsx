import {
  createDbRuntime,
  getImportReferenceData,
  listImportBatches,
  listMembers,
} from "@halaal-vest/db"
import {
  MemberCreateModal,
  MemberImportPanel,
  MemberRegistryTable,
  MembersHeader,
  MemberSummaryStrip,
} from "@/features/members/components"
import {
  getActiveMemberFilterChips,
  getMemberFilterValues,
  toMemberQueryFilters,
} from "@/features/members/lib/member-filters"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/features/workspace/page-shell"
import { getDashboardServerContext } from "@/lib/server-context"
import { allStaffRoles, hasAnyRole, memberManagementRoles } from "@/lib/workspace-access"

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const filters = getMemberFilterValues(params)
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const canManageMembers = hasAnyRole(context.auth.membership?.role, memberManagementRoles)
  const canManageImports = hasAnyRole(context.auth.membership?.role, allStaffRoles)

  if (!context.tenant || runtime.status !== "database-configured") {
    return (
      <WorkspacePageShell
        eyebrow="Members"
        title="Member registry"
        description="Review member onboarding, operational filters, and import-driven registry workflows from one staff workspace."
      >
        <WorkspaceEmptyState
          title="Database-backed member records are not available yet."
          body="Configure the database runtime to load the tenant member registry, filter it, and stage member imports here."
        />
      </WorkspacePageShell>
    )
  }

  const [members, referenceData, batches] = await Promise.all([
    listMembers(context.tenant.id, {
      ...toMemberQueryFilters(filters),
      page: 1,
      pageSize: 20,
    }),
    canManageImports ? getImportReferenceData(context.tenant.id) : Promise.resolve(null),
    canManageImports ? listImportBatches(context.tenant.id) : Promise.resolve([]),
  ])

  const activeFilters = getActiveMemberFilterChips(filters)

  return (
    <WorkspacePageShell
      eyebrow="Members"
      title="Member registry"
      description="Midday-style member operations with search, structured filters, staged imports, and one denser registry for staff workflows."
    >
      <MembersHeader
        activeFilters={activeFilters}
        createAction={
          canManageMembers ? <MemberCreateModal devMode={process.env.NODE_ENV !== "production"} /> : undefined
        }
        defaultValues={filters}
        importPanel={
          canManageImports && referenceData ? (
            <MemberImportPanel
              batches={batches}
              devMode={process.env.NODE_ENV !== "production"}
              referenceData={referenceData}
            />
          ) : undefined
        }
      />

      <MemberSummaryStrip
        activeCount={members.items.filter((member) => member.status === "active").length}
        kycPendingCount={members.items.filter((member) => member.kycStatus !== "verified").length}
        linkedUsersCount={members.items.filter((member) => member.user?.email).length}
        totalCount={members.total}
      />

      <MemberRegistryTable canManageMembers={canManageMembers} members={members.items} />
    </WorkspacePageShell>
  )
}
