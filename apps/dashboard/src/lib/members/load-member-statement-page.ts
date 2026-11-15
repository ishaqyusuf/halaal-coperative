import { createDbRuntime, getMemberStatementView } from "@halaalvest/db"
import { getDashboardServerContext } from "@/lib/server-context"
import { allStaffRoles, hasAnyRole } from "@/lib/workspace-access"

type MemberStatementDetail = NonNullable<
  Awaited<ReturnType<typeof getMemberStatementView>>
>

export type MemberStatementPageData =
  | { state: "forbidden" }
  | { state: "not-found" }
  | { state: "unavailable" }
  | {
      cooperativeName: string
      detail: MemberStatementDetail
      state: "ready"
    }

export async function loadMemberStatementPageData(
  memberId: string,
  postingsPage = 1
): Promise<MemberStatementPageData> {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()

  if (!context.tenant || runtime.status !== "database-configured") {
    return { state: "unavailable" }
  }

  if (!hasAnyRole(context.auth.membership?.role, allStaffRoles)) {
    return { state: "forbidden" }
  }

  const detail = await getMemberStatementView(
    context.tenant.id,
    memberId,
    undefined,
    { page: postingsPage }
  )

  if (!detail) {
    return { state: "not-found" }
  }

  return {
    cooperativeName: context.tenant.name,
    detail,
    state: "ready",
  }
}
