import {
  createDbRuntime,
  getTenantMemberSignupSettings,
  getImportReferenceData,
  listImportBatches,
  listMembers,
} from "@halaal-vest/db"
import { getDashboardServerContext } from "@/lib/server-context"
import { allStaffRoles, hasAnyRole, memberManagementRoles } from "@/lib/workspace-access"
import {
  getActiveMemberFilterChips,
  getMemberFilterValues,
  toMemberQueryFilters,
} from "./member-filters"

export async function loadMembersPageData(
  searchParams: Record<string, string | string[] | undefined>,
) {
  const filters = getMemberFilterValues(searchParams)
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const canManageMembers = hasAnyRole(context.auth.membership?.role, memberManagementRoles)
  const canManageImports = hasAnyRole(context.auth.membership?.role, allStaffRoles)

  if (!context.tenant || runtime.status !== "database-configured") {
    return {
      state: "unavailable" as const,
      canManageImports,
      canManageMembers,
      filters,
    }
  }

  const [members, referenceData, batches, signupSettings] = await Promise.all([
    listMembers(context.tenant.id, {
      ...toMemberQueryFilters(filters),
      page: 1,
      pageSize: 20,
    }),
    canManageImports ? getImportReferenceData(context.tenant.id) : Promise.resolve(null),
    canManageImports ? listImportBatches(context.tenant.id) : Promise.resolve([]),
    getTenantMemberSignupSettings(context.tenant.id),
  ])

  return {
    state: "ready" as const,
    activeFilters: getActiveMemberFilterChips(filters),
    batches,
    canManageImports,
    canManageMembers,
    filters,
    members,
    referenceData,
    signupSettings,
    summary: {
      activeCount: members.items.filter((member) => member.status === "active").length,
      kycPendingCount: members.items.filter((member) => member.kycStatus !== "verified").length,
      linkedUsersCount: members.items.filter((member) => member.user?.email).length,
      totalCount: members.total,
    },
  }
}
