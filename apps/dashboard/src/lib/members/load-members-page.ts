import {
  createDbRuntime,
  getImportReferenceData,
  getTenantMemberSignupSettings,
  listImportBatches,
  listMembers,
} from "@halaalvest/db"
import type { MembersFilterParams } from "@/hooks/use-members-filter-params"
import type { DashboardImportReferenceData } from "@/lib/import-csv"
import { getDashboardServerContext } from "@/lib/server-context"
import { allStaffRoles, hasAnyRole, memberManagementRoles } from "@/lib/workspace-access"
import {
  getActiveMemberFilters,
  hasActiveMemberFilters,
  toMemberQueryFilters,
} from "./member-filters"

type MemberSignupAccessMode = "in_office" | "public"

type MembersPageTenant = {
  memberNumberPrefix?: string | null
  startDate?: string | null
}

type MembersPageMemberRow = {
  fullName: string
  id: string
  joinedAt: Date
  kycStatus: string
  memberNumber: string
  memberType: string
  status: string
  user?: { email: string | null } | null
}

type MembersPageBatchRow = {
  _count: { rows: number }
  createdAt: Date
  duplicateRowCount: number
  existingMatchCount: number
  id: string
  importType: string
  status: string
  validRows: number
}

type MembersPageSignupSettings = {
  memberSignupAccessMode: MemberSignupAccessMode
}

export type MembersPageData =
  | {
      canManageImports: boolean
      canManageMembers: boolean
      filters: MembersFilterParams
      state: "unavailable"
      tenant: MembersPageTenant | null
    }
  | {
      activeFilters: ReturnType<typeof getActiveMemberFilters>
      batches: MembersPageBatchRow[]
      canManageImports: boolean
      canManageMembers: boolean
      filters: MembersFilterParams
      hasFilters: boolean
      members: {
        items: MembersPageMemberRow[]
        total: number
      }
      referenceData: DashboardImportReferenceData | null
      signupSettings: MembersPageSignupSettings
      state: "ready"
      summary: {
        activeCount: number
        kycPendingCount: number
        linkedUsersCount: number
        totalCount: number
      }
      tenant: MembersPageTenant | null
    }

function toTenantStartDateString(value: Date | string | null | undefined) {
  if (!value) return null
  return typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10)
}

function toMembersPageTenant(
  tenant: Awaited<ReturnType<typeof getDashboardServerContext>>["tenant"],
): MembersPageTenant | null {
  if (!tenant) return null

  return {
    memberNumberPrefix: tenant.memberNumberPrefix,
    startDate: toTenantStartDateString(tenant.startDate),
  }
}

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

export async function loadMembersPageData(
  filters: MembersFilterParams,
): Promise<MembersPageData> {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const canManageMembers = hasAnyRole(context.auth.membership?.role, memberManagementRoles)
  const canManageImports = hasAnyRole(context.auth.membership?.role, allStaffRoles)
  const tenant = toMembersPageTenant(context.tenant)

  if (!context.tenant || runtime.status !== "database-configured") {
    return {
      state: "unavailable" as const,
      canManageImports,
      canManageMembers,
      filters,
      tenant,
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
      tenant,
    }
  }

  return {
    state: "ready" as const,
    batches: batches as MembersPageBatchRow[],
    canManageImports,
    canManageMembers,
    activeFilters: getActiveMemberFilters(filters),
    filters,
    hasFilters: hasActiveMemberFilters(filters),
    members: members as { items: MembersPageMemberRow[]; total: number },
    referenceData,
    signupSettings,
    tenant,
    summary: {
      activeCount: members.items.filter((member) => member.status === "active").length,
      kycPendingCount: members.items.filter((member) => member.kycStatus !== "verified").length,
      linkedUsersCount: members.items.filter((member) => member.user?.email).length,
      totalCount: members.total,
    },
  }
}
