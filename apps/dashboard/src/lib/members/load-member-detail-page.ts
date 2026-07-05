import { createDbRuntime, getMemberStatementDetail } from "@halaalvest/db"
import { canShowQuickFill, getDashboardServerContext } from "@/lib/server-context"
import { allStaffRoles, hasAnyRole, memberManagementRoles } from "@/lib/workspace-access"

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
  return typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10)
}

export async function loadMemberDetailPageData(
  memberId: string,
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
    canManageCommitments: hasAnyRole(context.auth.membership?.role, allStaffRoles),
    canManageMembers: hasAnyRole(context.auth.membership?.role, memberManagementRoles),
    detail,
    quickFillEnabled: canShowQuickFill(context),
    tenantStartDate: toDateString(context.tenant.startDate),
  }
}
