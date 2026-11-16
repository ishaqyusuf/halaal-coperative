import {
  createDbRuntime,
  getMemberDetailOverview,
  getMemberOperationalReadiness,
  getTenantMigrationWriteAccess,
} from "@halaalvest/db"
import { getRequestTenantOperationProfile } from "@/lib/navigation/operation-profile"
import {
  canShowQuickFill,
  getDashboardServerContext,
} from "@/lib/server-context"
import {
  allStaffRoles,
  hasAnyRole,
  memberManagementRoles,
} from "@/lib/workspace-access"

type MemberDetailOverview = NonNullable<
  Awaited<ReturnType<typeof getMemberDetailOverview>>
>

export type MemberDetailPageData =
  | {
      state: "unavailable"
    }
  | {
      state: "not-found"
    }
  | {
      canChangeWorkplace: boolean
      canManageCommitments: boolean
      canManageMembers: boolean
      /** Still in setup: a commitment set now starts the month of go-live. */
      commitmentStartsAtGoLive: boolean
      detail: MemberDetailOverview
      operationalReadiness: NonNullable<
        Awaited<ReturnType<typeof getMemberOperationalReadiness>>
      >
      quickFillEnabled: boolean
      state: "ready"
      tenantStartDate: string | null
    }

function toDateString(value: Date | string | null | undefined) {
  if (!value) return null
  return typeof value === "string"
    ? value.slice(0, 10)
    : value.toISOString().slice(0, 10)
}

function isDecimalLike(value: unknown): value is { toNumber: () => number } {
  const constructorName = (value as { constructor?: { name?: string } } | null)
    ?.constructor?.name

  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { toNumber?: unknown }).toNumber === "function" &&
    typeof (value as { toFixed?: unknown }).toFixed === "function" &&
    typeof constructorName === "string" &&
    constructorName.startsWith("Decimal")
  )
}

function toClientValue<T>(value: T): T {
  if (isDecimalLike(value)) {
    return value.toNumber() as T
  }

  if (value instanceof Date) {
    return value
  }

  if (Array.isArray(value)) {
    return value.map((item) => toClientValue(item)) as T
  }

  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, toClientValue(item)])
    ) as T
  }

  return value
}

export async function loadMemberDetailPageData(
  memberId: string
): Promise<MemberDetailPageData> {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()

  if (!context.tenant || runtime.status !== "database-configured") {
    return {
      state: "unavailable" as const,
    }
  }

  // Member-role users read their own records elsewhere; never another member's.
  if (!hasAnyRole(context.auth.membership?.role, allStaffRoles)) {
    return {
      state: "not-found" as const,
    }
  }

  const canManageMembers = hasAnyRole(
    context.auth.membership?.role,
    memberManagementRoles
  )
  const [detail, operationalReadiness, operationProfile, writeAccess] =
    await Promise.all([
      getMemberDetailOverview(context.tenant.id, memberId),
      getMemberOperationalReadiness({
        memberId,
        tenantId: context.tenant.id,
      }),
      canManageMembers
        ? getRequestTenantOperationProfile(context.tenant.id)
        : Promise.resolve(null),
      getTenantMigrationWriteAccess(context.tenant.id),
    ])

  if (!detail || !operationalReadiness) {
    return {
      state: "not-found" as const,
    }
  }

  return {
    state: "ready" as const,
    canChangeWorkplace: Boolean(
      operationProfile?.services.collection_sources.canStaffCreate
    ),
    canManageCommitments: hasAnyRole(
      context.auth.membership?.role,
      allStaffRoles
    ),
    canManageMembers,
    commitmentStartsAtGoLive: !writeAccess.canUseLiveFinancialWrites,
    detail: toClientValue(detail),
    operationalReadiness,
    quickFillEnabled: canShowQuickFill(context),
    tenantStartDate: toDateString(context.tenant.startDate),
  }
}
