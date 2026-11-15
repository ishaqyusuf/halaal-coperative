import { getMemberStatementView } from "@halaalvest/db"
import { createMemberStatementTextResponse } from "@/lib/members/statement-export"
import { getDashboardServerContext } from "@/lib/server-context"
import { hasAnyRole, allStaffRoles } from "@/lib/workspace-access"

export async function GET(
  _request: Request,
  context: { params: Promise<{ memberId: string }> }
) {
  const { memberId } = await context.params
  const serverContext = await getDashboardServerContext()

  if (
    !serverContext.tenant ||
    !hasAnyRole(serverContext.auth.membership?.role, allStaffRoles)
  ) {
    return new Response("Unauthorized", { status: 403 })
  }

  const detail = await getMemberStatementView(
    serverContext.tenant.id,
    memberId,
    undefined,
    { allPostings: true }
  )

  if (!detail) {
    return new Response("Not found", { status: 404 })
  }

  return createMemberStatementTextResponse(detail, serverContext.tenant.name)
}
