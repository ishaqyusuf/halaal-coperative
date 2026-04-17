import { createDbRuntime, getMemberStatementDetail } from "@halaal-vest/db"
import { getDashboardServerContext } from "@/lib/server-context"
import { hasAnyRole, memberManagementRoles } from "@/lib/workspace-access"

export async function loadMemberDetailPageData(memberId: string) {
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
    canManageMembers: hasAnyRole(context.auth.membership?.role, memberManagementRoles),
    detail,
  }
}
