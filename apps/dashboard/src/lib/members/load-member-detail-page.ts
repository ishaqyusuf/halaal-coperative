import { createDbRuntime, getMemberStatementDetail } from "@halaalvest/db"
import {
  canShowQuickFill,
  getDashboardServerContext,
} from "@/lib/server-context"
import {
  allStaffRoles,
  hasAnyRole,
  memberManagementRoles,
} from "@/lib/workspace-access"

type MemberStatementDetail = NonNullable<
  Awaited<ReturnType<typeof getMemberStatementDetail>>
>

export type MemberDetailPageData =
  | {
      state: "unavailable"
    }
  | {
      state: "not-found"
    }
  | {
      canManageCommitments: boolean
      canManageMembers: boolean
      detail: MemberStatementDetail
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

  const detail = await getMemberStatementDetail(context.tenant.id, memberId)

  if (!detail) {
    return {
      state: "not-found" as const,
    }
  }

  return {
    state: "ready" as const,
    canManageCommitments: hasAnyRole(
      context.auth.membership?.role,
      allStaffRoles
    ),
    canManageMembers: hasAnyRole(
      context.auth.membership?.role,
      memberManagementRoles
    ),
    detail: toClientValue(detail),
    quickFillEnabled: canShowQuickFill(context),
    tenantStartDate: toDateString(context.tenant.startDate),
  }
}
