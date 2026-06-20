import {
  createDbRuntime,
  getImportReferenceData,
  getTenantMemberSignupSettings,
  listImportBatches,
  listMembers,
} from "@halaalvest/db"
import type { MembersFilterParams } from "@/hooks/use-members-filter-params"
import { getDashboardServerContext } from "@/lib/server-context"
import { allStaffRoles, hasAnyRole, memberManagementRoles } from "@/lib/workspace-access"
import {
  getActiveMemberFilters,
  hasActiveMemberFilters,
  toMemberQueryFilters,
} from "./member-filters"

function isUnavailableMembersRuntimeError(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  return (
    error.message === "Database not configured" ||
    error.message.includes("ECONNREFUSED") ||
    error.message.includes("Can't reach database server")
  )
}

export async function loadMembersPageData(filters: MembersFilterParams) {
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
      tenant: context.tenant ?? null,
    }
  }

  let members
  let referenceData
  let batches
  let signupSettings

  try {
    ;[members, referenceData, batches, signupSettings] = await Promise.all([
      listMembers(context.tenant.id, {
        ...toMemberQueryFilters(filters),
        page: 1,
        pageSize: 20,
      }),
      canManageImports ? getImportReferenceData(context.tenant.id) : Promise.resolve(null),
      canManageImports ? listImportBatches(context.tenant.id) : Promise.resolve([]),
      getTenantMemberSignupSettings(context.tenant.id),
    ])
  } catch (error) {
    if (!isUnavailableMembersRuntimeError(error)) {
      throw error
    }

    return {
      state: "unavailable" as const,
      canManageImports,
      canManageMembers,
      filters,
      tenant: context.tenant,
    }
  }

  return {
    state: "ready" as const,
    batches,
    canManageImports,
    canManageMembers,
    activeFilters: getActiveMemberFilters(filters),
    filters,
    hasFilters: hasActiveMemberFilters(filters),
    members,
    referenceData,
    signupSettings,
    tenant: context.tenant,
    summary: {
      activeCount: members.items.filter((member) => member.status === "active").length,
      kycPendingCount: members.items.filter((member) => member.kycStatus !== "verified").length,
      linkedUsersCount: members.items.filter((member) => member.user?.email).length,
      totalCount: members.total,
    },
  }
}
