import { getMemberStatementDetail } from "@halaalvest/db"
import { getDashboardServerContext } from "@/lib/server-context"
import { hasAnyRole, allStaffRoles } from "@/lib/workspace-access"

function textResponse(filename: string, body: string) {
  return new Response(body, {
    headers: {
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  })
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ memberId: string }> },
) {
  const { memberId } = await context.params
  const serverContext = await getDashboardServerContext()

  if (!serverContext.tenant || !hasAnyRole(serverContext.auth.membership?.role, allStaffRoles)) {
    return new Response("Unauthorized", { status: 403 })
  }

  const detail = await getMemberStatementDetail(serverContext.tenant.id, memberId)

  if (!detail) {
    return new Response("Not found", { status: 404 })
  }

  const lines = [
    `Member Statement`,
    ``,
    `Name: ${detail.member.fullName}`,
    `Member Number: ${detail.member.memberNumber}`,
    `Type: ${detail.member.memberType}`,
    `Status: ${detail.member.status}`,
    `Joined: ${detail.member.joinedAt.toISOString().slice(0, 10)}`,
    `Email: ${detail.member.user?.email ?? "n/a"}`,
    ``,
    `Summary`,
    `Active Commitment: ${detail.summary?.activeCommitmentAmount ?? 0}`,
    `Savings Snapshot: ${detail.summary?.totalSavingsSnapshot ?? 0}`,
    `Outstanding Principal: ${detail.summary?.totalOutstandingPrincipal ?? 0}`,
    `Repayments Posted: ${detail.summary?.totalRepaymentsPosted ?? 0}`,
    ``,
    `Recent Contributions`,
    ...detail.contributions.slice(0, 10).map((contribution) =>
      `${contribution.postedAt.toISOString().slice(0, 10)} | ${contribution.periodLabel ?? "unlabeled"} | amount=${Number(contribution.amount)} committed=${Number(contribution.committedAmount ?? 0)} extraSavings=${Number(contribution.extraSavingsAmount ?? 0)}`,
    ),
    ``,
    `Recent Repayments`,
    ...detail.repayments.slice(0, 10).map((repayment) =>
      `${repayment.paidAt.toISOString().slice(0, 10)} | ${repayment.loan.loanProduct.name} | amount=${Number(repayment.amount)} status=${repayment.status}`,
    ),
  ]

  return textResponse(`${detail.member.memberNumber}-statement.txt`, lines.join("\n"))
}
