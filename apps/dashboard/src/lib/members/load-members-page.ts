import {
  createDbRuntime,
  getMemberRegistrySummary,
  getTenantMemberSignupSettings,
  getTenantMigrationSetup,
  type TenantMigrationSetupMode,
  listActiveDeductionSources,
} from "@halaalvest/db"
import type { MembersFilterParams } from "@/hooks/use-members-filter-params"
import { getRequestTenantOperationProfile } from "@/lib/navigation/operation-profile"
import {
  canShowQuickFill,
  getDashboardServerContext,
} from "@/lib/server-context"
import { getRequestMigrationGateState } from "@/lib/setup-gate"
import {
  allStaffRoles,
  hasAnyRole,
  memberManagementRoles,
} from "@/lib/workspace-access"
import {
  getActiveMemberFilters,
  hasActiveMemberFilters,
  toMemberQueryFilters,
} from "./member-filters"

type MemberSignupAccessMode = "disabled" | "hidden" | "in_office" | "public"

type MembersPageTenant = {
  memberNumberPrefix?: string | null
  migrationSetupMode: TenantMigrationSetupMode
  startDate?: string | null
}

type MembersPageSignupSettings = {
  memberSignupAccessMode: MemberSignupAccessMode
}

export type MemberCollectionSourceOption = {
  id: string
  label: string
}

export type MembersPageData =
  | {
      accessDenied: boolean
      canManageImports: boolean
      canManageCollectionSources: boolean
      canManageMembers: boolean
      collectionSourceOptions: MemberCollectionSourceOption[]
      filters: MembersFilterParams
      quickFillEnabled: boolean
      state: "unavailable"
      tenant: MembersPageTenant | null
    }
  | {
      activeFilters: ReturnType<typeof getActiveMemberFilters>
      canManageImports: boolean
      canManageCollectionSources: boolean
      canManageMembers: boolean
      collectionSourceOptions: MemberCollectionSourceOption[]
      filters: MembersFilterParams
      hasFilters: boolean
      quickFillEnabled: boolean
      signupSettings: MembersPageSignupSettings
      state: "ready"
      summary: {
        activeCount: number
        kycPendingCount: number
        linkedUsersCount: number
        migrationFinalizedCount: number
        totalCount: number
      }
      tenant: MembersPageTenant | null
    }

function toTenantStartDateString(value: Date | string | null | undefined) {
  if (!value) return null
  return typeof value === "string"
    ? value.slice(0, 10)
    : value.toISOString().slice(0, 10)
}

function toMembersPageTenant(
  tenant: Awaited<ReturnType<typeof getDashboardServerContext>>["tenant"],
  migrationSetupMode: TenantMigrationSetupMode = "historical_backfill"
): MembersPageTenant | null {
  if (!tenant) return null

  return {
    memberNumberPrefix: tenant.memberNumberPrefix,
    migrationSetupMode,
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
  filters: MembersFilterParams
): Promise<MembersPageData> {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const canManageMembers = hasAnyRole(
    context.auth.membership?.role,
    memberManagementRoles
  )
  const hasImportRole = hasAnyRole(context.auth.membership?.role, allStaffRoles)
  const quickFillEnabled = canShowQuickFill(context)
  let tenant = toMembersPageTenant(context.tenant)

  if (!hasImportRole) {
    return {
      state: "unavailable" as const,
      accessDenied: true,
      canManageCollectionSources: false,
      canManageImports: false,
      canManageMembers: false,
      collectionSourceOptions: [],
      filters,
      quickFillEnabled,
      tenant,
    }
  }

  if (!context.tenant || runtime.status !== "database-configured") {
    return {
      state: "unavailable" as const,
      accessDenied: false,
      canManageCollectionSources: false,
      canManageImports: hasImportRole,
      canManageMembers,
      collectionSourceOptions: [],
      filters,
      quickFillEnabled,
      tenant,
    }
  }

  let signupSettings
  let migrationSetup
  let operationProfile
  let migrationGate: Awaited<ReturnType<typeof getRequestMigrationGateState>>
  let summary: Awaited<ReturnType<typeof getMemberRegistrySummary>>
  let deductionSources = [] as Awaited<
    ReturnType<typeof listActiveDeductionSources>
  >

  try {
    // Import reference data and batches load with the import sheet
    // (`imports.referenceData`), so they no longer block the page.
    ;[
      signupSettings,
      migrationSetup,
      operationProfile,
      migrationGate,
      summary,
    ] = await Promise.all([
      getTenantMemberSignupSettings(context.tenant.id),
      getTenantMigrationSetup(context.tenant.id),
      getRequestTenantOperationProfile(context.tenant.id),
      getRequestMigrationGateState(context.tenant.id),
      getMemberRegistrySummary(
        context.tenant.id,
        toMemberQueryFilters(filters)
      ),
    ])
    tenant = toMembersPageTenant(context.tenant, migrationSetup.mode)
    if (
      canManageMembers &&
      operationProfile.services.collection_sources.canStaffCreate
    ) {
      deductionSources = await listActiveDeductionSources(context.tenant.id)
    }
  } catch (error) {
    if (!isUnavailableMembersRuntimeError(error)) {
      throw error
    }

    return {
      state: "unavailable" as const,
      accessDenied: false,
      canManageCollectionSources: false,
      canManageImports: hasImportRole,
      canManageMembers,
      collectionSourceOptions: [],
      filters,
      quickFillEnabled,
      tenant,
    }
  }

  return {
    state: "ready" as const,
    canManageCollectionSources:
      canManageMembers &&
      operationProfile.services.collection_sources.canStaffCreate,
    canManageImports:
      hasImportRole &&
      migrationGate.migrationState !== null &&
      migrationGate.migrationState.snapshot.canUseMigrationTools &&
      migrationGate.migrationState.counts.appliedBackfillBatches === 0 &&
      migrationGate.migrationState.counts.appliedBackfillMembers === 0 &&
      migrationGate.migrationState.counts.appliedBackfillMonths === 0,
    canManageMembers,
    collectionSourceOptions: deductionSources.map((source) => ({
      id: source.id,
      label: `${source.name} (${source.type.replace(/_/g, " ")})`,
    })),
    activeFilters: getActiveMemberFilters(filters),
    filters,
    hasFilters: hasActiveMemberFilters(filters),
    quickFillEnabled,
    signupSettings,
    tenant,
    summary,
  }
}
