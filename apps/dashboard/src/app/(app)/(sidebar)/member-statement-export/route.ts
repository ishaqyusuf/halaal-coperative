import { getMemberByUserId, getMemberStatementDetail } from "@halaalvest/db"
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

  const member = await getMemberByUserId({
    tenantId: serverContext.tenant.id,
    userId: serverContext.auth.user.id,
  })

  if (!member) {
    return new Response("Member profile not found", { status: 404 })
  }

  const detail = await getMemberStatementDetail(
    serverContext.tenant.id,
    member.id
  )

  if (!detail) {
    return new Response("Statement not found", { status: 404 })
  }

  return createMemberStatementTextResponse(detail)
}
