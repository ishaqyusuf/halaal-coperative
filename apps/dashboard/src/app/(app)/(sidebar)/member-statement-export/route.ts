import { getOwnMemberStatementView } from "@halaalvest/db"
import { createMemberStatementTextResponse } from "@/lib/members/statement-export"
import { getDashboardServerContext } from "@/lib/server-context"

export async function GET() {
  const serverContext = await getDashboardServerContext()

  if (
    !serverContext.tenant ||
    !serverContext.auth.user ||
    serverContext.auth.membership?.role !== "member"
  ) {
    return new Response("Unauthorized", { status: 403 })
  }

  const detail = await getOwnMemberStatementView({
    tenantId: serverContext.tenant.id,
    userId: serverContext.auth.user.id,
  })

  if (!detail) {
    return new Response("Member profile not found", { status: 404 })
  }

  return createMemberStatementTextResponse(detail, serverContext.tenant.name)
}
