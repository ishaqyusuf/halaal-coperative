import type { getMemberStatementDetail } from "@halaalvest/db"

type MemberStatementDetail = NonNullable<
  Awaited<ReturnType<typeof getMemberStatementDetail>>
>

function formatIsoDate(value: Date) {
  return value.toISOString().slice(0, 10)
}

function formatChargeSource(
  charge: MemberStatementDetail["chargeApplications"][number]
) {
  if (charge.procurementRequest) {
    return `Procurement: ${charge.procurementRequest.itemName}`
  }

  if (charge.foodPurchaseApplication) {
    return "Foodstuff Purchase"
  }

  if (charge.projectFinancingRequest) {
    return `Project financing: ${charge.projectFinancingRequest.businessName}`
  }

  if (charge.loanRequest) {
    return "Financing request"
  }

  return (
    charge.chargeApplicability?.workflow?.replace(/_/g, " ") ?? "Manual charge"
  )
}

export function buildMemberStatementText(detail: MemberStatementDetail) {
  const lines = [
    `Member Statement`,
    ``,
    `Name: ${detail.member.fullName}`,
    `Member Number: ${detail.member.memberNumber}`,
    `Type: ${detail.member.memberType}`,
    `Status: ${detail.member.status}`,
    `Joined: ${formatIsoDate(detail.member.joinedAt)}`,
    `Email: ${detail.member.email ?? detail.member.user?.email ?? "n/a"}`,
    ``,
    `Summary`,
    `Active Commitment: ${detail.summary?.activeCommitmentAmount ?? 0}`,
    `Savings Snapshot: ${detail.summary?.totalSavingsSnapshot ?? 0}`,
    `Outstanding Principal: ${detail.summary?.totalOutstandingPrincipal ?? 0}`,
    `Repayments Posted: ${detail.summary?.totalRepaymentsPosted ?? 0}`,
    `Published Dividends: ${detail.summary?.totalDividendAllocations ?? 0}`,
    ``,
    `Recent Contributions`,
    ...detail.contributions
      .slice(0, 10)
      .map(
        (contribution) =>
          `${formatIsoDate(contribution.postedAt)} | ${
            contribution.periodLabel ?? "unlabeled"
          } | amount=${Number(contribution.amount)} committed=${Number(
            contribution.committedAmount ?? 0
          )} extraSavings=${Number(contribution.extraSavingsAmount ?? 0)}`
      ),
    ``,
    `Recent Repayments`,
    ...detail.repayments
      .slice(0, 10)
      .map(
        (repayment) =>
          `${formatIsoDate(repayment.paidAt)} | ${
            repayment.loan.loanProduct.name
          } | amount=${Number(repayment.amount)} status=${repayment.status}`
      ),
    ``,
    `Recent Charges`,
    ...detail.chargeApplications
      .slice(0, 10)
      .map(
        (charge: any) =>
          `${formatIsoDate(charge.assessedAt)} | ${
            charge.chargeDefinition.name
          } | amount=${Number(charge.amount)} status=${
            charge.status
          } collection=${charge.collectionMode} source=${formatChargeSource(
            charge
          )}`
      ),
    ``,
    `Published Dividends`,
    ...detail.dividendAllocations
      .slice(0, 10)
      .map(
        (allocation) =>
          `${formatIsoDate(allocation.dividendPeriod.periodEnd)} | ${
            allocation.dividendPeriod.name
          } | allocation=${Number(allocation.allocationAmount)} basis=${Number(
            allocation.savingsBasisAmount
          )} distributable=${Number(
            allocation.dividendPeriod.distributableAmount
          )}`
      ),
  ]

  return lines.join("\n")
}

export function createMemberStatementTextResponse(
  detail: MemberStatementDetail
) {
  return new Response(buildMemberStatementText(detail), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${detail.member.memberNumber}-statement.txt"`,
      "Content-Type": "text/plain; charset=utf-8",
    },
  })
}
