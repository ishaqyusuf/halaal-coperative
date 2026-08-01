import { createDbRuntime, getMemberStatementDetail } from "@halaalvest/db"
import { getDashboardServerContext } from "@/lib/server-context"
import { allStaffRoles, hasAnyRole } from "@/lib/workspace-access"

type MemberStatementDetail = NonNullable<
  Awaited<ReturnType<typeof getMemberStatementDetail>>
>

export type MemberStatementPageData =
  | { state: "forbidden" }
  | { state: "not-found" }
  | { state: "unavailable" }
  | {
      detail: MemberStatementDetail
      state: "ready"
    }

export async function loadMemberStatementPageData(
  memberId: string
): Promise<MemberStatementPageData> {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()

  if (!context.tenant || runtime.status !== "database-configured") {
    return { state: "unavailable" }
  }

  if (!hasAnyRole(context.auth.membership?.role, allStaffRoles)) {
    return { state: "forbidden" }
  }

  const detail = await getMemberStatementDetail(context.tenant.id, memberId)

  if (!detail) {
    return { state: "not-found" }
  }

  return {
    detail,
    state: "ready",
  }
}
